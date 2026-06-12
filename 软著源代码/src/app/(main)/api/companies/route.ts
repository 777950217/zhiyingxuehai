import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = client.from('companies').select('id, name, industry, team_size, contact_name, contact_phone, plan, service_level, status, created_at', { count: 'exact' }).order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`查询企业失败: ${error.message}`);

  return NextResponse.json({ data, total: count });
}

export async function POST(request: NextRequest) {
  const client = getSupabaseClient();
  const body = await request.json();

  const { data, error } = await client.from('companies').insert({
    name: body.name,
    industry: body.industry || '电商',
    team_size: body.team_size || 1,
    contact_name: body.contact_name,
    contact_phone: body.contact_phone,
    plan: body.plan || 'free',
    service_level: body.service_level || 'self',
    status: body.status || 'active',
    ai_credits_remaining: body.ai_credits_remaining || 3,
  }).select();
  if (error) throw new Error(`创建企业失败: ${error.message}`);

  return NextResponse.json({ data: data[0] });
}
