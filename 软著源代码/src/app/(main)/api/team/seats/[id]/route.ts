import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

/** PATCH /api/team/seats/[id] - 编辑坐席 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  if (auth.role !== 'admin' && auth.role !== 'enterprise_manager' && auth.role !== 'enterprise_admin') {
    return forbiddenResponse('无权编辑坐席');
  }

  try {
    const { id } = await params;
    const client = getSupabaseClient();
    const body = await request.json();

    // 验证该用户属于当前企业
    const { data: targetUser, error: findError } = await client
      .from('users')
      .select('id, company_id')
      .eq('id', id)
      .single();
    if (findError || !targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
    if (auth.role !== 'admin' && targetUser.company_id !== auth.companyId) {
      return forbiddenResponse('无权操作其他企业的坐席');
    }

    // 更新 user
    const userUpdates: Record<string, string> = {};
    if (body.name !== undefined) userUpdates.display_name = body.name;
    if (body.email !== undefined) userUpdates.email = body.email;
    if (body.position !== undefined) userUpdates.position = body.position;
    if (body.status !== undefined) userUpdates.status = body.status;

    if (Object.keys(userUpdates).length > 0) {
      const { error: updateError } = await client
        .from('users')
        .update(userUpdates)
        .eq('id', id);
      if (updateError) throw new Error(`更新用户失败: ${updateError.message}`);
    }

    // 同步更新 agent
    if (body.name !== undefined || body.position !== undefined) {
      const agentUpdates: Record<string, string> = {};
      if (body.name !== undefined) agentUpdates.name = body.name;
      if (body.position !== undefined) agentUpdates.position = body.position;

      const { error: agentUpdateError } = await client
        .from('agents')
        .update(agentUpdates)
        .eq('user_id', id);
      if (agentUpdateError) {
        console.error('[seats PATCH] agent update failed:', agentUpdateError);
      }
    }

    // 如果停用坐席，更新 seat_used
    if (body.status === 'deleted' || body.status === 'suspended') {
      const { count } = await client
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', targetUser.company_id)
        .neq('status', 'deleted');
      await client
        .from('companies')
        .update({ seat_used: (count ?? 1) - 1 })
        .eq('id', targetUser.company_id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[seats PATCH] error:', err);
    return NextResponse.json({ error: '编辑坐席失败' }, { status: 500 });
  }
}

/** DELETE /api/team/seats/[id] - 删除坐席 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  if (auth.role !== 'admin' && auth.role !== 'enterprise_manager' && auth.role !== 'enterprise_admin') {
    return forbiddenResponse('无权删除坐席');
  }

  try {
    const { id } = await params;
    const client = getSupabaseClient();

    // 验证该用户属于当前企业
    const { data: targetUser, error: findError } = await client
      .from('users')
      .select('id, company_id, role')
      .eq('id', id)
      .single();
    if (findError || !targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
    if (auth.role !== 'admin' && targetUser.company_id !== auth.companyId) {
      return forbiddenResponse('无权操作其他企业的坐席');
    }

    // 不能删除自己
    if (id === auth.userId) {
      return NextResponse.json({ error: '不能删除自己' }, { status: 400 });
    }

    // 不能删除管理员
    if (targetUser.role === 'enterprise_admin' || targetUser.role === 'admin') {
      return NextResponse.json({ error: '不能删除管理员账号' }, { status: 403 });
    }

    // 软删除 user
    const { error: userDeleteError } = await client
      .from('users')
      .update({ status: 'deleted' })
      .eq('id', id);
    if (userDeleteError) throw new Error(`删除用户失败: ${userDeleteError.message}`);

    // 解除 agent 的 user_id 关联
    await client
      .from('agents')
      .update({ status: '离职', user_id: null })
      .eq('user_id', id);

    // 更新 seat_used
    const { count } = await client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', targetUser.company_id)
      .neq('status', 'deleted');
    await client
      .from('companies')
      .update({ seat_used: count ?? 0 })
      .eq('id', targetUser.company_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[seats DELETE] error:', err);
    return NextResponse.json({ error: '删除坐席失败' }, { status: 500 });
  }
}
