import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 顾问后台 API
 * 
 * GET  /api/consultant?action=clients            — 获取所有自学客户概览
 * GET  /api/consultant?action=client-detail&id=xx — 获取单客户详情
 * POST /api/consultant action=add-note            — 添加顾问备注
 * POST /api/consultant action=remind-renewal       — 发送订阅提醒
 */

// ─── Health status helper ───
function calcHealthStatus(ai7d: number, inspection7d: number, lastActiveDays: number | null): string {
  if (lastActiveDays !== null && lastActiveDays > 14) return 'abnormal';
  if (ai7d < 5 || inspection7d < 1) return 'attention';
  return 'normal';
}

const HEALTH_LABEL: Record<string, { emoji: string; label: string; color: string }> = {
  normal:   { emoji: '🟢', label: '正常',   color: 'green' },
  attention:{ emoji: '🟡', label: '需关注', color: 'amber' },
  abnormal: { emoji: '🔴', label: '异常',   color: 'red' },
};

// ─── GET ───
export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'clients';

  try {
    // ── Clients overview ──
    if (action === 'clients') {
      // 1. Get active subscribed companies
      const { data: companies, error: compErr } = await supabase
        .from('companies')
        .select('id, name, service_level, created_at')
        .eq('status', 'active');
      if (compErr) throw compErr;

      if (!companies || companies.length === 0) {
        return NextResponse.json({ data: [] });
      }

      const companyIds = companies.map((c: Record<string, unknown>) => c.id as string);

      // 2. Get subscriptions (filter active with plan_end in future)
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('company_id, plan, plan_end, status')
        .in('company_id', companyIds)
        .eq('status', 'active');

      // Build map: company_id → subscription
      const subMap = new Map<string, Record<string, unknown>>();
      (subs || []).forEach((s: Record<string, unknown>) => {
        subMap.set(s.company_id as string, s);
      });

      // Only companies with active subscription
      const activeCompanyIds = companyIds.filter(id => subMap.has(id));

      // 3. Get onboarding progress for these companies (compatible with missing table)
      const progressMap = new Map<string, Record<string, unknown>>();
      try {
        const { data: progress } = await supabase
          .from('onboarding_progress')
          .select('company_id, current_day, completed_days, total_days, started_at')
          .in('company_id', activeCompanyIds);
        (progress || []).forEach((p: Record<string, unknown>) => {
          progressMap.set(p.company_id as string, p);
        });
      } catch {
        console.warn('onboarding_progress表不存在或查询失败，跳过学习进度');
      }

      // 4. Count completed tasks per company (compatible with missing table)
      const taskCountMap = new Map<string, { total: number; completed: number }>();
      try {
        const { data: taskStats } = await supabase
          .from('onboarding_tasks')
          .select('company_id, is_completed')
          .in('company_id', activeCompanyIds);
        (taskStats || []).forEach((t: Record<string, unknown>) => {
          const cid = t.company_id as string;
          if (!taskCountMap.has(cid)) taskCountMap.set(cid, { total: 0, completed: 0 });
          const entry = taskCountMap.get(cid)!;
          entry.total++;
          if (t.is_completed) entry.completed++;
        });
      } catch {
        console.warn('onboarding_tasks表不存在或查询失败，跳过任务统计');
      }

      // 5. AI usage in last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data: aiUsage } = await supabase
        .from('problem_solutions')
        .select('company_id, created_at')
        .in('company_id', activeCompanyIds)
        .gte('created_at', sevenDaysAgo);

      const aiUsageMap = new Map<string, number>();
      (aiUsage || []).forEach((a: Record<string, unknown>) => {
        const cid = a.company_id as string;
        aiUsageMap.set(cid, (aiUsageMap.get(cid) || 0) + 1);
      });

      // 6. Inspections in last 7 days
      const { data: inspections } = await supabase
        .from('quality_inspections')
        .select('company_id, created_at')
        .in('company_id', activeCompanyIds)
        .gte('created_at', sevenDaysAgo);

      const inspMap = new Map<string, number>();
      (inspections || []).forEach((i: Record<string, unknown>) => {
        const cid = (i.company_id as string || '');
        if (cid) inspMap.set(cid, (inspMap.get(cid) || 0) + 1);
      });

      // 7. Last active from users table
      const { data: users } = await supabase
        .from('users')
        .select('company_id, last_login_at')
        .in('company_id', activeCompanyIds);

      const lastActiveMap = new Map<string, string | null>();
      (users || []).forEach((u: Record<string, unknown>) => {
        const cid = u.company_id as string;
        const loginAt = u.last_login_at as string | null;
        const existing = lastActiveMap.get(cid);
        if (!existing || (loginAt && loginAt > existing)) {
          lastActiveMap.set(cid, loginAt);
        }
      });

      // 8. Assemble results
      const now = Date.now();
      const clients = activeCompanyIds.map(cid => {
        const company = companies.find((c: Record<string, unknown>) => c.id === cid);
        const sub = subMap.get(cid);
        const prog = progressMap.get(cid);
        const tasks = taskCountMap.get(cid) || { total: 0, completed: 0 };
        const ai7d = aiUsageMap.get(cid) || 0;
        const insp7d = inspMap.get(cid) || 0;
        const lastLogin = lastActiveMap.get(cid) || null;
        const lastActiveDays = lastLogin
          ? Math.floor((now - new Date(lastLogin).getTime()) / (24 * 3600 * 1000))
          : null;

        const healthStatus = calcHealthStatus(ai7d, insp7d, lastActiveDays);
        const health = HEALTH_LABEL[healthStatus];

        const completionRate = tasks.total > 0
          ? Math.round((tasks.completed / tasks.total) * 100)
          : (prog ? Math.round(((prog.completed_days as number) / (prog.total_days as number)) * 100) : 0);

        // 任务状态：有任务数据则显示完成率，无数据则标记"待开通"
        const taskStatus = tasks.total > 0
          ? `${completionRate}%`
          : (prog ? `${completionRate}%` : '待开通');

        return {
          id: cid,
          name: (company?.name as string) || '-',
          service_level: company?.service_level || '-',
          plan: sub?.plan || '-',
          plan_end: sub?.plan_end || null,
          current_day: (prog?.current_day as number) || 0,
          total_days: (prog?.total_days as number) || 0,
          completed_days: (prog?.completed_days as number) || 0,
          task_total: tasks.total,
          task_completed: tasks.completed,
          task_completion_rate: completionRate,
          task_status: taskStatus,
          ai_usage_7d: ai7d,
          inspection_7d: insp7d,
          last_active: lastLogin,
          last_active_days: lastActiveDays,
          health_status: healthStatus,
          health_emoji: health.emoji,
          health_label: health.label,
          health_color: health.color,
        };
      });

      // Sort: abnormal first, then attention, then normal
      const order = { abnormal: 0, attention: 1, normal: 2 };
      clients.sort((a, b) => (order[a.health_status as keyof typeof order] ?? 3) - (order[b.health_status as keyof typeof order] ?? 3));

      return NextResponse.json({ data: clients, total: clients.length });
    }

    // ── Single client detail ──
    if (action === 'client-detail') {
      const companyId = searchParams.get('id');
      if (!companyId) {
        return NextResponse.json({ error: '缺少客户ID' }, { status: 400 });
      }

      // 1. Company info
      const { data: company, error: compErr } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      if (compErr) throw compErr;

      // 2. Subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .single();

      // 3. AI usage trend (last 30 days, by day)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { data: aiRecords } = await supabase
        .from('problem_solutions')
        .select('created_at, category')
        .eq('company_id', companyId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });

      // Group by date
      const aiTrend: Record<string, { count: number; categories: string[] }> = {};
      (aiRecords || []).forEach((r: Record<string, unknown>) => {
        const dateStr = new Date(r.created_at as string).toISOString().split('T')[0];
        if (!aiTrend[dateStr]) aiTrend[dateStr] = { count: 0, categories: [] };
        aiTrend[dateStr].count++;
        if (r.category) aiTrend[dateStr].categories.push(r.category as string);
      });

      // 4. Recent 5 inspections
      const { data: recentInspections } = await supabase
        .from('quality_inspections')
        .select('id, staff_id, total_score, comment, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);

      // 5. Onboarding tasks completion (compatible with missing table)
      let tasks: Record<string, unknown>[] = [];
      let progress: Record<string, unknown> | null = null;
      try {
        const { data: taskData } = await supabase
          .from('onboarding_tasks')
          .select('id, day, title, task_type, is_completed, completed_at')
          .eq('company_id', companyId)
          .order('day', { ascending: true });
        tasks = (taskData || []) as Record<string, unknown>[];
      } catch {
        console.warn('onboarding_tasks表不存在或查询失败，跳过任务数据');
      }

      try {
        const { data: progData } = await supabase
          .from('onboarding_progress')
          .select('*')
          .eq('company_id', companyId)
          .single();
        progress = progData as Record<string, unknown> | null;
      } catch {
        console.warn('onboarding_progress表不存在或查询失败，跳过进度数据');
      }

      const taskStatus = tasks.length > 0
        ? `${Math.round((tasks.filter(t => t.is_completed).length / tasks.length) * 100)}%`
        : (progress ? `${Math.round(((progress.completed_days as number || 0) / (progress.total_days as number || 1)) * 100)}%` : '待开通');

      // 6. Users in this company
      const { data: companyUsers } = await supabase
        .from('users')
        .select('id, email, display_name, role, last_login_at, status')
        .eq('company_id', companyId);

      // 7. Recent notifications (as activity log)
      const { data: recentNotes } = await supabase
        .from('notifications')
        .select('id, type, title, content, created_at')
        .eq('company_id', companyId)
        .in('type', ['consultant_note', 'renewal_reminder'])
        .order('created_at', { ascending: false })
        .limit(10);

      // 8. Recent problem solutions (as operation log)
      const { data: recentOps } = await supabase
        .from('problem_solutions')
        .select('id, query, category, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Merge and sort activity logs
      const activityLogs = [
        ...(recentNotes || []).map((n: Record<string, unknown>) => ({
          id: n.id,
          type: n.type as string,
          title: n.title as string,
          content: n.content as string,
          created_at: n.created_at as string,
          source: 'notification' as const,
        })),
        ...(recentOps || []).map((o: Record<string, unknown>) => ({
          id: o.id,
          type: 'ai_query' as string,
          title: (o.category as string) || 'AI诊断',
          content: (o.query as string) || '',
          created_at: o.created_at as string,
          source: 'ai' as const,
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
       .slice(0, 10);

      return NextResponse.json({
        data: {
          company,
          subscription: sub || null,
          ai_trend: aiTrend,
          recent_inspections: recentInspections || [],
          onboarding_tasks: tasks || [],
          onboarding_progress: progress || null,
          task_status: taskStatus,
          users: companyUsers || [],
          activity_logs: activityLogs,
        },
      });
    }

    // ── Insights for consultant dashboard ──
    if (action === 'insights') {
      // 1. Get active subscribed companies
      const { data: companies, error: compErr } = await supabase
        .from('companies')
        .select('id, name')
        .eq('status', 'active');
      if (compErr) throw compErr;

      const companyIds = (companies || []).map((c: Record<string, unknown>) => c.id as string);
      if (companyIds.length === 0) {
        return NextResponse.json({ insights: [] });
      }

      // Filter to only subscribed companies
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('company_id')
        .in('company_id', companyIds)
        .eq('status', 'active');
      const activeCompanyIds = (subs || []).map((s: Record<string, unknown>) => s.company_id as string);

      if (activeCompanyIds.length === 0) {
        return NextResponse.json({ insights: [] });
      }

      const insights: Array<{
        id: string;
        priority: 'P0' | 'P1' | 'P2';
        type: string;
        message: string;
        link: string;
        company_ids: string[];
        company_names: string[];
      }> = [];

      // ── Rule 1: KPI达标率 < 80% ──
      try {
        const { data: kpiRecords } = await supabase
          .from('kpi_records')
          .select('company_id, achievement_rate, period')
          .in('company_id', activeCompanyIds)
          .order('period', { ascending: false });

        if (kpiRecords && kpiRecords.length > 0) {
          // Get latest period per company
          const latestKpi = new Map<string, { rate: number; period: string }>();
          (kpiRecords as Record<string, unknown>[]).forEach((r) => {
            const cid = r.company_id as string;
            if (!latestKpi.has(cid)) {
              latestKpi.set(cid, { rate: (r.achievement_rate as number) || 0, period: r.period as string });
            }
          });

          const lowKpiCompanies: string[] = [];
          let minRate = 100;
          latestKpi.forEach((val, cid) => {
            if (val.rate < 80) {
              lowKpiCompanies.push(cid);
              minRate = Math.min(minRate, val.rate);
            }
          });

          if (lowKpiCompanies.length > 0) {
            const names = lowKpiCompanies.map(cid => companies?.find((c: Record<string, unknown>) => c.id === cid)?.name || '').filter(Boolean);
            insights.push({
              id: 'kpi-low',
              priority: 'P1',
              type: 'kpi',
              message: `${lowKpiCompanies.length}家企业KPI达标率低于80%（最低${minRate}%），建议跟进`,
              link: '/kpi',
              company_ids: lowKpiCompanies,
              company_names: names as string[],
            });
          }
        }
      } catch {
        console.warn('kpi_records表不存在，跳过KPI洞察');
      }

      // ── Rule 2: 成本预警未复盘 ──
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
        const { data: costAlerts } = await supabase
          .from('cost_alerts')
          .select('company_id, id, alert_date')
          .in('company_id', activeCompanyIds)
          .gte('alert_date', thirtyDaysAgo);

        if (costAlerts && costAlerts.length > 0) {
          const alertIds = (costAlerts as Record<string, unknown>[]).map(a => a.id as string);
          const alertCompanyIds = [...new Set((costAlerts as Record<string, unknown>[]).map(a => a.company_id as string))];

          // Check which have reviews
          const { data: reviews } = await supabase
            .from('cost_alert_reviews')
            .select('alert_date, reason_category')
            .in('company_id', alertCompanyIds);

          const reviewedCount = reviews?.length || 0;
          const unreviewedCount = alertIds.length - reviewedCount;

          if (unreviewedCount > 0) {
            insights.push({
              id: 'cost-unreviewed',
              priority: 'P0',
              type: 'cost-alert',
              message: `有${unreviewedCount}条成本预警未复盘，建议及时记录原因`,
              link: '/cost-alert',
              company_ids: alertCompanyIds,
              company_names: alertCompanyIds.map(cid => companies?.find((c: Record<string, unknown>) => c.id === cid)?.name || '').filter(Boolean) as string[],
            });
          }
        }
      } catch {
        console.warn('cost_alerts表不存在，跳过成本预警洞察');
      }

      // ── Rule 3: 质检低分趋势 ──
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();

        const { data: recentInspections } = await supabase
          .from('quality_inspections')
          .select('company_id, total_score, created_at')
          .in('company_id', activeCompanyIds)
          .gte('created_at', fourteenDaysAgo);

        if (recentInspections && recentInspections.length > 0) {
          const now = Date.now();
          const sevenDays = 7 * 24 * 3600 * 1000;

          const recent7 = (recentInspections as Record<string, unknown>[]).filter(r => new Date(r.created_at as string).getTime() >= now - sevenDays);
          const prev7 = (recentInspections as Record<string, unknown>[]).filter(r => new Date(r.created_at as string).getTime() < now - sevenDays);

          const avg7 = recent7.length > 0 ? recent7.reduce((s, r) => s + ((r.total_score as number) || 0), 0) / recent7.length : 0;
          const avgPrev = prev7.length > 0 ? prev7.reduce((s, r) => s + ((r.total_score as number) || 0), 0) / prev7.length : 0;

          if (avgPrev > 0 && avg7 < avgPrev) {
            const dropPct = Math.round(((avgPrev - avg7) / avgPrev) * 100);
            if (dropPct >= 5) {
              insights.push({
                id: 'quality-drop',
                priority: dropPct >= 15 ? 'P0' : 'P1',
                type: 'quality',
                message: `最近7天质检平均分下降${dropPct}%，建议关注服务质量`,
                link: '/kpi',
                company_ids: activeCompanyIds,
                company_names: [],
              });
            }
          }
        }
      } catch {
        console.warn('quality_inspections表不存在，跳过质检洞察');
      }

      // ── Rule 4: 新人培训进度慢 ──
      try {
        const { data: agents } = await supabase
          .from('agents')
          .select('company_id, name, training_stage, hire_date, status')
          .in('company_id', activeCompanyIds)
          .eq('status', '试用');

        if (agents && agents.length > 0) {
          // Agents in trial with training still at basic stage (progress < 50%)
          const slowTrainees = (agents as Record<string, unknown>[]).filter(a => {
            const stage = a.training_stage as string;
            return stage === '基础' || stage === '售中';
          });

          if (slowTrainees.length > 0) {
            const names = slowTrainees.map(a => a.name as string).filter(Boolean);
            insights.push({
              id: 'training-slow',
              priority: 'P2',
              type: 'training',
              message: `${slowTrainees.length}位新人培训进度低于50%，建议加强带教`,
              link: '/newbie-training?module=0',
              company_ids: [...new Set(slowTrainees.map(a => a.company_id as string))],
              company_names: names,
            });
          }
        }
      } catch {
        console.warn('agents表不存在，跳过培训进度洞察');
      }

      // ── Rule 5: 工单积压 ──
      try {
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
        const { data: overdueTickets } = await supabase
          .from('tickets')
          .select('company_id, id, category, created_at')
          .in('company_id', activeCompanyIds)
          .neq('status', 'closed')
          .lt('created_at', fortyEightHoursAgo);

        if (overdueTickets && overdueTickets.length > 0) {
          insights.push({
            id: 'ticket-overdue',
            priority: overdueTickets.length >= 5 ? 'P0' : 'P1',
            type: 'work-order',
            message: `有${overdueTickets.length}条工单超过48小时未处理，建议优先跟进`,
            link: '/work-orders',
            company_ids: [...new Set((overdueTickets as Record<string, unknown>[]).map(t => t.company_id as string))],
            company_names: [...new Set((overdueTickets as Record<string, unknown>[]).map(t => t.company_id as string))].map(cid => companies?.find((c: Record<string, unknown>) => c.id === cid)?.name || '').filter(Boolean) as string[],
          });
        }
      } catch {
        console.warn('tickets表不存在，跳过工单洞察');
      }

      // ── Rule 6: AI使用率下降 ──
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();

        const { data: recentAi } = await supabase
          .from('problem_solutions')
          .select('company_id, created_at')
          .in('company_id', activeCompanyIds)
          .gte('created_at', fourteenDaysAgo);

        if (recentAi && recentAi.length > 0) {
          const now = Date.now();
          const sevenDays = 7 * 24 * 3600 * 1000;

          const last7 = (recentAi as Record<string, unknown>[]).filter(r => new Date(r.created_at as string).getTime() >= now - sevenDays);
          const prev7 = (recentAi as Record<string, unknown>[]).filter(r => new Date(r.created_at as string).getTime() < now - sevenDays);

          if (prev7.length > 0 && last7.length < prev7.length) {
            const dropPct = Math.round(((prev7.length - last7.length) / prev7.length) * 100);
            if (dropPct >= 20) {
              insights.push({
                id: 'ai-usage-drop',
                priority: 'P2',
                type: 'ai-usage',
                message: `团队AI使用次数环比下降${dropPct}%，建议鼓励团队多用AI提效`,
                link: '/ai-assistant',
                company_ids: activeCompanyIds,
                company_names: [],
              });
            }
          }
        }
      } catch {
        console.warn('problem_solutions表不存在，跳过AI使用洞察');
      }

      // Sort by priority
      const priorityOrder = { P0: 0, P1: 1, P2: 2 };
      insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      return NextResponse.json({ insights });
    }

    return NextResponse.json({ error: '未知action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('顾问API错误:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── POST ───
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  const body = await request.json();
  const { action } = body;

  try {
    // ── Add consultant note ──
    if (action === 'add-note') {
      const { company_id, content, operator_name } = body;
      if (!company_id || !content) {
        return NextResponse.json({ error: '缺少company_id或content' }, { status: 400 });
      }

      const { error: insertErr } = await supabase
        .from('notifications')
        .insert({
          company_id,
          type: 'consultant_note',
          title: `顾问备注 - ${operator_name || '系统'}`,
          content,
          is_read: false,
        });
      if (insertErr) throw insertErr;

      return NextResponse.json({ success: true, message: '备注已添加' });
    }

    // ── Send renewal reminder ──
    if (action === 'remind-renewal') {
      const { company_id } = body;
      if (!company_id) {
        return NextResponse.json({ error: '缺少company_id' }, { status: 400 });
      }

      // Get subscription info for renewal date
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan, plan_end')
        .eq('company_id', company_id)
        .eq('status', 'active')
        .single();

      const planEnd = sub?.plan_end || '未知';
      const planName = sub?.plan || '当前套餐';
      const daysLeft = sub?.plan_end
        ? Math.ceil((new Date(sub.plan_end as string).getTime() - Date.now()) / (24 * 3600 * 1000))
        : null;

      const content = daysLeft !== null
        ? `您的${planName}将于${planEnd}到期，剩余${daysLeft}天。为保证服务不中断，请及时续订。如有疑问，请联系您的专属顾问。`
        : `您的${planName}即将到期，为保证服务不中断，请及时续订。`;

      const { error: insertErr } = await supabase
        .from('notifications')
        .insert({
          company_id,
          type: 'renewal_reminder',
          title: '订阅提醒',
          content,
          is_read: false,
        });
      if (insertErr) throw insertErr;

      return NextResponse.json({ success: true, message: '订阅提醒已发送' });
    }

    return NextResponse.json({ error: '未知action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('顾问API POST错误:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
