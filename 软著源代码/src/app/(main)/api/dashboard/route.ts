import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/api-auth';
import { cachedFetch, cacheHeaders, TTL } from '@/lib/api-cache';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  const client = getSupabaseClient();
  const companyId = auth.companyId;
  const isAdmin = auth.role === 'admin';
  const cacheKey = `dashboard:${isAdmin ? 'admin' : companyId}`;

  const data = await cachedFetch(cacheKey, async () => {

  const usersCountQuery = isAdmin
    ? client.from('users').select('*', { count: 'exact', head: true })
    : client.from('users').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
  const agentsCountQuery = isAdmin
    ? client.from('agents').select('*', { count: 'exact', head: true })
    : client.from('agents').select('*', { count: 'exact', head: true }).eq('company_id', companyId);

  const [companiesRes, usersRes, agentsRes] = await Promise.all([
    client.from('companies').select('*', { count: 'exact', head: true }),
    usersCountQuery,
    agentsCountQuery,
  ]);

  if (companiesRes.error) throw new Error(`统计企业失败: ${companiesRes.error.message}`);
  if (usersRes.error) throw new Error(`统计用户失败: ${usersRes.error.message}`);
  if (agentsRes.error) throw new Error(`统计客服失败: ${agentsRes.error.message}`);

  // 获取各状态统计
  const agentStatusQuery = isAdmin
    ? client.from('agents').select('status, position, training_stage')
    : client.from('agents').select('status, position, training_stage').eq('company_id', companyId);
  const userRoleQuery = isAdmin
    ? client.from('users').select('role')
    : client.from('users').select('role').eq('company_id', companyId);

  const [companyStatusRes, agentStatusRes, userRoleRes] = await Promise.all([
    client.from('companies').select('status'),
    agentStatusQuery,
    userRoleQuery,
  ]);

  const companyStats = {
    total: companiesRes.count || 0,
    active: companyStatusRes.data?.filter((c: { status: string }) => c.status === 'active').length || 0,
    expired: companyStatusRes.data?.filter((c: { status: string }) => c.status === 'expired').length || 0,
  };

  const agentStats = {
    total: agentsRes.count || 0,
    在职: agentStatusRes.data?.filter((a: { status: string }) => a.status === '在职').length || 0,
    离职: agentStatusRes.data?.filter((a: { status: string }) => a.status === '离职').length || 0,
    试用: agentStatusRes.data?.filter((a: { status: string }) => a.status === '试用').length || 0,
  };

  const userStats = {
    total: usersRes.count || 0,
    admin: userRoleRes.data?.filter((u: { role: string }) => u.role === 'admin').length || 0,
    enterprise_admin: userRoleRes.data?.filter((u: { role: string }) => u.role === 'enterprise_admin').length || 0,
    enterprise_manager: userRoleRes.data?.filter((u: { role: string }) => u.role === 'enterprise_manager').length || 0,
    staff: userRoleRes.data?.filter((u: { role: string }) => u.role === 'staff').length || 0,
  };

  // Usage stats from Supabase
  const usageStats = {
    aiUsageCount: 0,
    yesterdayCount: 0,
    weeklyUsageCount: 0,
    topCategories: [] as { name: string; count: number }[],
    scriptUsageRate: '0%',
  };

  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // AI usage today
    let aiQuery = client
      .from('problem_solutions')
      .select('category, diagnosis_type')
      .gte('created_at', today);
    if (companyId) aiQuery = aiQuery.eq('company_id', companyId);
    const aiRes = await aiQuery;

    if (!aiRes.error && aiRes.data) {
      usageStats.aiUsageCount = aiRes.data.length;

      // Top 3 categories (use diagnosis_type if category is empty)
      const catCount: Record<string, number> = {};
      aiRes.data.forEach((r: { category: string | null; diagnosis_type: string | null }) => {
        const cat = r.category || r.diagnosis_type || '其他';
        catCount[cat] = (catCount[cat] || 0) + 1;
      });
      usageStats.topCategories = Object.entries(catCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));
    }

    // Yesterday AI usage
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    let yesterdayQuery = client
      .from('problem_solutions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', yesterday)
      .lt('created_at', today);
    if (companyId) yesterdayQuery = yesterdayQuery.eq('company_id', companyId);
    const yesterdayRes = await yesterdayQuery;
    if (!yesterdayRes.error) {
      usageStats.yesterdayCount = yesterdayRes.count || 0;
    }

    // Weekly AI usage
    let weekQuery = client
      .from('problem_solutions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo);
    if (companyId) weekQuery = weekQuery.eq('company_id', companyId);
    const weekRes = await weekQuery;
    if (!weekRes.error) {
      usageStats.weeklyUsageCount = weekRes.count || 0;
    }

    // Script usage rate (solutions where solution_used = true)
    let scriptQuery = client
      .from('problem_solutions')
      .select('solution_used')
      .gte('created_at', today);
    if (companyId) scriptQuery = scriptQuery.eq('company_id', companyId);
    const scriptRes = await scriptQuery;

    if (!scriptRes.error && scriptRes.data && scriptRes.data.length > 0) {
      const used = scriptRes.data.filter((r: { solution_used: boolean }) => r.solution_used).length;
      usageStats.scriptUsageRate = Math.round((used / scriptRes.data.length) * 100) + '%';
    }
  } catch {
    // Non-critical, keep defaults
  }

  // Expiring subscriptions (admin only)
  let expiringSubscriptions: Array<{ companyId: string; companyName: string; plan: string; daysLeft: number; endDate: string }> = [];
  if (isAdmin) {
    try {
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      const subRes = await client
        .from('subscriptions')
        .select('company_id, plan, plan_end')
        .lte('plan_end', sevenDaysLater.toISOString().split('T')[0])
        .gte('plan_end', new Date().toISOString().split('T')[0]);

      if (!subRes.error && subRes.data) {
        const companyIds = subRes.data.map((s: { company_id: string }) => s.company_id);
        if (companyIds.length > 0) {
          const compRes = await client.from('companies').select('id, name').in('id', companyIds);
          if (!compRes.error && compRes.data) {
            const companyMap = Object.fromEntries(compRes.data.map((c: { id: string; name: string }) => [c.id, c.name]));
            const now = new Date();
            expiringSubscriptions = subRes.data.map((s: { company_id: string; plan: string; plan_end: string }) => ({
              companyId: s.company_id,
              companyName: companyMap[s.company_id] || '未知企业',
              plan: s.plan,
              endDate: s.plan_end,
              daysLeft: Math.ceil((new Date(s.plan_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            }));
          }
        }
      }
    } catch {
      // Non-critical
    }
  }

  }, TTL.SHORT * 2);

  return NextResponse.json(data, { headers: cacheHeaders({ maxAge: 120, staleWhileRevalidate: 60 }) });
}
