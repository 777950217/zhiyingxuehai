import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';
import { logAction, AuditAction, ResourceType, getClientIp } from '@/lib/audit-log';

/**
 * GET /api/admin/backup — Export table data as JSON (admin/super_admin only)
 * Query params: tables (comma-separated list), company_id
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin' && auth.role !== 'super_admin') {
    return forbiddenResponse('仅管理员可导出数据备份');
  }

  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const tablesParam = searchParams.get('tables') || '';
    const companyId = searchParams.get('company_id') || auth.companyId;

    const ALL_TABLES = [
      'users',
      'phrase_library',
      'quality_feedbacks',
      'product_profiles',
      'cost_records',
      'schedules',
      'audit_logs',
    ];

    const tables = tablesParam
      ? tablesParam.split(',').map(t => t.trim()).filter(t => ALL_TABLES.includes(t))
      : ALL_TABLES;

    if (tables.length === 0) {
      return NextResponse.json({ error: '未指定有效的数据表' }, { status: 400 });
    }

    const backup: Record<string, unknown[]> = {};
    const errors: string[] = [];

    for (const table of tables) {
      try {
        let query = supabase.from(table).select('*');

        // Filter by company_id for company-scoped tables
        if (['users', 'phrase_library', 'quality_feedbacks', 'product_profiles', 'cost_records', 'schedules'].includes(table)) {
          query = query.eq('company_id', companyId);
        }

        const { data, error } = await query;
        if (error) {
          errors.push(`${table}: ${error.message}`);
          backup[table] = [];
        } else {
          backup[table] = data || [];
        }
      } catch (tableErr) {
        errors.push(`${table}: ${tableErr instanceof Error ? tableErr.message : '未知错误'}`);
        backup[table] = [];
      }
    }

    await logAction({
      userId: auth.userId,
      companyId,
      action: AuditAction.EXPORT,
      resourceType: ResourceType.BACKUP,
      detail: { tables, recordCounts: Object.fromEntries(Object.entries(backup).map(([k, v]) => [k, v.length])) },
      ipAddress: getClientIp(request),
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup_${timestamp}.json"`,
      },
    });
  } catch (err) {
    console.error('[backup] GET error:', err);
    return NextResponse.json({ error: '数据备份导出失败' }, { status: 500 });
  }
}
