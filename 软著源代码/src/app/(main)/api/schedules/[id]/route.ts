import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';
import { logAction, AuditAction, ResourceType, getClientIp } from '@/lib/audit-log';

/**
 * PATCH /api/schedules/[id] — Update a schedule entry
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();
  if (!['enterprise_manager', 'enterprise_admin', 'admin', 'super_admin'].includes(auth.role)) {
    return forbiddenResponse('无权修改排班');
  }

  try {
    const { id } = await params;
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { shift_name, shift_date, start_time, end_time, status, notes } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (shift_name !== undefined) updates.shift_name = shift_name;
    if (shift_date !== undefined) updates.shift_date = shift_date;
    if (start_time !== undefined) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from('schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAction({
      userId: auth.userId,
      companyId: auth.companyId,
      action: AuditAction.UPDATE,
      resourceType: ResourceType.SCHEDULE,
      resourceId: id,
      detail: updates,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[schedules] PATCH error:', err);
    return NextResponse.json({ error: '修改排班失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/schedules/[id] — Delete a schedule entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();
  if (!['enterprise_manager', 'enterprise_admin', 'admin', 'super_admin'].includes(auth.role)) {
    return forbiddenResponse('无权删除排班');
  }

  try {
    const { id } = await params;
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAction({
      userId: auth.userId,
      companyId: auth.companyId,
      action: AuditAction.DELETE,
      resourceType: ResourceType.SCHEDULE,
      resourceId: id,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[schedules] DELETE error:', err);
    return NextResponse.json({ error: '删除排班失败' }, { status: 500 });
  }
}
