import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET: 获取学习进度（自己的或团队成员的）
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const targetUserId = userId || user.id;

    if (userId && userId !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .single();

      if (!profile || !['admin', 'enterprise_admin', 'enterprise_manager'].includes(profile.role)) {
        return NextResponse.json({ error: '无权查看他人进度' }, { status: 403 });
      }

      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .single();

      if (!targetProfile || targetProfile.company_id !== profile.company_id) {
        return NextResponse.json({ error: '只能查看同公司成员进度' }, { status: 403 });
      }
    }

    const { data: progress, error } = await supabase
      .from('newbie_training_progress')
      .select('*')
      .eq('user_id', targetUserId);

    if (error) {
      console.error('[newbie-training/progress] Query error:', error.message);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ progress: progress || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[newbie-training/progress] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: 更新学习进度
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
    }

    const body = await request.json();
    const { moduleId, status } = body as { moduleId: string; status: string };

    if (!moduleId || !status) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    if (!['not_started', 'in_progress', 'completed'].includes(status)) {
      return NextResponse.json({ error: '无效状态' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: '用户信息缺失' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const upsertData = {
      user_id: user.id,
      company_id: profile.company_id,
      module_id: moduleId,
      status,
      started_at: status !== 'not_started' ? now : null,
      completed_at: status === 'completed' ? now : null,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('newbie_training_progress')
      .upsert(upsertData, { onConflict: 'user_id,module_id' })
      .select()
      .single();

    if (error) {
      console.error('[newbie-training/progress] Upsert error:', error.message);
      return NextResponse.json({ error: '保存失败' }, { status: 500 });
    }

    return NextResponse.json({ progress: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[newbie-training/progress] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
