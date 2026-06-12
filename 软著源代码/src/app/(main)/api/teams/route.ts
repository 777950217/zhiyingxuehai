import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const company_id = searchParams.get('company_id') || searchParams.get('companyId');

  if (!company_id) {
    return NextResponse.json({ error: '缺少公司ID' }, { status: 400 });
  }

  // 查询班组列表，附带班组长名称
  const { data: teams, error } = await client
    .from('teams')
    .select('id, company_id, name, type, leader_id, member_count, status, created_at, updated_at')
    .eq('company_id', company_id)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`查询班组失败: ${error.message}`);

  // 获取班组长名称
  const leaderIds = (teams || []).filter(t => t.leader_id).map(t => t.leader_id);
  const leaderMap: Record<string, string> = {};
  if (leaderIds.length > 0) {
    const { data: leaders } = await client
      .from('agents')
      .select('id, name')
      .in('id', leaderIds);
    (leaders || []).forEach((l: { id: string; name: string }) => {
      leaderMap[l.id] = l.name;
    });
  }

  // 获取每个班组的成员列表
  const teamIds = (teams || []).map(t => t.id);
  const membersMap: Record<string, Array<{ id: string; name: string; position: string; status: string }>> = {};
  if (teamIds.length > 0) {
    const { data: members } = await client
      .from('agents')
      .select('id, name, position, status, team_id')
      .in('team_id', teamIds);
    (members || []).forEach((m: { id: string; name: string; position: string; status: string; team_id: string }) => {
      if (!membersMap[m.team_id]) membersMap[m.team_id] = [];
      membersMap[m.team_id].push({ id: m.id, name: m.name, position: m.position, status: m.status });
    });
  }

  // 获取未分配班组的客服
  const { data: unassigned } = await client
    .from('agents')
    .select('id, name, position, status')
    .eq('company_id', company_id)
    .is('team_id', null)
    .neq('status', '离职');

  const result = (teams || []).map(t => ({
    ...t,
    leader_name: leaderMap[t.leader_id] || null,
    members: membersMap[t.id] || [],
  }));

  return NextResponse.json({ data: result, unassigned: unassigned || [] });
}

export async function POST(request: NextRequest) {
  const client = getSupabaseClient();
  const body = await request.json();
  const { company_id, name, type, leader_id, member_ids } = body;

  if (!company_id || !name) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  // 检查班组数量上限
  const { data: company } = await client.from('companies').select('id').eq('id', company_id).single();
  if (!company) {
    return NextResponse.json({ error: '公司不存在' }, { status: 404 });
  }

  // 查询用户角色以判断上限
  const authHeader = request.headers.get('authorization');
  let userRole = 'staff';
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const sb = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user } } = await sb.auth.getUser(token);
    if (user) {
      const { data: userData } = await client.from('users').select('role').eq('id', user.id).single();
      if (userData) userRole = userData.role;
    }
  }

  // 数量上限检查 — 使用 plan-limits 逻辑
  const { count: teamCount } = await client.from('teams').select('*', { count: 'exact', head: true }).eq('company_id', company_id);
  let maxTeams = 0;
  if (userRole === 'admin') {
    maxTeams = Infinity;
  } else if (userRole === 'enterprise_admin') {
    maxTeams = 5;
  } else if (userRole === 'enterprise_manager') {
    // 需要查询公司plan来判断上限
    const { data: companyData } = await client.from('companies').select('plan').eq('id', company_id).single();
    maxTeams = companyData?.plan === 'flagship' ? 5 : 1;
  }
  if (maxTeams !== Infinity && (teamCount ?? 0) >= maxTeams) {
    return NextResponse.json({ error: '已达到当前版本班组上限', maxTeams }, { status: 403 });
  }

  // 创建班组
  const { data: team, error } = await client.from('teams').insert({
    company_id,
    name,
    type: type || 'general',
    leader_id: leader_id || null,
    member_count: member_ids?.length || 0,
  }).select().single();

  if (error) throw new Error(`创建班组失败: ${error.message}`);

  // 分配成员到班组
  if (member_ids?.length > 0 && team) {
    const { error: updateError } = await client
      .from('agents')
      .update({ team_id: team.id })
      .in('id', member_ids);
    if (updateError) console.error('分配成员失败:', updateError.message);
  }

  return NextResponse.json({ data: team });
}
