import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/kpi-schemes/[id] - 获取单个方案详情 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) return unauthorizedResponse();

    const { id } = await context.params;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('kpi_schemes')
      .select('*')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: '方案不存在' }, { status: 404 });

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[API] GET /kpi-schemes/[id] error:', err);
    return NextResponse.json({ error: '获取KPI方案详情失败', detail: err?.message || String(err) }, { status: 500 });
  }
}

/** PUT /api/kpi-schemes/[id] - 更新方案内容 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) return unauthorizedResponse();

    const allowedRoles = ['admin', 'enterprise_admin', 'enterprise_manager', 'efficiency_user'];
    if (!allowedRoles.includes(auth.role)) {
      return forbiddenResponse('仅管理员可编辑KPI考核方案');
    }

    const { id } = await context.params;
    const supabase = getSupabaseClient();
    const body = await request.json();

    // 更新字段白名单
    const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const allowedFields = [
      'name', 'positions', 'cycle', 'scoring_system',
      'selected_dimension_ids', 'dimension_weights', 'fault_tolerance',
      'custom_dimensions', 'custom_indicators', 'ai_evaluation', 'effective_period',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from('kpi_schemes')
      .update(updateFields)
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: '方案不存在或无权修改' }, { status: 404 });

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[API] PUT /kpi-schemes/[id] error:', err);
    return NextResponse.json({ error: '更新KPI方案失败', detail: err?.message || String(err) }, { status: 500 });
  }
}

/** PATCH /api/kpi-schemes/[id] - 更新方案状态 (draft→published→archived) */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) return unauthorizedResponse();

    const allowedRoles = ['admin', 'enterprise_admin', 'enterprise_manager'];
    if (!allowedRoles.includes(auth.role)) {
      return forbiddenResponse('仅管理员可变更方案状态');
    }

    const { id } = await context.params;
    const supabase = getSupabaseClient();
    const body = await request.json();

    // 校验状态流转合法性
    const validStatuses = ['draft', 'published', 'archived'];
    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: '无效的状态值，可选: draft/published/archived' }, { status: 400 });
    }

    // 查询当前状态
    const { data: current, error: fetchError } = await supabase
      .from('kpi_schemes')
      .select('status')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: '方案不存在' }, { status: 404 });
    }

    // 状态流转校验：draft→published→archived，不允许回退
    const transitions: Record<string, string[]> = {
      draft: ['published'],
      published: ['archived'],
      archived: [],
    };
    const allowedNext = transitions[current.status] || [];
    if (!allowedNext.includes(body.status)) {
      return NextResponse.json(
        { error: `方案状态不可从"${current.status}"变更为"${body.status}"` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('kpi_schemes')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[API] PATCH /kpi-schemes/[id] error:', err);
    return NextResponse.json({ error: '更新方案状态失败', detail: err?.message || String(err) }, { status: 500 });
  }
}
