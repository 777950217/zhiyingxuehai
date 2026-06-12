import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = getSupabaseClient();
  const { id } = await params;
  const body = await request.json();
  const { name, type, leader_id } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (type !== undefined) updates.type = type;
  if (leader_id !== undefined) updates.leader_id = leader_id || null;

  const { data, error } = await client
    .from('teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`更新班组失败: ${error.message}`);
  if (!data) return NextResponse.json({ error: '班组不存在' }, { status: 404 });

  return NextResponse.json({ data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = getSupabaseClient();
  const { id } = await params;

  // 先清空该班组所有成员的 team_id
  const { error: clearError } = await client
    .from('agents')
    .update({ team_id: null })
    .eq('team_id', id);
  if (clearError) console.error('清空班组成员失败:', clearError.message);

  // 删除班组
  const { error } = await client.from('teams').delete().eq('id', id);
  if (error) throw new Error(`删除班组失败: ${error.message}`);

  return NextResponse.json({ success: true });
}
