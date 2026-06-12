import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';
import { logAction, AuditAction, ResourceType, getClientIp } from '@/lib/audit-log';

/** GET /api/team/seats - 获取坐席列表 + 座位余量 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  // 仅 ent_manager 和 ent_admin 可访问
  if (auth.role !== 'admin' && auth.role !== 'enterprise_manager' && auth.role !== 'enterprise_admin') {
    return forbiddenResponse('无权访问坐席管理');
  }

  try {
    const client = getSupabaseClient();
    const companyId = auth.companyId;

    // 1. 查企业座位信息
    const { data: company, error: companyError } = await client
      .from('companies')
      .select('seat_limit, seat_used, name')
      .eq('id', companyId)
      .single();
    if (companyError) throw new Error(`查询企业信息失败: ${companyError.message}`);

    // 2. 查坐席列表（users + agents 关联）
    const { data: users, error: usersError } = await client
      .from('users')
      .select('id, email, display_name, position, role, status, created_at')
      .eq('company_id', companyId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: true });
    if (usersError) throw new Error(`查询用户列表失败: ${usersError.message}`);

    // 3. 查关联的 agents
    const userIds = (users || []).map((u: { id: string }) => u.id);
    const agentsMap: Record<string, { id: string; training_stage: string }> = {};
    if (userIds.length > 0) {
      const { data: agents, error: agentsError } = await client
        .from('agents')
        .select('id, user_id, training_stage')
        .in('user_id', userIds);
      if (agentsError) throw new Error(`查询客服档案失败: ${agentsError.message}`);
      for (const a of (agents || [])) {
        if (a.user_id) {
          agentsMap[a.user_id] = { id: a.id, training_stage: a.training_stage };
        }
      }
    }

    // 4. 合并数据
    const seats = (users || []).map((u: { id: string; email: string; display_name: string; position: string | null; role: string; status: string; created_at: string }) => ({
      id: u.id,
      email: u.email,
      name: u.display_name || '',
      position: u.position || '',
      role: u.role,
      status: u.status,
      created_at: u.created_at,
      agent: agentsMap[u.id] || null,
    }));

    return NextResponse.json({
      seats,
      seatInfo: {
        used: company?.seat_used ?? 0,
        limit: company?.seat_limit ?? 1,
        companyName: company?.name || '',
      },
    });
  } catch (err) {
    console.error('[seats GET] error:', err);
    return NextResponse.json({ error: '查询坐席列表失败' }, { status: 500 });
  }
}

/** POST /api/team/seats - 添加坐席（同时创建 user + agent） */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  if (auth.role !== 'admin' && auth.role !== 'enterprise_manager' && auth.role !== 'enterprise_admin') {
    return forbiddenResponse('无权添加坐席');
  }

  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { name, email, position, password } = body;

    if (!name || !email) {
      return NextResponse.json({ error: '姓名和邮箱不能为空' }, { status: 400 });
    }

    const companyId = auth.companyId;

    // 1. 检查邮箱是否已存在
    const { data: existing } = await client
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 409 });
    }

    // 2. 检查座位上限
    const { data: company } = await client
      .from('companies')
      .select('seat_limit, seat_used')
      .eq('id', companyId)
      .single();
    const seatLimit = company?.seat_limit ?? 1;
    const seatUsed = company?.seat_used ?? 0;
    if (seatUsed >= seatLimit) {
      return NextResponse.json({ error: '已达到当前版本座位上限，请解锁更高版本', seatLimit, seatUsed }, { status: 403 });
    }

    // 3. 创建 user
    const { data: newUser, error: userError } = await client
      .from('users')
      .insert({
        company_id: companyId,
        email,
        password_hash: password || '',
        display_name: name,
        role: 'staff',
        user_type: 'small',
        position: position || null,
        ai_credits_remaining: 3,
        status: 'active',
      })
      .select()
      .single();
    if (userError) throw new Error(`创建用户失败: ${userError.message}`);

    // 4. 创建 agent 档案
    const { data: newAgent, error: agentError } = await client
      .from('agents')
      .insert({
        company_id: companyId,
        name,
        position: position || '售前',
        status: '在职',
        training_stage: '基础',
        user_id: newUser.id,
      })
      .select()
      .single();
    if (agentError) {
      console.error('[seats POST] agent creation failed:', agentError);
      // agent 创建失败不回滚 user，但记录错误
    }

    // 5. 更新 seat_used
    await client
      .from('companies')
      .update({ seat_used: seatUsed + 1 })
      .eq('id', companyId);

    // Audit log
    await logAction({
      userId: auth.userId,
      companyId: auth.companyId,
      action: AuditAction.CREATE,
      resourceType: ResourceType.SEAT,
      resourceId: newUser.id,
      detail: { name, email, position },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      data: {
        ...newUser,
        agent: newAgent || null,
      },
    });
  } catch (err) {
    console.error('[seats POST] error:', err);
    return NextResponse.json({ error: '添加坐席失败' }, { status: 500 });
  }
}
