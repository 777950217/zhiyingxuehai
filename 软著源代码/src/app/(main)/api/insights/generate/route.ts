import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/api-auth';
import { INSIGHT_TYPES, type InsightType } from '@/lib/insights';

interface InsightRow {
  id: string;
  company_id: string;
  user_id: string | null;
  insight_type: string;
  title: string;
  summary: string;
  detail: Record<string, unknown>;
  priority: string;
  is_read: boolean;
  created_at: string;
}

// POST /api/insights/generate - 生成洞察
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  const client = getSupabaseClient();
  const companyId = auth.companyId;
  const generated: InsightType[] = [];
  const skipped: { type: string; reason: string }[] = [];

  // 辅助：检查今日是否已存在同type的洞察（同天不重复生成）
  async function hasTodayInsight(type: string): Promise<boolean> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data } = await client
      .from('insight_notifications')
      .select('id')
      .eq('company_id', companyId)
      .eq('insight_type', type)
      .gte('created_at', todayStart.toISOString())
      .limit(1);
    return !!(data && data.length > 0);
  }

  // 辅助：创建洞察
  async function createInsight(params: {
    type: InsightType;
    title: string;
    summary: string;
    detail?: Record<string, unknown>;
    priority?: string;
  }) {
    // 去重：同type同天不重复
    if (await hasTodayInsight(params.type)) {
      skipped.push({ type: params.type, reason: '今日已生成过同类洞察' });
      return;
    }

    const { error } = await client.from('insight_notifications').insert({
      company_id: companyId,
      insight_type: params.type,
      title: params.title,
      summary: params.summary,
      detail: params.detail || {},
      priority: params.priority || 'normal',
      is_read: false,
    });
    if (!error) {
      generated.push(params.type);
    }
  }

  try {
    // ─── 1. 质检下滑 (quality_decline) ───
    // 对比最近7天vs前7天质检评分，下降>10%
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const { data: recentQuality } = await client
      .from('quality_scores')
      .select('score')
      .eq('company_id', companyId)
      .gte('created_at', sevenDaysAgo.toISOString());

    const { data: prevQuality } = await client
      .from('quality_scores')
      .select('score')
      .eq('company_id', companyId)
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString());

    const recentAvg = (recentQuality || []).reduce((s: number, r: { score: number }) => s + r.score, 0) / ((recentQuality || []).length || 1);
    const prevAvg = (prevQuality || []).reduce((s: number, r: { score: number }) => s + r.score, 0) / ((prevQuality || []).length || 1);

    const declinePct = prevAvg > 0 ? Math.round(((prevAvg - recentAvg) / prevAvg) * 100) : 0;

    if (prevAvg > 0 && recentAvg < prevAvg * 0.9) {
      await createInsight({
        type: INSIGHT_TYPES.QUALITY_DECLINE,
        title: `质检评分近7天下降${declinePct}%，需及时关注`,
        summary: `近7天平均质检评分${recentAvg.toFixed(1)}分，较前7天${prevAvg.toFixed(1)}分下降${declinePct}%。服务质量出现明显波动，建议尽快定位原因并干预。`,
        detail: { recentAvg: Number(recentAvg.toFixed(1)), prevAvg: Number(prevAvg.toFixed(1)), declinePct },
        priority: 'high',
      });
    } else if (recentQuality && recentQuality.length > 0) {
      skipped.push({ type: INSIGHT_TYPES.QUALITY_DECLINE, reason: `下降幅度未超10%阈值（${declinePct}%）` });
    }

    // ─── 2. KPI预警 (kpi_warning) ───
    // KPI完成率<70%
    const { data: kpiRecords } = await client
      .from('kpi_records')
      .select('completion_rate, period')
      .eq('company_id', companyId)
      .order('period', { ascending: false })
      .limit(1);

    if (kpiRecords && kpiRecords.length > 0) {
      const completionRate = (kpiRecords[0] as { completion_rate?: number }).completion_rate;
      if (completionRate !== undefined && completionRate < 70) {
        await createInsight({
          type: INSIGHT_TYPES.KPI_WARNING,
          title: `KPI完成率仅${completionRate}%，低于70%预警线`,
          summary: `当前KPI完成率为${completionRate}%，低于70%目标线。长期低完成率可能影响团队士气和服务质量，建议检查目标设定并调整执行策略。`,
          detail: { completionRate, period: (kpiRecords[0] as { period?: string }).period },
          priority: 'high',
        });
      } else {
        skipped.push({ type: INSIGHT_TYPES.KPI_WARNING, reason: `完成率≥70%（${completionRate ?? 'N/A'}%）` });
      }
    }

    // ─── 3. 赔付飙升 (compensation_spike) ───
    // 对比最近7天vs前7天赔付金额，上升>30%
    const { data: recentCompensation } = await client
      .from('payment_orders')
      .select('amount')
      .eq('company_id', companyId)
      .gte('created_at', sevenDaysAgo.toISOString());

    const { data: prevCompensation } = await client
      .from('payment_orders')
      .select('amount')
      .eq('company_id', companyId)
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString());

    const recentTotal = (recentCompensation || []).reduce((s: number, r: { amount: number }) => s + (r.amount || 0), 0);
    const prevTotal = (prevCompensation || []).reduce((s: number, r: { amount: number }) => s + (r.amount || 0), 0);

    if (prevTotal > 0 && recentTotal > prevTotal * 1.3) {
      const growthRate = Math.round(((recentTotal - prevTotal) / prevTotal) * 100);
      await createInsight({
        type: INSIGHT_TYPES.COMPENSATION_SPIKE,
        title: `近7天赔付金额飙升${growthRate}%，需重点关注`,
        summary: `近7天赔付${recentTotal.toFixed(0)}元，前7天${prevTotal.toFixed(0)}元，环比增长${growthRate}%。赔付上升意味着售后成本增加、客户满意度可能下降。`,
        detail: { recentTotal: Number(recentTotal.toFixed(0)), prevTotal: Number(prevTotal.toFixed(0)), growthRate },
        priority: 'high',
      });
    } else if (prevTotal > 0) {
      const growthRate = prevTotal > 0 ? Math.round(((recentTotal - prevTotal) / prevTotal) * 100) : 0;
      skipped.push({ type: INSIGHT_TYPES.COMPENSATION_SPIKE, reason: `增长未超30%阈值（${growthRate}%）` });
    }

    // ─── 4. 规则变动 (rule_change) ───
    // phrase_library中规则类目检测到最近7天新增条目
    const { data: recentRules } = await client
      .from('phrase_library')
      .select('id, title, created_at')
      .eq('company_id', companyId)
      .eq('category', '判断规则')
      .gte('created_at', sevenDaysAgo.toISOString())
      .limit(5);

    if (recentRules && recentRules.length > 0) {
      await createInsight({
        type: INSIGHT_TYPES.RULE_CHANGE,
        title: `近7天新增${recentRules.length}条规则变动，请及时关注`,
        summary: `知识库中规则类目近7天新增${recentRules.length}条内容，规则变动可能影响运营和话术，建议及时传达团队。`,
        detail: { newRuleCount: recentRules.length, ruleTitles: recentRules.map((r: { title?: string }) => r.title).filter(Boolean) },
        priority: 'normal',
      });
    } else {
      skipped.push({ type: INSIGHT_TYPES.RULE_CHANGE, reason: '近7天无规则变动' });
    }

    // ─── 5. 激励趋势 (incentive_trend) ───
    // 正向激励使用率相比上周变化
    const { data: recentIncentive } = await client
      .from('incentive_records')
      .select('type, points')
      .eq('company_id', companyId)
      .gte('created_at', sevenDaysAgo.toISOString());

    const { data: prevIncentive } = await client
      .from('incentive_records')
      .select('type, points')
      .eq('company_id', companyId)
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString());

    if (recentIncentive && recentIncentive.length > 0) {
      const recentPositive = (recentIncentive as { type: string; points: number }[]).filter(r => r.type === 'positive').length;
      const recentAll = recentIncentive.length;
      const recentRate = Math.round((recentPositive / recentAll) * 100);

      const prevPositive = (prevIncentive as { type: string; points: number }[] || []).filter(r => r.type === 'positive').length;
      const prevAll = (prevIncentive || []).length;
      const prevRate = prevAll > 0 ? Math.round((prevPositive / prevAll) * 100) : 0;

      if (recentRate < prevRate - 10) {
        await createInsight({
          type: INSIGHT_TYPES.INCENTIVE_TREND,
          title: `正向激励占比下降至${recentRate}%，需优化激励策略`,
          summary: `近7天正向激励占比${recentRate}%，前7天${prevRate}%，下降${prevRate - recentRate}个百分点。负向激励偏多可能影响团队士气。`,
          detail: { recentRate, prevRate, change: recentRate - prevRate },
          priority: 'normal',
        });
      } else {
        skipped.push({ type: INSIGHT_TYPES.INCENTIVE_TREND, reason: `正向激励占比未显著下降（${recentRate}% vs ${prevRate}%）` });
      }
    } else {
      skipped.push({ type: INSIGHT_TYPES.INCENTIVE_TREND, reason: '近7天无激励记录' });
    }

    // ─── 6. 学习停滞 (learning_stagnation) ───
    // 团队中有员工7天学习进度无变化
    const { data: stagnantUsers } = await client
      .from('course_progress')
      .select('user_id, last_studied_at')
      .eq('company_id', companyId)
      .lt('last_studied_at', sevenDaysAgo.toISOString())
      .limit(10);

    if (stagnantUsers && stagnantUsers.length > 0) {
      await createInsight({
        type: INSIGHT_TYPES.LEARNING_STAGNATION,
        title: `${stagnantUsers.length}名员工7天未学习，学习进度停滞`,
        summary: `团队中有${stagnantUsers.length}名员工超过7天没有学习记录，持续学习是团队成长的关键，建议设定每周学习计划并督促执行。`,
        detail: { stagnantCount: stagnantUsers.length, stagnantUserIds: stagnantUsers.map((u: { user_id: string }) => u.user_id) },
        priority: 'normal',
      });
    } else {
      skipped.push({ type: INSIGHT_TYPES.LEARNING_STAGNATION, reason: '无停滞员工' });
    }

    // ─── 7. 知识库过期 (knowledge_expiry) ───
    // 有话术将在30天内过期，或已有话术过期
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { data: expiringPhrases } = await client
      .from('phrase_library')
      .select('id, title, expires_at')
      .eq('company_id', companyId)
      .not('expires_at', 'is', null)
      .lte('expires_at', thirtyDaysLater.toISOString());

    const expiredCount = (expiringPhrases || []).filter((r: { expires_at: string }) => new Date(r.expires_at) < now).length;
    const expiringCount = (expiringPhrases || []).length - expiredCount;

    if (expiredCount > 0 || expiringCount > 0) {
      const titleParts: string[] = [];
      if (expiredCount > 0) titleParts.push(`${expiredCount}条已过期`);
      if (expiringCount > 0) titleParts.push(`${expiringCount}条即将过期`);
      await createInsight({
        type: INSIGHT_TYPES.KNOWLEDGE_EXPIRY,
        title: `知识库话术${titleParts.join('，')}，建议更新`,
        summary: `您的知识库中有${titleParts.join('，')}的话术内容。过期话术可能已不适用于当前业务场景，建议及时更新或删除。`,
        detail: { expiredCount, expiringCount, expiringTitles: (expiringPhrases || []).slice(0, 5).map((r: { title?: string }) => r.title).filter(Boolean) },
        priority: expiredCount > 0 ? 'high' : 'normal',
      });
    } else {
      skipped.push({ type: INSIGHT_TYPES.KNOWLEDGE_EXPIRY, reason: '无过期或即将过期的话术' });
    }

    // ─── 8. 知识库停滞 (knowledge_stagnation) ───
    // 7天内无新增/更新知识库条目
    const { data: recentPhrases } = await client
      .from('phrase_library')
      .select('id, created_at')
      .eq('company_id', companyId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .limit(1);

    if (!recentPhrases || recentPhrases.length === 0) {
      // 检查是否有知识库条目（避免空库误报）
      const { data: anyPhrases } = await client
        .from('phrase_library')
        .select('id')
        .eq('company_id', companyId)
        .limit(1);

      if (anyPhrases && anyPhrases.length > 0) {
        await createInsight({
          type: INSIGHT_TYPES.KNOWLEDGE_STAGNATION,
          title: '知识库已7天未更新，建议补充新内容',
          summary: '知识库长期不更新可能导致话术陈旧、信息过时。建议定期添加新的话术、攻略和案例，保持知识库活力。',
          detail: { daysSinceLastUpdate: 7 },
          priority: 'normal',
        });
      } else {
        skipped.push({ type: INSIGHT_TYPES.KNOWLEDGE_STAGNATION, reason: '知识库为空' });
      }
    } else {
      skipped.push({ type: INSIGHT_TYPES.KNOWLEDGE_STAGNATION, reason: '近7天有更新' });
    }

    // ─── 9. 7天未登录提醒 (login_stagnation) ───
    // 检查公司成员中7天未登录的用户
    const { data: inactiveUsers } = await client
      .from('users')
      .select('id, display_name, last_login_at')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .lt('last_login_at', sevenDaysAgo.toISOString());

    if (inactiveUsers && inactiveUsers.length > 0) {
      const names = inactiveUsers.slice(0, 3).map((u: { display_name: string }) => u.display_name || '用户').join('、');
      const more = inactiveUsers.length > 3 ? `等${inactiveUsers.length}人` : '';
      await createInsight({
        type: INSIGHT_TYPES.LOGIN_STAGNATION,
        title: `${inactiveUsers.length}位成员7天未登录系统`,
        summary: `${names}${more}已超过7天未登录，长期不使用可能导致业务脱节。建议通过任务分配或提醒促进团队活跃度。`,
        detail: { inactiveCount: inactiveUsers.length, inactiveUsers: inactiveUsers.map((u: { id: string; display_name: string; last_login_at: string | null }) => ({ id: u.id, name: u.display_name, lastLogin: u.last_login_at })) },
        priority: 'normal',
      });
    } else {
      skipped.push({ type: INSIGHT_TYPES.LOGIN_STAGNATION, reason: '无7天未登录用户' });
    }

    return NextResponse.json({
      success: true,
      generated,
      skipped,
      count: generated.length,
      message: `生成${generated.length}条洞察，跳过${skipped.length}项`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: `生成洞察失败: ${message}` }, { status: 500 });
  }
}
