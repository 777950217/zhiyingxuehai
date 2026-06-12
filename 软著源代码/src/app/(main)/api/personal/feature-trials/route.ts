import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'personal_user') {
      return NextResponse.json({ error: '仅个人版用户可用' }, { status: 403 });
    }

    const { data: trials } = await supabase
      .from('personal_feature_trials')
      .select('feature, used_count')
      .eq('user_id', user.id);

    const FEATURE_LIMITS: Record<string, number> = { report: 5, cda: 2, chat_check: 5 };
    const features = ['report', 'cda', 'chat_check'];
    const result: Record<string, { used: number; remaining: number; canUse: boolean; limit: number }> = {};
    for (const f of features) {
      const trial = trials?.find(t => t.feature === f);
      const used = trial?.used_count ?? 0;
      const limit = FEATURE_LIMITS[f] ?? 3;
      result[f] = { used, remaining: limit - used, canUse: used < limit, limit };
    }

    return NextResponse.json({ trials: result, featureLimits: FEATURE_LIMITS });
  } catch (err) {
    console.error('[feature-trials GET] error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'personal_user') {
      return NextResponse.json({ error: '仅个人版用户可用' }, { status: 403 });
    }

    const body = await request.json() as { feature: string };
    const { feature } = body;
    if (!['report', 'cda', 'chat_check'].includes(feature)) {
      return NextResponse.json({ error: '无效的功能类型' }, { status: 400 });
    }

    const FEATURE_LIMITS: Record<string, number> = { report: 5, cda: 2, chat_check: 5 };
    const freeLimit = FEATURE_LIMITS[feature] ?? 5;

    // Get or create trial record
    const { data: existing } = await supabase
      .from('personal_feature_trials')
      .select('id, used_count')
      .eq('user_id', user.id)
      .eq('feature', feature)
      .single();

    if (existing) {
      if (existing.used_count >= freeLimit) {
        return NextResponse.json({
          used: existing.used_count,
          remaining: 0,
          canUse: false,
          message: '试用次数已用完',
        });
      }
      const { error: updateErr } = await supabase
        .from('personal_feature_trials')
        .update({ used_count: existing.used_count + 1 })
        .eq('id', existing.id);
      if (updateErr) throw updateErr;
      return NextResponse.json({
        used: existing.used_count + 1,
        remaining: freeLimit - existing.used_count - 1,
        canUse: existing.used_count + 1 < freeLimit,
      });
    } else {
      const { error: insertErr } = await supabase
        .from('personal_feature_trials')
        .insert({ user_id: user.id, feature, used_count: 1 });
      if (insertErr) throw insertErr;
      return NextResponse.json({
        used: 1,
        remaining: freeLimit - 1,
        canUse: true,
      });
    }
  } catch (err) {
    console.error('[feature-trials POST] error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
