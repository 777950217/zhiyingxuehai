import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const CRON_SECRET = process.env.CRON_SECRET || 'dev-cron-secret';

function verifyAuth(request: Request): boolean {
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${CRON_SECRET}`) return true;
  // Also allow internal calls from server-side
  const referer = request.headers.get('referer') || '';
  if (referer.includes('localhost') || referer.includes('coze.site')) return true;
  return false;
}

// ─── 日期工具 ───
function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay() || 7; // Sunday=7
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(monday), end: fmt(sunday) };
}

function getLastWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay() || 7;
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - day + 1 - 7);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(lastMonday), end: fmt(lastSunday) };
}

function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(start), end: fmt(end) };
}

function getLastMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(start), end: fmt(end) };
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ─── 成本周报 ───
async function generateCostWeekly(companyId: string): Promise<{
  title: string; summary: string; data: Record<string, unknown>; insights: Array<{ type: string; text: string }>;
}> {
  const sb = getSupabaseClient();
  const thisWeek = getWeekRange();
  const lastWeek = getLastWeekRange();

  const [thisRes, lastRes] = await Promise.all([
    sb.from('cost_records').select('*').eq('company_id', companyId).gte('record_date', thisWeek.start).lte('record_date', thisWeek.end),
    sb.from('cost_records').select('*').eq('company_id', companyId).gte('record_date', lastWeek.start).lte('record_date', lastWeek.end),
  ]);

  const thisRecords = thisRes.data || [];
  const lastRecords = lastRes.data || [];

  const thisTotal = thisRecords.reduce((s: number, r: Record<string, unknown>) => s + Number(r.total_cost || 0), 0);
  const lastTotal = lastRecords.reduce((s: number, r: Record<string, unknown>) => s + Number(r.total_cost || 0), 0);
  const thisWO = thisRecords.reduce((s: number, r: Record<string, unknown>) => s + Number(r.work_order_count || 0), 0);
  const lastWO = lastRecords.reduce((s: number, r: Record<string, unknown>) => s + Number(r.work_order_count || 0), 0);
  const thisRefund = thisRecords.reduce((s: number, r: Record<string, unknown>) => s + Number(r.refund_count || 0), 0);
  const lastRefund = lastRecords.reduce((s: number, r: Record<string, unknown>) => s + Number(r.refund_count || 0), 0);
  const refundRate = thisWO > 0 ? Math.round((thisRefund / thisWO) * 100) : 0;
  const lastRefundRate = lastWO > 0 ? Math.round((lastRefund / lastWO) * 100) : 0;

  const costChange = pctChange(thisTotal, lastTotal);
  const woChange = pctChange(thisWO, lastWO);
  const refundChange = pctChange(refundRate, lastRefundRate);

  // 7天趋势
  const dailyData: Array<{ date: string; cost: number; workOrders: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const rec = thisRecords.find((r: Record<string, unknown>) => r.record_date === ds);
    dailyData.push({ date: ds.slice(5), cost: Number(rec?.total_cost || 0), workOrders: Number(rec?.work_order_count || 0) });
  }

  const insights: Array<{ type: string; text: string }> = [];
  if (Math.abs(costChange) >= 30) {
    insights.push({ type: costChange > 0 ? 'warning' : 'good', text: `成本环比${costChange > 0 ? '上涨' : '下降'}${Math.abs(costChange)}%，${costChange > 0 ? '需关注成本控制' : '成本控制良好'}` });
  }
  if (refundRate > 10) {
    insights.push({ type: 'warning', text: `退款率${refundRate}%偏高，建议排查退款原因` });
  }
  if (thisTotal > 0 && lastTotal === 0) {
    insights.push({ type: 'trend', text: '本周新增成本记录，上周无数据' });
  }

  const direction = costChange > 0 ? '上涨' : costChange < 0 ? '下降' : '持平';
  const reason = costChange > 30 ? '，主要受工单量增长影响' : costChange < -30 ? '，工单量有所减少' : '';
  const summary = `本周成本¥${thisTotal.toFixed(2)}，环比${direction}${Math.abs(costChange)}%${reason}；处理工单${thisWO}个，退款率${refundRate}%`;

  return {
    title: `成本周报 ${thisWeek.start} ~ ${thisWeek.end}`,
    summary,
    data: { thisTotal, lastTotal, thisWO, lastWO, thisRefund, refundRate, costChange, woChange, refundChange, dailyData },
    insights,
  };
}

// ─── 质检周报 ───
async function generateQualityWeekly(companyId: string): Promise<{
  title: string; summary: string; data: Record<string, unknown>; insights: Array<{ type: string; text: string }>;
}> {
  const sb = getSupabaseClient();
  const thisWeek = getWeekRange();

  const { data: inspections } = await sb
    .from('quality_inspections')
    .select('*')
    .eq('company_id', companyId)
    .gte('created_at', thisWeek.start)
    .lte('created_at', thisWeek.end + 'T23:59:59');

  const records = inspections || [];
  const count = records.length;

  const dims = [
    { key: 'response_score', label: '响应速度' },
    { key: 'script_score', label: '话术规范' },
    { key: 'attitude_score', label: '服务态度' },
    { key: 'process_score', label: '流程完整' },
    { key: 'resolution_score', label: '问题解决' },
  ];

  const avgScores = dims.map(d => {
    const sum = records.reduce((s: number, r: Record<string, unknown>) => s + Number(r[d.key] || 0), 0);
    return { ...d, avg: count > 0 ? Math.round((sum / count) * 10) / 10 : 0 };
  });

  const totalAvg = count > 0 ? Math.round((avgScores.reduce((s, d) => s + d.avg, 0) / 5) * 10) / 10 : 0;
  const weakest = avgScores.reduce((min, d) => d.avg < min.avg ? d : min, avgScores[0]);

  // 每日趋势
  const dailyData: Array<{ date: string; avg: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const dayRecords = records.filter((r: Record<string, unknown>) => (r.created_at as string)?.startsWith(ds));
    const dayAvg = dayRecords.length > 0
      ? Math.round((dayRecords.reduce((s: number, r: Record<string, unknown>) => s + Number(r.total_score || 0), 0) / dayRecords.length) * 10) / 10
      : 0;
    dailyData.push({ date: ds.slice(5), avg: dayAvg });
  }

  const insights: Array<{ type: string; text: string }> = [];
  if (weakest.avg < 3 && count > 0) {
    insights.push({ type: 'warning', text: `"${weakest.label}"均分仅${weakest.avg}分，为最弱项，建议重点培训` });
  }
  if (totalAvg >= 4) {
    insights.push({ type: 'good', text: `整体质检均分${totalAvg}分，服务质量优秀` });
  }
  if (count === 0) {
    insights.push({ type: 'trend', text: '本周暂无质检记录，建议安排质检' });
  }

  const radarData = avgScores.map(d => ({ dimension: d.label, score: d.avg, fullMark: 5 }));
  const summary = count > 0
    ? `本周质检均分${totalAvg}分（共${count}次），最弱项是"${weakest.label}"（${weakest.avg}分），${weakest.avg < 3 ? '建议重点关注' : '整体表现平稳'}`
    : '本周暂无质检记录';

  return {
    title: `质检周报 ${thisWeek.start} ~ ${thisWeek.end}`,
    summary,
    data: { count, totalAvg, avgScores, radarData, dailyData, weakest: weakest.label },
    insights,
  };
}

// ─── 工单周报 ───
async function generateWorkorderWeekly(companyId: string): Promise<{
  title: string; summary: string; data: Record<string, unknown>; insights: Array<{ type: string; text: string }>;
}> {
  const sb = getSupabaseClient();
  const thisWeek = getWeekRange();

  const { data: orders } = await sb
    .from('work_orders')
    .select('*')
    .eq('company_id', companyId)
    .gte('created_at', thisWeek.start)
    .lte('created_at', thisWeek.end + 'T23:59:59');

  const records = orders || [];
  const total = records.length;
  const completed = records.filter((r: Record<string, unknown>) => r.status === '已完成').length;
  const pending = records.filter((r: Record<string, unknown>) => r.status === '待处理').length;
  const processing = records.filter((r: Record<string, unknown>) => r.status === '处理中').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // 按分类分布
  const categoryMap: Record<string, number> = {};
  records.forEach((r: Record<string, unknown>) => {
    const cat = (r.category as string) || '未分类';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const categoryDist = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 按优先级
  const priorityMap: Record<string, number> = {};
  records.forEach((r: Record<string, unknown>) => {
    const p = (r.priority as string) || '普通';
    priorityMap[p] = (priorityMap[p] || 0) + 1;
  });

  // 每日趋势
  const dailyData: Array<{ date: string; created: number; completed: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const dayCreated = records.filter((r: Record<string, unknown>) => (r.created_at as string)?.startsWith(ds)).length;
    const dayCompleted = records.filter((r: Record<string, unknown>) => (r.completed_at as string)?.startsWith(ds)).length;
    dailyData.push({ date: ds.slice(5), created: dayCreated, completed: dayCompleted });
  }

  const insights: Array<{ type: string; text: string }> = [];
  if (completionRate < 60 && total > 0) {
    insights.push({ type: 'warning', text: `工单完成率仅${completionRate}%，${pending}个待处理工单需关注` });
  }
  if (completionRate >= 90 && total > 0) {
    insights.push({ type: 'good', text: `工单完成率${completionRate}%，处理效率优秀` });
  }
  if (categoryDist.length > 0) {
    insights.push({ type: 'trend', text: `"${categoryDist[0].name}"类工单占比最高(${categoryDist[0].value}个)` });
  }
  if (total === 0) {
    insights.push({ type: 'trend', text: '本周暂无工单记录' });
  }

  const topCategory = categoryDist[0]?.name || '无';
  const summary = total > 0
    ? `本周处理${total}个工单，完成率${completionRate}%，"${topCategory}"类占比最高`
    : '本周暂无工单记录';

  return {
    title: `工单周报 ${thisWeek.start} ~ ${thisWeek.end}`,
    summary,
    data: { total, completed, pending, processing, completionRate, categoryDist, priorityMap, dailyData },
    insights,
  };
}

// ─── AI使用月报 ───
async function generateAiMonthly(companyId: string): Promise<{
  title: string; summary: string; data: Record<string, unknown>; insights: Array<{ type: string; text: string }>;
}> {
  const sb = getSupabaseClient();
  const thisMonth = getMonthRange();
  const lastMonth = getLastMonthRange();

  const [thisRes, lastRes] = await Promise.all([
    sb.from('problem_solutions').select('*').eq('company_id', companyId).gte('created_at', thisMonth.start).lte('created_at', thisMonth.end + 'T23:59:59'),
    sb.from('problem_solutions').select('*').eq('company_id', companyId).gte('created_at', lastMonth.start).lte('created_at', lastMonth.end + 'T23:59:59'),
  ]);

  const thisRecords = thisRes.data || [];
  const lastRecords = lastRes.data || [];
  const thisCount = thisRecords.length;
  const lastCount = lastRecords.length;
  const usageChange = pctChange(thisCount, lastCount);

  // 高频问题TOP10
  const queryMap: Record<string, number> = {};
  thisRecords.forEach((r: Record<string, unknown>) => {
    const q = (r.query as string) || (r.problem_desc as string) || '未知';
    // 取前20字符作为key
    const key = q.slice(0, 20);
    queryMap[key] = (queryMap[key] || 0) + 1;
  });
  const topQueries = Object.entries(queryMap)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 按分类分布
  const categoryMap: Record<string, number> = {};
  thisRecords.forEach((r: Record<string, unknown>) => {
    const cat = (r.category as string) || (r.diagnosis_type as string) || '未分类';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const categoryDist = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 标记为案例数
  const caseCount = thisRecords.filter((r: Record<string, unknown>) => r.is_marked_as_case === true).length;
  const helpfulCount = thisRecords.filter((r: Record<string, unknown>) => r.is_helpful === true).length;
  const helpfulRate = thisCount > 0 ? Math.round((helpfulCount / thisCount) * 100) : 0;

  // 每日趋势
  const dailyData: Array<{ date: string; count: number }> = [];
  const daysInMonth = new Date().getDate();
  for (let i = Math.min(30, daysInMonth - 1); i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const dayCount = thisRecords.filter((r: Record<string, unknown>) => (r.created_at as string)?.startsWith(ds)).length;
    dailyData.push({ date: ds.slice(5), count: dayCount });
  }

  const insights: Array<{ type: string; text: string }> = [];
  if (thisCount > 0 && helpfulRate < 50) {
    insights.push({ type: 'warning', text: `AI解决方案有用率仅${helpfulRate}%，建议优化知识库` });
  }
  if (thisCount > 0 && helpfulRate >= 80) {
    insights.push({ type: 'good', text: `AI解决方案有用率${helpfulRate}%，效果良好` });
  }
  if (usageChange > 50) {
    insights.push({ type: 'trend', text: `使用量环比增长${usageChange}%，团队依赖度提升` });
  }
  if (thisCount === 0) {
    insights.push({ type: 'trend', text: '本月暂无AI使用记录' });
  }

  const topQ = topQueries[0]?.query || '无';
  const summary = thisCount > 0
    ? `本月AI解决器使用${thisCount}次，环比${usageChange > 0 ? '增长' : '减少'}${Math.abs(usageChange)}%，最常问的问题是"${topQ}"，有用率${helpfulRate}%`
    : '本月暂无AI使用记录';

  return {
    title: `AI使用月报 ${thisMonth.start} ~ ${thisMonth.end}`,
    summary,
    data: { thisCount, lastCount, usageChange, topQueries, categoryDist, caseCount, helpfulRate, dailyData },
    insights,
  };
}

// ─── 主处理 ───
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { type: reportType, company_id: targetCompanyId } = body;

  const validTypes = ['cost_weekly', 'quality_weekly', 'workorder_weekly', 'ai_monthly'];
  if (!reportType || !validTypes.includes(reportType)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join('/')}` }, { status: 400 });
  }

  const sb = getSupabaseClient();

  // 获取目标公司列表
  let companies: Array<{ id: string; name: string }>;
  if (targetCompanyId) {
    const { data } = await sb.from('companies').select('id, name').eq('id', targetCompanyId).single();
    companies = data ? [data] : [];
  } else {
    const { data } = await sb.from('companies').select('id, name');
    companies = data || [];
  }

  const now = new Date();
  const results: Array<{ company_id: string; report_id: string }> = [];

  for (const company of companies) {
    try {
      let report: { title: string; summary: string; data: Record<string, unknown>; insights: Array<{ type: string; text: string }> };

      switch (reportType) {
        case 'cost_weekly': {
          const week = getWeekRange();
          report = await generateCostWeekly(company.id);
          report.data = { ...report.data, period_start: week.start, period_end: week.end };
          break;
        }
        case 'quality_weekly': {
          const week = getWeekRange();
          report = await generateQualityWeekly(company.id);
          report.data = { ...report.data, period_start: week.start, period_end: week.end };
          break;
        }
        case 'workorder_weekly': {
          const week = getWeekRange();
          report = await generateWorkorderWeekly(company.id);
          report.data = { ...report.data, period_start: week.start, period_end: week.end };
          break;
        }
        case 'ai_monthly': {
          const month = getMonthRange();
          report = await generateAiMonthly(company.id);
          report.data = { ...report.data, period_start: month.start, period_end: month.end };
          break;
        }
        default:
          continue;
      }

      // 提取 period_start / period_end
      const periodStart = (report.data.period_start as string) || now.toISOString().split('T')[0];
      const periodEnd = (report.data.period_end as string) || now.toISOString().split('T')[0];

      // 写入 reports 表
      const { data: inserted, error } = await sb.from('reports').insert({
        company_id: company.id,
        type: reportType,
        title: report.title,
        period_start: periodStart,
        period_end: periodEnd,
        summary: report.summary,
        data: report.data,
        insights: report.insights,
      }).select('id').single();

      if (error) {
        console.error(`[reports] Failed to insert for company ${company.id}:`, error.message);
        continue;
      }

      results.push({ company_id: company.id, report_id: inserted.id });

      // 通知该企业下所有用户
      const { data: users } = await sb.from('users').select('id').eq('company_id', company.id).eq('status', 'active');
      if (users && users.length > 0) {
        const typeLabel: Record<string, string> = {
          cost_weekly: '成本周报',
          quality_weekly: '质检周报',
          workorder_weekly: '工单周报',
          ai_monthly: 'AI使用月报',
        };
        const notifications = users.map(u => ({
          company_id: company.id,
          user_id: u.id,
          type: 'report',
          title: `${typeLabel[reportType] || '报告'}已生成`,
          content: report.summary,
          is_read: false,
        }));
        await sb.from('notifications').insert(notifications);
      }
    } catch (err) {
      console.error(`[reports] Error generating ${reportType} for company ${company.id}:`, err);
    }
  }

  return NextResponse.json({ success: true, generated: results.length, results });
}

// GET 也可触发（兼容 cron 调用）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'cost_weekly';
  const companyId = searchParams.get('company_id') || '';

  // 验证 cron 认证
  const auth = request.headers.get('authorization');
  if (!verifyAuth(request) && auth !== `Bearer ${CRON_SECRET}`) {
    // Allow unauthenticated for internal page calls too
  }

  // Convert to POST body and call
  const postReq = new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, company_id: companyId || undefined }),
  });
  return POST(postReq);
}
