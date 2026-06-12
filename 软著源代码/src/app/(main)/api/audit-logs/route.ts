import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

/**
 * GET /api/audit-logs — Query audit logs (admin/super_admin only)
 * Query params: user_id, action, resource_type, date_from, date_to, limit, offset
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin' && auth.role !== 'super_admin') {
    return forbiddenResponse('仅管理员可查看审计日志');
  }

  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resource_type');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) query = query.eq('user_id', userId);
    if (action) query = query.eq('action', action);
    if (resourceType) query = query.eq('resource_type', resourceType);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data || [], total: count || 0, limit, offset });
  } catch (err) {
    console.error('[audit-logs] GET error:', err);
    return NextResponse.json({ error: '查询审计日志失败' }, { status: 500 });
  }
}

/**
 * POST /api/audit-logs — Write audit log (system internal)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { user_id, company_id, action, resource_type, resource_id, detail, ip_address } = body;

    if (!user_id || !action || !resource_type) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id,
        company_id: company_id || null,
        action,
        resource_type,
        resource_id: resource_id || null,
        detail: detail || {},
        ip_address: ip_address || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[audit-logs] POST error:', err);
    return NextResponse.json({ error: '写入审计日志失败' }, { status: 500 });
  }
}
