import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

async function verifyPersonalUser(request: NextRequest) {
  const supabase = getSupabaseClient();
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return { error: NextResponse.json({ error: '未授权' }, { status: 401 }) };

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { error: NextResponse.json({ error: '未授权' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'personal_user') {
    return { error: NextResponse.json({ error: '仅个人版用户可用' }, { status: 403 }) };
  }
  return { userId: user.id };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyPersonalUser(request);
    if (auth.error) return auth.error;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('cda_credits')
      .select('total_credits, used_credits')
      .eq('user_id', auth.userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    const total = data?.total_credits ?? 0;
    const used = data?.used_credits ?? 0;
    return NextResponse.json({ remaining: total - used, total, used });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '查询失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyPersonalUser(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { package: pkg } = body; // 'single' | 'five' | 'ten'

    const creditsMap: Record<string, number> = { single: 1, five: 5, ten: 10 };
    const credits = creditsMap[pkg] || 0;
    if (credits === 0) return NextResponse.json({ error: '无效的套餐' }, { status: 400 });

    const supabase = getSupabaseClient();

    // Check if credits record exists
    const { data: existing } = await supabase
      .from('cda_credits')
      .select('total_credits, used_credits')
      .eq('user_id', auth.userId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('cda_credits')
        .update({
          total_credits: existing.total_credits + credits,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', auth.userId);
      if (error) throw error;

      return NextResponse.json({
        success: true,
        creditsAdded: credits,
        total: existing.total_credits + credits,
        used: existing.used_credits,
        remaining: existing.total_credits + credits - existing.used_credits,
      });
    } else {
      const { error } = await supabase
        .from('cda_credits')
        .insert({ user_id: auth.userId, total_credits: credits, used_credits: 0 });
      if (error) throw error;

      return NextResponse.json({
        success: true,
        creditsAdded: credits,
        total: credits,
        used: 0,
        remaining: credits,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '操作失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
