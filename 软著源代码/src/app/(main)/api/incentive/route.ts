import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET: 积分规则+排行榜
// POST: 添加/更新积分规则, 记录积分
export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: '缺少company_id' }, { status: 400 });
    }

    // 获取公司自定义规则 + 预设规则
    const { data: customRules } = await supabase
      .from('incentive_rules')
      .select('*')
      .eq('company_id', companyId);

    const { data: presetRules } = await supabase
      .from('incentive_rules')
      .select('*')
      .eq('company_id', 'preset');

    const rules = [...(presetRules || []), ...(customRules || [])];

    // 排行榜：按用户聚合积分
    const { data: records } = await supabase
      .from('incentive_records')
      .select('user_id, points')
      .eq('company_id', companyId);

    // 聚合
    const userPoints: Record<string, number> = {};
    (records || []).forEach((r: { user_id: string; points: number }) => {
      userPoints[r.user_id] = (userPoints[r.user_id] || 0) + r.points;
    });

    // 获取用户名
    const userIds = Object.keys(userPoints);
    const { data: users } = userIds.length > 0 ? await supabase
      .from('users')
      .select('id, display_name')
      .in('id', userIds) : { data: [] };

    const userMap: Record<string, string> = {};
    (users || []).forEach((u: { id: string; display_name: string | null }) => {
      userMap[u.id] = u.display_name || '未知';
    });

    const leaderboard = Object.entries(userPoints)
      .map(([userId, points]) => ({ userId, userName: userMap[userId] || '未知', points }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 20);

    // 兑换设置
    const { data: redemptions } = await supabase
      .from('incentive_redemptions')
      .select('*')
      .eq('company_id', companyId);

    return NextResponse.json({
      data: {
        rules: rules.map((r: { id: string; action: string; points: number; is_active: boolean; company_id: string }) => ({
          id: r.id,
          action: r.action,
          points: r.points,
          isActive: r.is_active,
          isPreset: r.company_id === 'preset',
        })),
        leaderboard,
        redemptions: redemptions || [],
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const body = await request.json();
    const { action, company_id } = body;

    if (!company_id) {
      return NextResponse.json({ error: '缺少company_id' }, { status: 400 });
    }

    if (action === 'add_rule') {
      const { data, error } = await supabase
        .from('incentive_rules')
        .insert({
          company_id,
          action: body.action_name,
          points: body.points || 1,
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: '规则添加失败' }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (action === 'update_rule') {
      const { data, error } = await supabase
        .from('incentive_rules')
        .update({ points: body.points, is_active: body.is_active })
        .eq('id', body.rule_id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: '规则更新失败' }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (action === 'record') {
      // 记录积分
      const { data, error } = await supabase
        .from('incentive_records')
        .insert({
          company_id,
          user_id: body.user_id,
          agent_id: body.agent_id || null,
          rule_id: body.rule_id || null,
          action: body.action_name,
          points: body.points || 0,
          note: body.note || '',
          created_by: body.created_by || null,
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: '积分记录失败' }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (action === 'add_redemption') {
      const { data, error } = await supabase
        .from('incentive_redemptions')
        .insert({
          company_id,
          name: body.name,
          points_required: body.points_required,
          description: body.description || '',
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: '兑换项添加失败' }, { status: 500 });
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
