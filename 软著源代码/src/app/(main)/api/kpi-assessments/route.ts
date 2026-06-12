import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

/** GET /api/kpi-assessments - 查询考核记录，支持筛选 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) return unauthorizedResponse();

    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');
    const period = searchParams.get('period');
    const schemeId = searchParams.get('scheme_id');

    let query = supabase
      .from('kpi_assessments')
      .select('*, agents(id, name, employee_id, position)')
      .eq('company_id', auth.companyId)
      .order('created_at', { ascending: false });

    if (agentId) query = query.eq('agent_id', agentId);
    if (period) query = query.eq('period', period);
    if (schemeId) query = query.eq('scheme_id', schemeId);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] GET /kpi-assessments error:', err);
    return NextResponse.json({ error: '获取考核记录失败' }, { status: 500 });
  }
}

/** POST /api/kpi-assessments - 批量创建考核记录 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) return unauthorizedResponse();

    const allowedRoles = ['admin', 'enterprise_admin', 'enterprise_manager', 'efficiency_user'];
    if (!allowedRoles.includes(auth.role)) {
      return forbiddenResponse('仅管理员可发起考核');
    }

    const supabase = getSupabaseClient();
    const body = await request.json();

    // body.records: 批量创建的记录数组，每条包含 scheme_id, agent_id, period
    if (!body.records || !Array.isArray(body.records) || body.records.length === 0) {
      return NextResponse.json({ error: '请提供考核记录列表' }, { status: 400 });
    }

    // 构建插入数据，company_id 从 auth 获取
    const records = body.records.map((r: { scheme_id: string; agent_id: string; period: string }) => ({
      company_id: auth.companyId,
      scheme_id: r.scheme_id,
      agent_id: r.agent_id,
      period: r.period,
      status: 'draft',
    }));

    const { data, error } = await supabase
      .from('kpi_assessments')
      .insert(records)
      .select();

    if (error) throw error;

    // 为每条考核记录创建明细行（从方案中提取指标）
    if (data && data.length > 0 && body.scheme_id) {
      // 获取方案详情以提取指标
      const { data: scheme } = await supabase
        .from('kpi_schemes')
        .select('dimension_weights, selected_dimension_ids')
        .eq('id', body.scheme_id)
        .single();

      if (scheme) {
        // 从 kpi-templates 获取指标列表，为每条记录创建明细
        // 这里先创建空明细占位，后续录入时填充
        const details: Array<{
          assessment_id: string;
          dimension_id: string;
          indicator_id: string;
          indicator_name: string;
          target_value: string;
        }> = [];

        // 如果 body 中携带了 indicators 映射，则自动创建明细
        if (body.indicators && Array.isArray(body.indicators)) {
          for (const assessment of data) {
            for (const ind of body.indicators) {
              details.push({
                assessment_id: assessment.id,
                dimension_id: ind.dimension_id || '',
                indicator_id: ind.indicator_id || '',
                indicator_name: ind.indicator_name || '',
                target_value: ind.target_value || '',
              });
            }
          }

          if (details.length > 0) {
            await supabase.from('kpi_assessment_details').insert(details);
          }
        }
      }
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] POST /kpi-assessments error:', err);
    return NextResponse.json({ error: '创建考核记录失败' }, { status: 500 });
  }
}
