import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getSupabaseClient();

  const { data, error } = await client.from('users').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`查询用户失败: ${error.message}`);
  if (!data) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getSupabaseClient();
  const body = await request.json();

  const { data, error } = await client.from('users').update({
    ...body,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select();
  if (error) throw new Error(`更新用户失败: ${error.message}`);

  return NextResponse.json({ data: data[0] });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getSupabaseClient();

  // 先查用户的公司ID，用于更新seat_used
  const { data: user } = await client.from('users').select('company_id').eq('id', id).single();

  const { error } = await client.from('users').delete().eq('id', id);
  if (error) throw new Error(`删除用户失败: ${error.message}`);

  // 更新 seat_used
  if (user?.company_id) {
    const { count: userCount } = await client.from('users').select('*', { count: 'exact', head: true }).eq('company_id', user.company_id).neq('status', 'deleted');
    await client.from('companies').update({ seat_used: userCount ?? 0 }).eq('id', user.company_id);
  }

  return NextResponse.json({ success: true });
}
