import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    if (!companyId) {
      return NextResponse.json({ error: '缺少company_id' }, { status: 400 });
    }

    const supabase = await getSupabaseClient();

    // ── 本周日期范围 ──
    const now = new Date();
    const dayOfWeek = now.getDay() || 7; // 周日=7
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    monday.setHours(0, 0, 0, 0);
    const weekStart = monday.toISOString().slice(0, 10);
    const weekEnd = now.toISOString().slice(0, 10);

    // ── 上周日期范围 ──
    const lastMonday = new Date(monday);
    lastMonday.setDate(monday.getDate() - 7);
    const lastWeekStart = lastMonday.toISOString().slice(0, 10);
    const lastWeekEnd = weekStart;

    // ── 1. 本周赔付 ──
    const { data: thisWeekCosts } = await supabase
      .from('cost_records')
      .select('amount')
      .eq('company_id', companyId)
      .gte('record_date', weekStart)
      .lt('record_date', weekEnd + 'T23:59:59');

    const { data: lastWeekCosts } = await supabase
      .from('cost_records')
      .select('amount')
      .eq('company_id', companyId)
      .gte('record_date', lastWeekStart)
      .lt('record_date', lastWeekEnd);

    const thisWeekLoss = (thisWeekCosts || []).reduce((s: number, r: { amount: number }) => s + (Number(r.amount) || 0), 0);
    const lastWeekLoss = (lastWeekCosts || []).reduce((s: number, r: { amount: number }) => s + (Number(r.amount) || 0), 0);
    const lossChange = lastWeekLoss > 0 ? parseFloat(((thisWeekLoss - lastWeekLoss) / lastWeekLoss * 100).toFixed(1)) : 0;

    // ── 2. 团队KPI达标率 ──
    const { data: thisWeekKpi } = await supabase
      .from('kpi_records')
      .select('actual_value, target_value')
      .eq('company_id', companyId)
      .gte('period', weekStart);

    const { data: lastWeekKpi } = await supabase
      .from('kpi_records')
      .select('actual_value, target_value')
      .eq('company_id', companyId)
      .gte('period', lastWeekStart)
      .lt('period', weekStart);

    const calcKpiRate = (recs: { actual_value: number; target_value: number }[] | null) => {
      if (!recs || recs.length === 0) return 0;
      return Math.round(recs.reduce((s: number, r: { actual_value: number; target_value: number }) => {
        const actual = Number(r.actual_value) || 0;
        const target = Number(r.target_value) || 1;
        return s + Math.min(actual / target, 1.5);
      }, 0) / recs.length * 100);
    };
    const thisWeekKpiRate = calcKpiRate(thisWeekKpi);
    const lastWeekKpiRate = calcKpiRate(lastWeekKpi);
    const kpiChange = thisWeekKpiRate - lastWeekKpiRate;

    // ── 3. AI替你省了 ──
    const { data: companyData } = await supabase
      .from('companies')
      .select('ai_credits_remaining')
      .eq('id', companyId)
      .maybeSingle();

    const aiCreditsUsed = companyData ? Math.max(0, 100 - (companyData.ai_credits_remaining || 0)) : 0;
    const aiSavingMinutes = aiCreditsUsed * 3;
    const aiSavingHours = Math.round(aiSavingMinutes / 60 * 10) / 10;

    // ── 4. 异常赔付 ──
    // 查找超权赔付（金额>500且无审批记录的）
    const { data: highCosts } = await supabase
      .from('cost_records')
      .select('id, amount, category, record_date')
      .eq('company_id', companyId)
      .gte('record_date', weekStart)
      .gte('amount', '500');

    // 查找审批记录
    const highCostIds = (highCosts || []).map((r: { id: string }) => r.id);
    let approvedIds: string[] = [];
    if (highCostIds.length > 0) {
      const { data: approvals } = await supabase
        .from('approval_flows')
        .select('record_id')
        .in('record_id', highCostIds)
        .eq('status', 'approved');
      approvedIds = (approvals || []).map((r: { record_id: string }) => r.record_id);
    }

    const anomalies = (highCosts || []).filter((r: { id: string }) => !approvedIds.includes(r.id));
    const hasAnomaly = anomalies.length > 0;
    const anomalyDetail = anomalies.map((r: { amount: number; category: string; record_date: string }) => ({
      amount: Number(r.amount),
      category: r.category,
      date: r.record_date,
    }));

    // ── 底部：本周节省金额 ──
    const hourlyRate = 25; // 默认客服时薪25元/小时
    const lossSaved = lastWeekLoss > thisWeekLoss ? lastWeekLoss - thisWeekLoss : 0;
    const totalSaved = Math.round(aiSavingHours * hourlyRate + lossSaved);

    return NextResponse.json({
      data: {
        weekStart,
        weekEnd,
        loss: { value: thisWeekLoss, change: lossChange },
        kpi: { value: thisWeekKpiRate, change: kpiChange },
        ai: { hours: aiSavingHours, creditsUsed: aiCreditsUsed },
        anomaly: { hasAnomaly, count: anomalies.length, details: anomalyDetail },
        totalSaved,
        hourlyRate,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[boss-weekly GET] Error:', message);
    return NextResponse.json({ error: `获取周看板失败: ${message}` }, { status: 500 });
  }
}
