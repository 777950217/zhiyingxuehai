import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';
import { logAction, AuditAction, ResourceType, getClientIp } from '@/lib/audit-log';

// GET /api/quality-feedbacks - 获取反馈列表
export async function GET(req: NextRequest) {
  try {
    const sb = getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    const role = searchParams.get('role'); // 'manager' or 'staff'
    const status = searchParams.get('status');
    const companyId = searchParams.get('company_id');

    if (!userId) {
      return NextResponse.json({ error: '缺少user_id参数' }, { status: 400 });
    }

    let query = sb.from('quality_feedbacks').select('*');

    if (role === 'manager') {
      // 主管看自己发出的
      query = query.eq('from_user_id', userId);
    } else {
      // 员工看发给自己的
      query = query.eq('to_user_id', userId);
    }

    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取反馈列表失败';
    console.error('[API] GET /quality-feedbacks error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/quality-feedbacks - 创建反馈
export async function POST(req: NextRequest) {
  try {
    const sb = getSupabaseClient();
    const body = await req.json();
    const { company_id, from_user_id, to_user_id, quality_check_id, issue_type, issue_description, suggestion } = body;

    if (!from_user_id || !to_user_id || !issue_type) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const { data, error } = await sb
      .from('quality_feedbacks')
      .insert({
        company_id,
        from_user_id,
        to_user_id,
        quality_check_id: quality_check_id || null,
        issue_type,
        issue_description: issue_description || null,
        suggestion: suggestion || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await logAction({
      userId: from_user_id,
      companyId: company_id,
      action: AuditAction.PUSH_FEEDBACK,
      resourceType: ResourceType.QUALITY_FEEDBACK,
      resourceId: data.id,
      detail: { to_user_id, issue_type },
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '创建反馈失败';
    console.error('[API] POST /quality-feedbacks error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
