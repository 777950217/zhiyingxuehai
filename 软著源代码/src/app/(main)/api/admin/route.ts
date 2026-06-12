import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // ─── User list with search ───
    if (action === 'users') {
      const search = searchParams.get('search') || '';
      let query = supabase
        .from('users')
        .select('id, email, display_name, role, user_type, company_id, remaining_credits, status, last_login_at, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (search) {
        query = query.ilike('email', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with company name
      const companyIds = [...new Set(data?.map(u => u.company_id).filter(Boolean) || [])];
      const companyMap: Record<string, string> = {};
      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds);
        companies?.forEach(c => { companyMap[c.id] = c.name; });
      }

      const users = data?.map(u => ({
        ...u,
        company_name: u.company_id ? companyMap[u.company_id] || '-' : '-',
      }));

      return NextResponse.json({ data: users });
    }

    // ─── Recharge logs ───
    if (action === 'recharge-logs') {
      const { data, error } = await supabase
        .from('recharge_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // ─── Case management (problem_solutions with case fields) ───
    if (action === 'cases') {
      const filter = searchParams.get('filter') || 'all'; // all/pending/marked/synced
      let query = supabase
        .from('problem_solutions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter === 'pending') {
        query = query.eq('is_marked_as_case', false);
      } else if (filter === 'marked') {
        query = query.eq('is_marked_as_case', true);
      } else if (filter === 'synced') {
        query = query.not('script_id', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // ─── Dashboard overview (enhanced) ───
    if (action === 'dashboard') {
      const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        usersRes,
        companiesRes,
        progressRes,
        financeRes,
      ] = await Promise.all([
        supabase.from('users').select('id, role, created_at, last_login_at, status'),
        supabase.from('companies').select('id, name, plan, plan_end, status'),
        supabase.from('personal_learning_progress').select('user_id, learned'),
        supabase.from('finance_records').select('amount, created_at, plan').order('created_at', { ascending: false }).limit(100),
      ]);

      // Version distribution
      const personalCount = usersRes.data?.filter(u => u.role === 'personal_user').length || 0;
      const efficiencyCount = usersRes.data?.filter(u => u.role === 'efficiency_user').length || 0;
      const proCount = usersRes.data?.filter(u => u.role === 'enterprise_manager').length || 0;
      const flagshipCount = usersRes.data?.filter(u => u.role === 'enterprise_admin').length || 0;

      // Today new users
      const today = new Date().toISOString().substring(0, 10);
      const todayNew = usersRes.data?.filter(u => u.created_at?.substring(0, 10) === today).length || 0;

      // Active users (7 days)
      const activeUsers = usersRes.data?.filter(u => u.last_login_at && u.last_login_at >= sevenDaysAgo).length || 0;

      // Expiring companies (30 days)
      const expiring = companiesRes.data?.filter(c => c.plan_end && c.plan_end <= thirtyDaysLater && c.status === 'active') || [];

      // Course completion rate
      const totalProgress = progressRes.data?.length || 0;
      const learnedCount = progressRes.data?.filter(p => p.learned).length || 0;
      const completionRate = totalProgress > 0 ? Math.round((learnedCount / totalProgress) * 100) : 0;

      // 7-day trend
      const dailyNewUsers: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
        dailyNewUsers[d] = 0;
      }
      usersRes.data?.forEach(u => {
        const d = u.created_at?.substring(0, 10);
        if (d && d in dailyNewUsers) dailyNewUsers[d]++;
      });

      // Monthly revenue from finance_records
      const monthlyRevenue: Record<string, number> = {};
      financeRes.data?.forEach(r => {
        const m = r.created_at?.substring(0, 7) || 'unknown';
        monthlyRevenue[m] = (monthlyRevenue[m] || 0) + (Number(r.amount) || 0);
      });

      return NextResponse.json({
        versionDistribution: { personal: personalCount, efficiency: efficiencyCount, pro: proCount, flagship: flagshipCount, total: usersRes.data?.length || 0 },
        todayNew,
        activeUsers,
        expiringCompanies: expiring.map(c => ({ id: c.id, name: c.name, plan: c.plan, plan_end: c.plan_end })),
        completionRate,
        dailyNewUsers,
        monthlyRevenue,
        totalRevenue: financeRes.data?.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0,
      });
    }

    // ─── Customer list (enhanced with expiry) ───
    if (action === 'customers') {
      const search = searchParams.get('search') || '';
      const filter = searchParams.get('filter') || 'all'; // all | expiring | expired

      let query = supabase
        .from('users')
        .select('id, email, display_name, role, user_type, company_id, status, last_login_at, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (search) {
        query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
      }

      const { data: users, error } = await query;
      if (error) throw error;

      // Enrich with company info
      const companyIds = [...new Set(users?.map(u => u.company_id).filter(Boolean) || [])];
      const companyMap: Record<string, { name: string; plan: string; plan_end: string | null; contact_phone: string | null }> = {};
      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name, plan, plan_end, contact_phone')
          .in('id', companyIds);
        companies?.forEach(c => { companyMap[c.id] = { name: c.name, plan: c.plan, plan_end: c.plan_end, contact_phone: c.contact_phone }; });
      }

      let customers = users?.map(u => ({
        ...u,
        company_name: u.company_id ? companyMap[u.company_id]?.name || '-' : '-',
        company_plan: u.company_id ? companyMap[u.company_id]?.plan || '-' : '-',
        plan_end: u.company_id ? companyMap[u.company_id]?.plan_end || null : null,
        phone: u.company_id ? companyMap[u.company_id]?.contact_phone || null : null,
      })) || [];

      // Filter by expiry status
      const now = new Date().toISOString();
      const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      if (filter === 'expiring') {
        customers = customers.filter(c => c.plan_end && c.plan_end <= thirtyDaysLater && c.plan_end >= now);
      } else if (filter === 'expired') {
        customers = customers.filter(c => c.plan_end && c.plan_end < now);
      }

      return NextResponse.json({ data: customers });
    }

    // ─── Finance records ───
    if (action === 'finance-records') {
      const month = searchParams.get('month') || '';
      let query = supabase
        .from('finance_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (month) {
        query = query.gte('created_at', `${month}-01`).lt('created_at', `${month}-32`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Monthly summary
      const monthlySummary: Record<string, { income: number; count: number }> = {};
      data?.forEach(r => {
        const m = r.created_at?.substring(0, 7) || 'unknown';
        if (!monthlySummary[m]) monthlySummary[m] = { income: 0, count: 0 };
        monthlySummary[m].income += Number(r.amount) || 0;
        monthlySummary[m].count++;
      });

      return NextResponse.json({ data, monthlySummary });
    }

    // ─── Redemption code stats ───
    if (action === 'code-stats') {
      const [allRes, usedRes, frozenRes] = await Promise.all([
        supabase.from('redemption_codes').select('id', { count: 'exact' }),
        supabase.from('redemption_codes').select('id, used_by, used_at, plan_type, code').eq('is_used', true).order('used_at', { ascending: false }).limit(50),
        supabase.from('redemption_codes').select('id').eq('status', 'frozen'),
      ]);

      // Enrich used codes with user info
      const usedByEmails: Record<string, string> = {};
      const usedByIds = usedRes.data?.map(c => c.used_by).filter(Boolean) || [];
      if (usedByIds.length > 0) {
        const { data: usedByUsers } = await supabase
          .from('users')
          .select('id, email, display_name')
          .in('id', usedByIds);
        usedByUsers?.forEach(u => { usedByEmails[u.id] = u.email || u.display_name || '-'; });
      }

      const usedRecords = usedRes.data?.map(c => ({
        ...c,
        used_by_email: c.used_by ? usedByEmails[c.used_by] || '-' : '-',
      }));

      return NextResponse.json({
        total: allRes.count || 0,
        used: usedRes.data?.length || 0,
        unused: (allRes.count || 0) - (usedRes.data?.length || 0) - (frozenRes.data?.length || 0),
        frozen: frozenRes.data?.length || 0,
        usedRecords,
      });
    }

    // ─── Statistics (original, keep for backward compat) ───
    if (action === 'stats') {
      const [usersRes, rechargeRes, casesRes] = await Promise.all([
        supabase.from('users').select('id, role, created_at', { count: 'exact' }),
        supabase.from('recharge_logs').select('amount, created_at'),
        supabase.from('problem_solutions').select('id, is_marked_as_case', { count: 'exact' }),
      ]);

      const totalUsers = usersRes.count || 0;
      const totalRecharge = rechargeRes.data?.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0;

      // Monthly trend: group users by month
      const monthlyUsers: Record<string, number> = {};
      usersRes.data?.forEach(u => {
        const month = u.created_at?.substring(0, 7) || 'unknown';
        monthlyUsers[month] = (monthlyUsers[month] || 0) + 1;
      });

      const monthlyRecharge: Record<string, number> = {};
      rechargeRes.data?.forEach(r => {
        const month = r.created_at?.substring(0, 7) || 'unknown';
        monthlyRecharge[month] = (monthlyRecharge[month] || 0) + (Number(r.amount) || 0);
      });

      return NextResponse.json({
        totalUsers,
        totalRecharge,
        totalCases: casesRes.count || 0,
        markedCases: casesRes.data?.filter(c => c.is_marked_as_case).length || 0,
        monthlyUsers,
        monthlyRecharge,
        roleDistribution: {
          admin: usersRes.data?.filter(u => u.role === 'admin').length || 0,
          enterprise_admin: usersRes.data?.filter(u => u.role === 'enterprise_admin').length || 0,
          enterprise_manager: usersRes.data?.filter(u => u.role === 'enterprise_manager').length || 0,
          staff: usersRes.data?.filter(u => u.role === 'staff').length || 0,
        },
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[API] GET /admin error:', err);
    return NextResponse.json({ error: '请求失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { action } = body;

    // ─── Recharge: add credits to user ───
    if (action === 'recharge') {
      const { userId, plan, credits, operatorId, operatorName, remark } = body;
      if (!userId || !credits || !operatorId) {
        return NextResponse.json({ error: '参数不完整' }, { status: 400 });
      }

      // Get user info
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, email, display_name, company_id, remaining_credits')
        .eq('id', userId)
        .single();
      if (userErr || !user) {
        return NextResponse.json({ error: '用户不存在' }, { status: 404 });
      }

      // Update credits
      const newCredits = (user.remaining_credits || 0) + Number(credits);
      const { error: updateErr } = await supabase
        .from('users')
        .update({ remaining_credits: newCredits })
        .eq('id', userId);
      if (updateErr) throw updateErr;

      // Log recharge
      const { error: logErr } = await supabase
        .from('recharge_logs')
        .insert({
          user_id: userId,
          user_name: user.display_name || user.email,
          company_id: user.company_id,
          plan: plan || 'custom',
          amount: Number(credits),
          operator_id: operatorId,
          operator_name: operatorName || '管理员',
          remark: remark || '',
        });
      if (logErr) throw logErr;

      return NextResponse.json({ success: true, newCredits });
    }

    // ─── Mark case as入库 ───
    if (action === 'mark-case') {
      const { solutionId, caseTags } = body;
      if (!solutionId) {
        return NextResponse.json({ error: '参数不完整' }, { status: 400 });
      }

      const { error } = await supabase
        .from('problem_solutions')
        .update({
          is_marked_as_case: true,
          is_visible: true,
          marked_at: new Date().toISOString(),
          case_tags: caseTags || '',
        })
        .eq('id', solutionId);
      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    // ─── Unmark case (下架) ───
    if (action === 'unmark-case') {
      const { solutionId } = body;
      const { error } = await supabase
        .from('problem_solutions')
        .update({ is_visible: false })
        .eq('id', solutionId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // ─── Sync case to phrase_library (话术库) ───
    if (action === 'sync-to-scripts') {
      const { solutionId } = body;
      if (!solutionId) {
        return NextResponse.json({ error: '参数不完整' }, { status: 400 });
      }

      // Get the solution
      const { data: solution, error: solErr } = await supabase
        .from('problem_solutions')
        .select('*')
        .eq('id', solutionId)
        .single();
      if (solErr || !solution) {
        return NextResponse.json({ error: '记录不存在' }, { status: 404 });
      }

      // Create phrase from solution
      const category = solution.diagnosis_type || solution.category || '案例话术';
      const content = solution.ai_solution || solution.judgment || solution.query || '';
      const question = solution.problem_desc || solution.query || '';
      const answer = solution.script || solution.ai_solution || '';

      const { data: newPhrase, error: insertErr } = await supabase
        .from('phrase_library')
        .insert({
          company_id: solution.company_id,
          category,
          content: content.substring(0, 500),
          is_preset: false,
          is_case: true,
          source_id: solutionId,
          scene: solution.diagnosis_type || '',
          question: question.substring(0, 200),
          answer: answer.substring(0, 500),
          tags: solution.case_tags || '',
          use_count: 0,
        })
        .select('id')
        .single();
      if (insertErr) throw insertErr;

      // Update solution with script_id
      const { error: updateErr } = await supabase
        .from('problem_solutions')
        .update({ script_id: newPhrase.id })
        .eq('id', solutionId);
      if (updateErr) throw updateErr;

      return NextResponse.json({ success: true, scriptId: newPhrase.id });
    }

    // ─── Disable user ───
    if (action === 'disable-user') {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ error: '参数不完整' }, { status: 400 });
      }
      const { error } = await supabase
        .from('users')
        .update({ status: 'suspended' })
        .eq('id', userId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // ─── Enable user ───
    if (action === 'enable-user') {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ error: '参数不完整' }, { status: 400 });
      }
      const { error } = await supabase
        .from('users')
        .update({ status: 'active' })
        .eq('id', userId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // ─── Create notification (推送) ───
    if (action === 'create-notification') {
      const { companyId, type, platform, title, content } = body;
      if (!type || !title || !content) {
        return NextResponse.json({ error: '参数不完整' }, { status: 400 });
      }

      const insertData: Record<string, unknown> = {
        type,
        title,
        content,
        is_read: false,
      };

      // If platform is provided (for rule_update)
      if (platform) {
        insertData.platform = platform;
      }

      // If companyId is provided, send to specific company; otherwise, system-wide
      if (companyId) {
        insertData.company_id = companyId;
      }

      const { error } = await supabase
        .from('notifications')
        .insert(insertData);
      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    // ─── Finance: create record ───
    if (action === 'finance-create') {
      const { customerName, customerPhone, plan, amount, paymentMethod, startDate, endDate, accountStatus, remark } = body;
      if (!customerName || !plan || !amount) {
        return NextResponse.json({ error: '参数不完整' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('finance_records')
        .insert({
          customer_name: customerName,
          customer_phone: customerPhone || '',
          plan,
          amount: Number(amount),
          payment_method: paymentMethod || 'wechat',
          start_date: startDate || null,
          end_date: endDate || null,
          account_status: accountStatus || 'active',
          remark: remark || '',
          created_by: body.operatorId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    // ─── Finance: update record ───
    if (action === 'finance-update') {
      const { recordId, ...updates } = body;
      if (!recordId) {
        return NextResponse.json({ error: '参数不完整' }, { status: 400 });
      }
      const { error } = await supabase
        .from('finance_records')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', recordId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // ─── Finance: delete record ───
    if (action === 'finance-delete') {
      const { recordId } = body;
      if (!recordId) {
        return NextResponse.json({ error: '参数不完整' }, { status: 400 });
      }
      const { error } = await supabase
        .from('finance_records')
        .delete()
        .eq('id', recordId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // ─── Freeze redemption code ───
    if (action === 'freeze-code') {
      const { codeId } = body;
      if (!codeId) {
        return NextResponse.json({ error: '参数不完整' }, { status: 400 });
      }
      const { error } = await supabase
        .from('redemption_codes')
        .update({ status: 'frozen' })
        .eq('id', codeId)
        .eq('is_used', false);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // ─── Unfreeze redemption code ───
    if (action === 'unfreeze-code') {
      const { codeId } = body;
      if (!codeId) {
        return NextResponse.json({ error: '参数不完整' }, { status: 400 });
      }
      const { error } = await supabase
        .from('redemption_codes')
        .update({ status: 'active' })
        .eq('id', codeId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // ─── Renew user (extend plan_end) ───
    if (action === 'renew-user') {
      const { companyId, months } = body;
      if (!companyId || !months) {
        return NextResponse.json({ error: '参数不完整' }, { status: 400 });
      }
      // Get current plan_end
      const { data: company } = await supabase
        .from('companies')
        .select('plan_end, status')
        .eq('id', companyId)
        .single();
      if (!company) {
        return NextResponse.json({ error: '企业不存在' }, { status: 404 });
      }
      const currentEnd = company.plan_end ? new Date(company.plan_end) : new Date();
      const newEnd = new Date(currentEnd);
      newEnd.setMonth(newEnd.getMonth() + Number(months));
      const { error } = await supabase
        .from('companies')
        .update({ plan_end: newEnd.toISOString(), status: 'active' })
        .eq('id', companyId);
      if (error) throw error;
      return NextResponse.json({ success: true, newPlanEnd: newEnd.toISOString() });
    }

    // ─── Edit case tags ───
    if (action === 'edit-case-tags') {
      const { solutionId, caseTags } = body;
      if (!solutionId) {
        return NextResponse.json({ error: '参数不完整' }, { status: 400 });
      }
      const { error } = await supabase
        .from('problem_solutions')
        .update({ case_tags: caseTags || '' })
        .eq('id', solutionId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[API] POST /admin error:', err);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
