import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/user-stats?user_id=xxx&stat_type=xxx
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: '未授权，请重新登录' }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  const { searchParams } = new URL(req.url);
  const statType = searchParams.get('stat_type');

  let query = supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', auth.userId);

  if (statType) {
    query = query.eq('stat_type', statType);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/user-stats — upsert a stat
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: '未授权，请重新登录' }, { status: 401 });
  }

  const body = await req.json();
  const { stat_type, stat_value } = body;

  if (!stat_type || stat_value === undefined) {
    return NextResponse.json({ error: '缺少必要参数: stat_type, stat_value' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_stats')
    .upsert(
      {
        user_id: auth.userId,
        stat_type,
        stat_value: String(stat_value),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,stat_type' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
