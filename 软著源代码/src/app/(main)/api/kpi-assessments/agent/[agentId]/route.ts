import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/api-auth';

interface RouteContext {
  params: Promise<{ agentId: string }>;
}

/** GET /api/kpi-assessments/agent/[agentId] - 查询员工考核历史 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) return unauthorizedResponse();

    const { agentId } = await context.params;
    const supabase = getSupabaseClient();

    // 查询该员工的考核记录，按周期降序
    const { data, error } = await supabase
      .from('kpi_assessments')
      .select('*, kpi_schemes(id, name, cycle, scoring_system, status)')
      .eq('company_id', auth.companyId)
      .eq('agent_id', agentId)
      .order('period', { ascending: false });

    if (error) throw error;

    // 为每条记录附带明细
    const results = await Promise.all(
      (data || []).map(async (assessment: Record<string, unknown>) => {
        const { data: details } = await supabase
          .from('kpi_assessment_details')
          .select('*')
          .eq('assessment_id', assessment.id as string)
          .order('created_at', { ascending: true });

        return { ...assessment, details: details || [] };
      })
    );

    return NextResponse.json({ data: results });
  } catch (err) {
    console.error('[API] GET /kpi-assessments/agent/[agentId] error:', err);
    return NextResponse.json({ error: '获取员工考核历史失败' }, { status: 500 });
  }
}
