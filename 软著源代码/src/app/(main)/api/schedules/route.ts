import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';
import { logAction, AuditAction, ResourceType, getClientIp } from '@/lib/audit-log';

/**
 * GET /api/schedules — List schedules with date range filter
 * Query params: company_id, start_date, end_date, user_id
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id') || auth.companyId;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const userId = searchParams.get('user_id');

    let query = supabase
      .from('schedules')
      .select('*')
      .eq('company_id', companyId)
      .order('shift_date', { ascending: true });

    if (startDate) query = query.gte('shift_date', startDate);
    if (endDate) query = query.lte('shift_date', endDate);
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('[schedules] GET error:', err);
    return NextResponse.json({ error: '查询排班失败' }, { status: 500 });
  }
}

/**
 * POST /api/schedules — Create a schedule entry
 * Body: { company_id, user_id, shift_name, shift_date, start_time, end_time, status?, notes? }
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();
  if (!['enterprise_manager', 'enterprise_admin', 'admin', 'super_admin'].includes(auth.role)) {
    return forbiddenResponse('无权创建排班');
  }

  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { user_id, shift_name, shift_date, start_time, end_time, status, notes } = body;
    const companyId = body.company_id || auth.companyId;

    if (!user_id || !shift_name || !shift_date || !start_time || !end_time) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // Conflict check: same user + same date
    const { data: existing } = await supabase
      .from('schedules')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', user_id)
      .eq('shift_date', shift_date)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: '该员工当天已有排班，请先删除再重新安排' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('schedules')
      .insert({
        company_id: companyId,
        user_id,
        shift_name,
        shift_date,
        start_time,
        end_time,
        status: status || 'draft',
        notes: notes || null,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (error) throw error;

    await logAction({
      userId: auth.userId,
      companyId,
      action: AuditAction.CREATE,
      resourceType: ResourceType.SCHEDULE,
      resourceId: data.id,
      detail: { shift_name, shift_date, start_time, end_time, user_id },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[schedules] POST error:', err);
    return NextResponse.json({ error: '创建排班失败' }, { status: 500 });
  }
}
