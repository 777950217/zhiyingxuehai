import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

/** GET /api/kpi-schemes - 获取当前公司的方案列表 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) return unauthorizedResponse();

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('kpi_schemes')
      .select('*')
      .eq('company_id', auth.companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[API] GET /kpi-schemes error:', err);
    return NextResponse.json({ error: '获取KPI方案列表失败', detail: err?.message || String(err) }, { status: 500 });
  }
}

/** POST /api/kpi-schemes - 创建新方案 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) return unauthorizedResponse();

    // 仅管理员/企业管理员/专业版可创建方案
    const allowedRoles = ['admin', 'enterprise_admin', 'enterprise_manager', 'efficiency_user'];
    if (!allowedRoles.includes(auth.role)) {
      return forbiddenResponse('仅管理员可创建KPI考核方案');
    }

    const supabase = getSupabaseClient();
    const body = await request.json();

    // 校验必填字段
    if (!body.name) {
      return NextResponse.json({ error: '方案名称不能为空' }, { status: 400 });
    }

    // 构建方案数据
    const scheme = {
      company_id: auth.companyId,
      name: body.name,
      positions: body.positions || [],
      cycle: body.cycle || 'monthly',
      scoring_system: body.scoring_system || 'percentage',
      selected_dimension_ids: body.selected_dimension_ids || [],
      dimension_weights: body.dimension_weights || {},
      fault_tolerance: body.fault_tolerance || {},
      custom_dimensions: body.custom_dimensions || [],
      custom_indicators: body.custom_indicators || [],
      ai_evaluation: body.ai_evaluation || null,
      status: 'draft',
      effective_period: body.effective_period || null,
    };

    const { data, error } = await supabase
      .from('kpi_schemes')
      .insert(scheme)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[API] POST /kpi-schemes error:', err);
    return NextResponse.json({ error: '创建KPI方案失败', detail: err?.message || String(err) }, { status: 500 });
  }
}
