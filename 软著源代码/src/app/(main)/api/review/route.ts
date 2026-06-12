import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/* ─── 复盘提醒 API ─── */

// GET: 生成复盘数据（按日期范围统计）
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const period = searchParams.get('period') || 'daily'; // daily | weekly | monthly

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const now = new Date();
    let startDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;
    let title: string;
    let periodLabel: string;

    if (period === 'weekly') {
      // 本周一
      const dayOfWeek = now.getDay() || 7;
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek + 1);
      startDate.setHours(0, 0, 0, 0);
      // 上周一到上周日
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);
      prevEndDate = new Date(startDate);
      prevEndDate.setTime(prevEndDate.getTime() - 1);
      title = '每周复盘';
      periodLabel = '本周';
    } else if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEndDate = new Date(startDate);
      prevEndDate.setTime(prevEndDate.getTime() - 1);
      title = '每月复盘';
      periodLabel = '本月';
    } else {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 1);
      prevEndDate = new Date(startDate);
      prevEndDate.setTime(prevEndDate.getTime() - 1);
      title = '每日复盘';
      periodLabel = '今日';
    }

    const startISO = startDate.toISOString();
    const nowISO = now.toISOString();
    const prevStartISO = prevStartDate.toISOString();
    const prevEndISO = prevEndDate.toISOString();

    // 1. AI使用次数（problem_solutions）
    const { count: aiCount, error: e1 } = await supabase
      .from('problem_solutions')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('created_at', startISO)
      .lte('created_at', nowISO);
    if (e1) console.error('[review] ai count error:', e1);

    const { count: prevAiCount } = await supabase
      .from('problem_solutions')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('created_at', prevStartISO)
      .lte('created_at', prevEndISO);

    // 2. 问题类型TOP3
    const { data: typeData } = await supabase
      .from('problem_solutions')
      .select('category')
      .eq('company_id', companyId)
      .gte('created_at', startISO)
      .lte('created_at', nowISO);

    const typeMap: Record<string, number> = {};
    (typeData || []).forEach((r: { category: string | null }) => {
      const cat = r.category || '未分类';
      typeMap[cat] = (typeMap[cat] || 0) + 1;
    });
    const topTypes = Object.entries(typeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    // 3. 待处理工单
    const { count: pendingOrders } = await supabase
      .from('work_orders')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', ['待处理', '处理中']);

    // 4. 已完成工单
    const { count: completedOrders } = await supabase
      .from('work_orders')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', '已完成')
      .gte('completed_at', startISO)
      .lte('completed_at', nowISO);

    // 5. 质检均分
    const { data: scoreData } = await supabase
      .from('quality_inspections')
      .select('total_score')
      .eq('company_id', companyId)
      .gte('created_at', startISO)
      .lte('created_at', nowISO);

    const avgScore = (scoreData || []).length > 0
      ? (scoreData as { total_score: number }[]).reduce((s, r) => s + r.total_score, 0) / (scoreData as { total_score: number }[]).length
      : 0;

    // 上期质检均分
    const { data: prevScoreData } = await supabase
      .from('quality_inspections')
      .select('total_score')
      .eq('company_id', companyId)
      .gte('created_at', prevStartISO)
      .lte('created_at', prevEndISO);

    const prevAvgScore = (prevScoreData || []).length > 0
      ? (prevScoreData as { total_score: number }[]).reduce((s, r) => s + r.total_score, 0) / (prevScoreData as { total_score: number }[]).length
      : 0;

    // 环比计算
    const calcChange = (curr: number, prev: number): string => {
      if (prev === 0) return curr > 0 ? '+100%' : '0%';
      const change = ((curr - prev) / prev * 100).toFixed(1);
      return `${Number(change) >= 0 ? '+' : ''}${change}%`;
    };

    const aiChange = calcChange(aiCount || 0, prevAiCount || 0);
    const scoreChange = calcChange(avgScore, prevAvgScore);

    // 生成 content
    const topTypesText = topTypes.length > 0
      ? topTypes.map((t, i) => `${i + 1}. ${t.name}（${t.count}次）`).join('<br/>')
      : '暂无数据';

    const content = `
<h3>${title} - ${periodLabel}数据概览</h3>
<table style="width:100%;border-collapse:collapse;margin:12px 0">
  <tr style="background:#f8f9fa">
    <th style="padding:8px;text-align:left;border-bottom:1px solid #e5e7eb">指标</th>
    <th style="padding:8px;text-align:center;border-bottom:1px solid #e5e7eb">数值</th>
    <th style="padding:8px;text-align:center;border-bottom:1px solid #e5e7eb">环比</th>
  </tr>
  <tr>
    <td style="padding:8px;border-bottom:1px solid #f3f4f6">AI使用次数</td>
    <td style="padding:8px;text-align:center;border-bottom:1px solid #f3f4f6;font-weight:bold">${aiCount || 0}次</td>
    <td style="padding:8px;text-align:center;border-bottom:1px solid #f3f4f6;color:${aiChange.startsWith('+') ? '#16a34a' : aiChange.startsWith('-') ? '#dc2626' : '#6b7280'}">${aiChange}</td>
  </tr>
  <tr>
    <td style="padding:8px;border-bottom:1px solid #f3f4f6">待处理工单</td>
    <td style="padding:8px;text-align:center;border-bottom:1px solid #f3f4f6;font-weight:bold">${pendingOrders || 0}个</td>
    <td style="padding:8px;text-align:center;border-bottom:1px solid #f3f4f6;color:#6b7280">-</td>
  </tr>
  <tr>
    <td style="padding:8px;border-bottom:1px solid #f3f4f6">已完成工单</td>
    <td style="padding:8px;text-align:center;border-bottom:1px solid #f3f4f6;font-weight:bold">${completedOrders || 0}个</td>
    <td style="padding:8px;text-align:center;border-bottom:1px solid #f3f4f6;color:#6b7280">-</td>
  </tr>
  <tr>
    <td style="padding:8px">质检均分</td>
    <td style="padding:8px;text-align:center;font-weight:bold">${avgScore.toFixed(1)}分</td>
    <td style="padding:8px;text-align:center;color:${scoreChange.startsWith('+') ? '#16a34a' : scoreChange.startsWith('-') ? '#dc2626' : '#6b7280'}">${scoreChange}</td>
  </tr>
</table>

<h4>问题类型TOP3</h4>
<p>${topTypesText}</p>
`;

    const summary = `AI使用${aiCount || 0}次${aiChange} | 待处理${pendingOrders || 0}个 | 质检${avgScore.toFixed(1)}分`;

    return NextResponse.json({
      data: {
        period,
        title,
        summary,
        content,
        stats: {
          aiCount: aiCount || 0,
          aiChange,
          pendingOrders: pendingOrders || 0,
          completedOrders: completedOrders || 0,
          avgScore: Number(avgScore.toFixed(1)),
          scoreChange,
          topTypes,
        },
      },
    });
  } catch (err) {
    console.error('[review GET] error:', err);
    return NextResponse.json({ error: '生成复盘数据失败' }, { status: 500 });
  }
}

// POST: 生成复盘通知并存入notifications表
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { companyId, period = 'daily' } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    // 先生成复盘数据
    const baseUrl = process.env.DEPLOY_RUN_PORT
      ? `http://localhost:${process.env.DEPLOY_RUN_PORT}`
      : 'http://localhost:5000';
    const res = await fetch(`${baseUrl}/api/review?companyId=${companyId}&period=${period}`);
    if (!res.ok) throw new Error('生成复盘数据失败');
    const { data: reviewData } = await res.json();

    // 存入notifications
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        company_id: companyId,
        type: 'review',
        title: reviewData.title,
        summary: reviewData.summary,
        content: reviewData.content,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[review POST] error:', err);
    return NextResponse.json({ error: '创建复盘通知失败' }, { status: 500 });
  }
}
