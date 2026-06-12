import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';
import { logAction, AuditAction, ResourceType, getClientIp } from '@/lib/audit-log';

// PATCH /api/quality-feedbacks/[id] - 确认/解决反馈
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sb = getSupabaseClient();
    const { id } = await params;
    const body = await req.json();
    const { action, user_id, company_id } = body;

    if (!user_id || !action) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 先验证这条反馈确实是发给该员工的
    const { data: existing, error: fetchErr } = await sb
      .from('quality_feedbacks')
      .select('*')
      .eq('id', id)
      .eq('to_user_id', user_id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: '反馈记录不存在或无权操作' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {};
    let auditAction: AuditAction;

    if (action === 'confirm') {
      updates.status = 'confirmed';
      updates.confirmed_at = now;
      auditAction = AuditAction.CONFIRM_FEEDBACK;
    } else if (action === 'resolve') {
      updates.status = 'resolved';
      updates.resolved_at = now;
      auditAction = AuditAction.RESOLVE_FEEDBACK;
    } else {
      return NextResponse.json({ error: '无效操作，支持: confirm/resolve' }, { status: 400 });
    }

    const { data, error } = await sb
      .from('quality_feedbacks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await logAction({
      userId: user_id,
      companyId: company_id || existing.company_id,
      action: auditAction,
      resourceType: ResourceType.QUALITY_FEEDBACK,
      resourceId: id,
      detail: { action, previous_status: existing.status, new_status: updates.status },
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '更新反馈失败';
    console.error('[API] PATCH /quality-feedbacks/[id] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
