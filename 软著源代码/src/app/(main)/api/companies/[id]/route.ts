import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getSupabaseClient();

  const { data, error } = await client.from('companies').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`查询企业失败: ${error.message}`);
  if (!data) return NextResponse.json({ error: '企业不存在' }, { status: 404 });

  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getSupabaseClient();
  const body = await request.json();

  const { data, error } = await client.from('companies').update({
    ...body,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select();
  if (error) throw new Error(`更新企业失败: ${error.message}`);

  return NextResponse.json({ data: data[0] });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getSupabaseClient();

  const { error } = await client.from('companies').delete().eq('id', id);
  if (error) throw new Error(`删除企业失败: ${error.message}`);

  return NextResponse.json({ success: true });
}
