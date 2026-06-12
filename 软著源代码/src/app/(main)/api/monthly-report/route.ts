import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const month = searchParams.get('month'); // format: YYYY-MM
    const role = searchParams.get('role') || '';
    const history = searchParams.get('history'); // history=1 查历史报告列表

    if (!companyId) {
      return NextResponse.json({ error: '缺少company_id' }, { status: 400 });
    }

    const allowedRoles = ['enterprise_manager', 'enterprise_admin', 'admin'];
    if (role && !allowedRoles.includes(role)) {
      return NextResponse.json({ error: '无权访问月度简报' }, { status: 403 });
    }

    const supabase = await getSupabaseClient();

    // ── 历史报告列表模式 ──
    if (history === '1') {
      const { data: reports, error } = await supabase
        .from('monthly_reports')
        .select('id, report_month, summary, created_at')
        .eq('company_id', companyId)
        .order('report_month', { ascending: false })
        .limit(12);

      if (error) {
        return NextResponse.json({ error: `获取历史报告失败: ${error.message}` }, { status: 500 });
      }
      return NextResponse.json({ reports: reports || [] });
    }

    const now = new Date();
    const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, mon] = targetMonth.split('-').map(Number);
    const monthStart = `${year}-${String(mon).padStart(2, '0')}-01`;
    const monthEnd = mon === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(mon + 1).padStart(2, '0')}-01`;

    const prevMon = mon === 1 ? 12 : mon - 1;
    const prevYear = mon === 1 ? year - 1 : year;
    const prevMonthStr = `${prevYear}-${String(prevMon).padStart(2, '0')}`;
    const prevMonthStart = `${prevYear}-${String(prevMon).padStart(2, '0')}-01`;
    const prevMonthEnd = monthStart;

    // ── 1. 赔付概况 ──
    const { data: currentCosts } = await supabase
      .from('cost_records')
      .select('amount, category, record_date')
      .eq('company_id', companyId)
      .gte('record_date', monthStart)
      .lt('record_date', monthEnd);

    const { data: prevCosts } = await supabase
      .from('cost_records')
      .select('amount, category, record_date')
      .eq('company_id', companyId)
      .gte('record_date', prevMonthStart)
      .lt('record_date', prevMonthEnd);

    const currentTotal = (currentCosts || []).reduce((s: number, r: { amount: number }) => s + (Number(r.amount) || 0), 0);
    const prevTotal = (prevCosts || []).reduce((s: number, r: { amount: number }) => s + (Number(r.amount) || 0), 0);
    const refundChange = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal * 100).toFixed(1) : '—';

    const canSeeRefundDetail = !role || role === 'admin' || role === 'enterprise_admin';
    const categoryMap: Record<string, number> = {};
    (currentCosts || []).forEach((r: { category: string; amount: number }) => {
      categoryMap[r.category || '其他'] = (categoryMap[r.category || '其他'] || 0) + (Number(r.amount) || 0);
    });
    const top3Categories = canSeeRefundDetail
      ? Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, amount]) => ({ name, amount }))
      : [];

    // ── 2. 团队效率 ──
    const { data: kpiRecs } = await supabase
      .from('kpi_records')
      .select('actual_value, target_value, metric_name')
      .eq('company_id', companyId)
      .gte('period', monthStart)
      .lt('period', monthEnd);

    const { data: prevKpiRecs } = await supabase
      .from('kpi_records')
      .select('actual_value, target_value')
      .eq('company_id', companyId)
      .gte('period', prevMonthStart)
      .lt('period', prevMonthEnd);

    const kpiRecords = kpiRecs || [];
    const prevKpiRecords = prevKpiRecs || [];
    const calcKpiRate = (recs: { actual_value: number; target_value: number }[]) =>
      recs.length > 0
        ? Math.round(recs.reduce((s: number, r: { actual_value: number; target_value: number }) => {
            const actual = Number(r.actual_value) || 0;
            const target = Number(r.target_value) || 1;
            return s + Math.min(actual / target, 1.5);
          }, 0) / recs.length * 100)
        : 0;

    const kpiAchieveRate = calcKpiRate(kpiRecords);
    const prevKpiAchieveRate = calcKpiRate(prevKpiRecords);
    const kpiChange = kpiAchieveRate - prevKpiAchieveRate;

    const { data: qualityRecs } = await supabase
      .from('quality_inspections')
      .select('total_score, agent_name')
      .eq('company_id', companyId)
      .gte('inspected_at', monthStart)
      .lt('inspected_at', monthEnd);

    const { data: prevQualityRecs } = await supabase
      .from('quality_inspections')
      .select('total_score')
      .eq('company_id', companyId)
      .gte('inspected_at', prevMonthStart)
      .lt('inspected_at', prevMonthEnd);

    const qualityRecords = qualityRecs || [];
    const prevQualityRecords = prevQualityRecs || [];
    const avgQualityScore = qualityRecords.length > 0
      ? Math.round(qualityRecords.reduce((s: number, r: { total_score: number }) => s + (Number(r.total_score) || 0), 0) / qualityRecords.length * 10) / 10
      : 0;
    const prevAvgQualityScore = prevQualityRecords.length > 0
      ? Math.round(prevQualityRecords.reduce((s: number, r: { total_score: number }) => s + (Number(r.total_score) || 0), 0) / prevQualityRecords.length * 10) / 10
      : 0;
    const qualityChange = parseFloat((avgQualityScore - prevAvgQualityScore).toFixed(1));

    const { data: workOrders } = await supabase
      .from('work_orders')
      .select('created_at, updated_at, status')
      .eq('company_id', companyId)
      .gte('created_at', monthStart)
      .lt('created_at', monthEnd);

    const completedOrders = (workOrders || []).filter((r: { status: string }) =>
      ['已完成', '已关闭'].includes(r.status)
    );
    const avgHandleHours = completedOrders.length > 0
      ? Math.round(completedOrders.reduce((s: number, r: { created_at: string; updated_at: string }) => {
          const created = new Date(r.created_at).getTime();
          const updated = new Date(r.updated_at).getTime();
          return s + (updated - created) / (1000 * 60 * 60);
        }, 0) / completedOrders.length * 10) / 10
      : 0;

    // ── 3. AI价值 ──
    const { data: companyData } = await supabase
      .from('companies')
      .select('ai_credits_remaining')
      .eq('id', companyId)
      .maybeSingle();

    const aiCreditsUsed = companyData ? Math.max(0, 100 - (companyData.ai_credits_remaining || 0)) : 0;
    const aiEstMinutes = aiCreditsUsed * 3;
    const aiEstHours = Math.round(aiEstMinutes / 60 * 10) / 10;

    // ── 4. 下月建议 ──
    const suggestions: string[] = [];
    if (currentTotal > prevTotal && prevTotal > 0) {
      if (canSeeRefundDetail && top3Categories[0]?.name) {
        suggestions.push(`本月赔付环比增长${refundChange}%，建议排查${top3Categories[0].name}类问题根因，制定针对性预防方案`);
      } else {
        suggestions.push(`本月赔付环比增长${refundChange}%，建议排查赔付问题根因，制定针对性预防方案`);
      }
    }
    if (kpiAchieveRate < 70 && kpiRecords.length > 0) {
      suggestions.push('KPI达成率低于70%，建议聚焦达成率最低的1-2个指标，调整目标值或提供针对性培训');
    }
    if (avgQualityScore < 75 && qualityRecords.length > 0) {
      suggestions.push('质检均分偏低，建议查看低分维度（态度/专业度/规范/效率/解决力），制定专项改进计划');
    }
    if (avgHandleHours > 24 && completedOrders.length > 0) {
      suggestions.push('工单平均处理时长偏长，建议优化工单分配流程，设置SLA超时预警');
    }
    if (suggestions.length === 0) {
      suggestions.push('各项指标表现良好，建议下月关注数据波动趋势，持续优化薄弱环节');
      suggestions.push('可以尝试使用AI急救站处理更多高频问题，进一步节省团队时间');
    }

    // ── 5. 对比模块：系统使用前 vs 现在 ──
    // 获取系统首次使用月份的数据作为基线
    const { data: firstCost } = await supabase
      .from('cost_records')
      .select('record_date')
      .eq('company_id', companyId)
      .order('record_date', { ascending: true })
      .limit(1);

    const { data: baselineData } = await supabase
      .from('cost_baselines')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    // 用第一个月的赔付数据作为基线
    let baselineMonth = '';
    let baselineRefund = 0;
    let baselineKpiRate = 0;
    let baselineQualityScore = 0;

    if (firstCost && firstCost.length > 0) {
      const firstDate = (firstCost[0] as { record_date: string }).record_date;
      baselineMonth = firstDate.slice(0, 7);
      const baseStart = firstDate.slice(0, 8) + '01';
      const baseMonth = parseInt(firstDate.slice(5, 7), 10);
      const baseYear = parseInt(firstDate.slice(0, 4), 10);
      const baseEnd = baseMonth === 12
        ? `${baseYear + 1}-01-01`
        : `${baseYear}-${String(baseMonth + 1).padStart(2, '0')}-01`;

      const { data: baseCosts } = await supabase
        .from('cost_records')
        .select('amount')
        .eq('company_id', companyId)
        .gte('record_date', baseStart)
        .lt('record_date', baseEnd);
      baselineRefund = (baseCosts || []).reduce((s: number, r: { amount: number }) => s + (Number(r.amount) || 0), 0);

      const { data: baseKpi } = await supabase
        .from('kpi_records')
        .select('actual_value, target_value')
        .eq('company_id', companyId)
        .gte('period', baseStart)
        .lt('period', baseEnd);
      baselineKpiRate = calcKpiRate(baseKpi || []);

      const { data: baseQuality } = await supabase
        .from('quality_inspections')
        .select('total_score')
        .eq('company_id', companyId)
        .gte('inspected_at', baseStart)
        .lt('inspected_at', baseEnd);
      baselineQualityScore = baseQuality && baseQuality.length > 0
        ? Math.round(baseQuality.reduce((s: number, r: { total_score: number }) => s + (Number(r.total_score) || 0), 0) / baseQuality.length * 10) / 10
        : 0;
    }

    // 如果有手动基线数据，优先使用
    if (baselineData) {
      baselineRefund = Number(baselineData.baseline_compensation_rate) || baselineRefund;
      baselineKpiRate = Number(baselineData.baseline_refund_rate) || baselineKpiRate;
      baselineQualityScore = Number(baselineData.baseline_satisfaction) || baselineQualityScore;
    }

    const hasBaseline = baselineMonth !== '' || baselineData !== null;

    // ── 6. 价值量化 ──
    const hourlyRate = 25;
    const aiSavingMoney = Math.round(aiEstHours * hourlyRate);
    const refundSavedAmount = prevTotal > currentTotal ? prevTotal - currentTotal : 0;
    const totalSaved = aiSavingMoney + refundSavedAmount;

    return NextResponse.json({
      data: {
        month: targetMonth,
        prevMonth: prevMonthStr,
        refund: {
          total: currentTotal,
          prevTotal,
          changePercent: refundChange,
          top3Categories,
          canSeeDetail: canSeeRefundDetail,
        },
        team: {
          kpiAchieveRate,
          prevKpiAchieveRate,
          kpiChange,
          avgQualityScore,
          prevAvgQualityScore,
          qualityChange,
          avgHandleHours,
          kpiRecordCount: kpiRecords.length,
          qualityRecordCount: qualityRecords.length,
          completedOrderCount: completedOrders.length,
        },
        ai: {
          creditsUsed: aiCreditsUsed,
          estMinutesSaved: aiEstMinutes,
          estHoursSaved: aiEstHours,
        },
        suggestions,
        // 新增：对比模块
        comparison: {
          // 上月 vs 本月
          monthOverMonth: {
            refund: { current: currentTotal, prev: prevTotal, change: refundChange },
            kpi: { current: kpiAchieveRate, prev: prevKpiAchieveRate, change: kpiChange },
            quality: { current: avgQualityScore, prev: prevAvgQualityScore, change: qualityChange },
          },
          // 使用前 vs 现在
          beforeVsNow: {
            hasBaseline,
            baselineMonth: baselineMonth || '首次月',
            refund: { baseline: baselineRefund, current: currentTotal },
            kpi: { baseline: baselineKpiRate, current: kpiAchieveRate },
            quality: { baseline: baselineQualityScore, current: avgQualityScore },
          },
        },
        // 新增：价值量化
        valueQuantification: {
          aiSavingHours: aiEstHours,
          aiSavingMoney,
          refundSavedAmount,
          totalSaved,
          hourlyRate,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[monthly-report GET] Error:', message);
    return NextResponse.json({ error: `获取月度简报失败: ${message}` }, { status: 500 });
  }
}

// POST: 保存当月报告到 monthly_reports 表（用于历史对比和自动归档）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { company_id, user_id, report_month, summary } = body;

    if (!company_id || !report_month) {
      return NextResponse.json({ error: '缺少company_id或report_month' }, { status: 400 });
    }

    const supabase = await getSupabaseClient();

    // Upsert: 如果该月已有报告则更新
    const { data, error } = await supabase
      .from('monthly_reports')
      .upsert(
        {
          company_id,
          user_id: user_id || null,
          report_month,
          summary: summary || {},
        },
        { onConflict: 'company_id,report_month' }
      )
      .select()
      .single();

    if (error) {
      console.error('[monthly-report POST] Supabase error:', error.message);
      return NextResponse.json({ error: `保存报告失败: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[monthly-report POST] Error:', message);
    return NextResponse.json({ error: `保存报告失败: ${message}` }, { status: 500 });
  }
}
