import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = getSupabaseClient();
  const { id } = await params;
  const body = await request.json();
  const { agent_ids } = body;

  if (!agent_ids?.length) {
    return NextResponse.json({ error: '缺少客服ID列表' }, { status: 400 });
  }

  // 批量分配客服到班组
  const { error } = await client
    .from('agents')
    .update({ team_id: id })
    .in('id', agent_ids);

  if (error) throw new Error(`分配成员失败: ${error.message}`);

  // 更新班组成员数量
  const { count } = await client
    .from('agents')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', id);
  await client.from('teams').update({ member_count: count ?? 0 }).eq('id', id);

  return NextResponse.json({ success: true, member_count: count });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = getSupabaseClient();
  const { id } = await params;
  const body = await request.json();
  const { agent_ids } = body;

  if (!agent_ids?.length) {
    return NextResponse.json({ error: '缺少客服ID列表' }, { status: 400 });
  }

  // 从班组移除客服（清空team_id）
  const { error } = await client
    .from('agents')
    .update({ team_id: null })
    .in('id', agent_ids);

  if (error) throw new Error(`移除成员失败: ${error.message}`);

  // 更新班组成员数量
  const { count } = await client
    .from('agents')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', id);
  await client.from('teams').update({ member_count: count ?? 0 }).eq('id', id);

  return NextResponse.json({ success: true, member_count: count });
}
