import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/kpi-assessments/[id] - 获取单条考核记录（含明细） */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) return unauthorizedResponse();

    const { id } = await context.params;
    const supabase = getSupabaseClient();

    // 获取考核记录
    const { data: assessment, error: assessmentError } = await supabase
      .from('kpi_assessments')
      .select('*, agents(id, name, employee_id, position)')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .single();

    if (assessmentError) throw assessmentError;
    if (!assessment) return NextResponse.json({ error: '考核记录不存在' }, { status: 404 });

    // 获取明细
    const { data: details, error: detailsError } = await supabase
      .from('kpi_assessment_details')
      .select('*')
      .eq('assessment_id', id)
      .order('created_at', { ascending: true });

    if (detailsError) throw detailsError;

    return NextResponse.json({ data: { ...assessment, details: details || [] } });
  } catch (err) {
    console.error('[API] GET /kpi-assessments/[id] error:', err);
    return NextResponse.json({ error: '获取考核记录详情失败' }, { status: 500 });
  }
}

/** PUT /api/kpi-assessments/[id] - 更新考核记录（录入实际值、计算得分、确认发布） */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) return unauthorizedResponse();

    const allowedRoles = ['admin', 'enterprise_admin', 'enterprise_manager', 'efficiency_user'];
    if (!allowedRoles.includes(auth.role)) {
      return forbiddenResponse('仅管理员可更新考核记录');
    }

    const { id } = await context.params;
    const supabase = getSupabaseClient();
    const body = await request.json();

    // 更新考核记录主表
    const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.total_score !== undefined) updateFields.total_score = body.total_score;
    if (body.total_deduction !== undefined) updateFields.total_deduction = body.total_deduction;
    if (body.total_bonus !== undefined) updateFields.total_bonus = body.total_bonus;
    if (body.salary_effect !== undefined) updateFields.salary_effect = body.salary_effect;
    if (body.hr_action !== undefined) updateFields.hr_action = body.hr_action;
    if (body.status !== undefined) updateFields.status = body.status;

    const { data: assessment, error: updateError } = await supabase
      .from('kpi_assessments')
      .update(updateFields)
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .select()
      .single();

    if (updateError) throw updateError;
    if (!assessment) return NextResponse.json({ error: '考核记录不存在或无权修改' }, { status: 404 });

    // 如果携带明细更新，逐条更新
    if (body.details && Array.isArray(body.details)) {
      for (const detail of body.details) {
        if (!detail.id) continue;

        const detailUpdate: Record<string, unknown> = {};
        if (detail.actual_value !== undefined) detailUpdate.actual_value = detail.actual_value;
        if (detail.is_achieved !== undefined) detailUpdate.is_achieved = detail.is_achieved;
        if (detail.score_change !== undefined) detailUpdate.score_change = detail.score_change;
        if (detail.fault_tolerance_used !== undefined) detailUpdate.fault_tolerance_used = detail.fault_tolerance_used;
        if (detail.fault_tolerance_reason !== undefined) detailUpdate.fault_tolerance_reason = detail.fault_tolerance_reason;

        if (Object.keys(detailUpdate).length > 0) {
          await supabase
            .from('kpi_assessment_details')
            .update(detailUpdate)
            .eq('id', detail.id)
            .eq('assessment_id', id);
        }
      }
    }

    // 返回更新后的完整记录
    const { data: details } = await supabase
      .from('kpi_assessment_details')
      .select('*')
      .eq('assessment_id', id);

    return NextResponse.json({ data: { ...assessment, details: details || [] } });
  } catch (err) {
    console.error('[API] PUT /kpi-assessments/[id] error:', err);
    return NextResponse.json({ error: '更新考核记录失败' }, { status: 500 });
  }
}
