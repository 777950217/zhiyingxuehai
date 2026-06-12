import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getSupabaseClient();

  const { data, error } = await client.from('agents').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`查询客服失败: ${error.message}`);
  if (!data) return NextResponse.json({ error: '客服不存在' }, { status: 404 });

  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getSupabaseClient();
  const body = await request.json();

  const { data, error } = await client.from('agents').update({
    ...body,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select();
  if (error) throw new Error(`更新客服失败: ${error.message}`);

  return NextResponse.json({ data: data[0] });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getSupabaseClient();

  // 先查客服的公司ID，用于更新seat_used
  const { data: agent } = await client.from('agents').select('company_id').eq('id', id).single();

  const { error } = await client.from('agents').delete().eq('id', id);
  if (error) throw new Error(`删除客服失败: ${error.message}`);

  // 更新 seat_used（基于users表实际人数）
  if (agent?.company_id) {
    const { count: userCount } = await client.from('users').select('*', { count: 'exact', head: true }).eq('company_id', agent.company_id).neq('status', 'deleted');
    await client.from('companies').update({ seat_used: userCount ?? 0 }).eq('id', agent.company_id);
  }

  return NextResponse.json({ success: true });
}
