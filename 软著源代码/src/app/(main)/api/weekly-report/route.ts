import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

type RequestLike = NextRequest | Request;

// GET: 获取周报列表
export async function GET(request: RequestLike) {
  try {
    const supabase = await getSupabaseClient();
    const url = new URL(request.url);
    const companyId = url.searchParams.get('company_id');
    if (!companyId) return NextResponse.json({ error: '缺少company_id' }, { status: 400 });

    const { data, error } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('company_id', companyId)
      .order('week_start', { ascending: false })
      .limit(12);

    if (error) {
      console.error('[weekly-report GET] Error:', JSON.stringify(error));
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ data: { reports: data || [] } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: 生成周报或标记已读
export async function POST(request: RequestLike) {
  try {
    const supabase = await getSupabaseClient();
    const body = await request.json();
    const { action, company_id } = body;

    if (!company_id) return NextResponse.json({ error: '缺少company_id' }, { status: 400 });

    if (action === 'generate') {
      // 计算本周日期范围
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const weekStart = monday.toISOString().split('T')[0];
      const weekEnd = sunday.toISOString().split('T')[0];

      // 查本周售后亏损
      const { data: costData } = await supabase
        .from('cost_records')
        .select('amount, category, created_at')
        .eq('company_id', company_id)
        .gte('created_at', weekStart)
        .lte('created_at', weekEnd + 'T23:59:59');

      const totalLoss = (costData || []).reduce((s: number, r: { amount: number }) => s + Number(r.amount || 0), 0);

      // 查上周亏损计算环比
      const lastMonday = new Date(monday);
      lastMonday.setDate(monday.getDate() - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      const { data: lastCostData } = await supabase
        .from('cost_records')
        .select('amount')
        .eq('company_id', company_id)
        .gte('created_at', lastMonday.toISOString().split('T')[0])
        .lte('created_at', lastSunday.toISOString().split('T')[0] + 'T23:59:59');

      const lastWeekLoss = (lastCostData || []).reduce((s: number, r: { amount: number }) => s + Number(r.amount || 0), 0);
      const lossChangePercent = lastWeekLoss > 0 ? Number(((totalLoss - lastWeekLoss) / lastWeekLoss * 100).toFixed(1)) : null;

      // 查异常赔付
      const { data: anomalyData } = await supabase
        .from('keyword_alert_records')
        .select('keyword, alert_level')
        .eq('company_id', company_id)
        .eq('is_resolved', false)
        .gte('created_at', weekStart);

      const anomalyCount = (anomalyData || []).length;
      const anomalyMap: Record<string, number> = {};
      (anomalyData || []).forEach((r: { keyword: string }) => { anomalyMap[r.keyword] = (anomalyMap[r.keyword] || 0) + 1; });
      const anomalyDetails = Object.entries(anomalyMap).map(([keyword, count]) => ({ keyword, count }));

      // 查AI使用量
      const { data: companyData } = await supabase
        .from('companies')
        .select('ai_credits_remaining')
        .eq('id', company_id)
        .maybeSingle();

      const aiUsageCount = 0; // 基于实际AI调用量计算
      const aiSavingMinutes = aiUsageCount * 3;

      // 生成建议
      const suggestions = totalLoss > 0
        ? `本周售后亏损¥${totalLoss.toLocaleString()}，${lossChangePercent !== null ? (lossChangePercent > 0 ? `环比增加${lossChangePercent}%` : `环比减少${Math.abs(lossChangePercent)}%`) : ''}。${anomalyCount > 0 ? `发现${anomalyCount}笔异常赔付需关注。` : ''}建议：1.重点关注高额赔付产品的质量改善；2.加强客服赔付权限培训；3.优化退换货流程降低损耗。`
        : '本周暂无售后亏损记录，保持良好运营状态。';

      const { data, error } = await supabase
        .from('weekly_reports')
        .insert({
          company_id,
          week_start: weekStart,
          week_end: weekEnd,
          total_loss: totalLoss,
          loss_change_percent: lossChangePercent,
          anomaly_count: anomalyCount,
          anomaly_details: anomalyDetails,
          ai_saving_minutes: aiSavingMinutes,
          ai_usage_count: aiUsageCount,
          suggestions,
        })
        .select()
        .single();

      if (error) {
        console.error('[weekly-report POST generate] Error:', JSON.stringify(error));
        return NextResponse.json({ error: '生成失败' }, { status: 500 });
      }

      return NextResponse.json({ data });
    }

    if (action === 'mark_read') {
      const { report_id } = body;
      await supabase.from('weekly_reports').update({ is_read: true }).eq('id', report_id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
