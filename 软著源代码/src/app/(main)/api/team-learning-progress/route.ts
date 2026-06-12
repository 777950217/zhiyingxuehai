import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/team-learning-progress
 * 老板查看团队所有成员的25课学习进度
 */
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'enterprise_admin', 'enterprise_manager'].includes(profile.role)) {
      return NextResponse.json({ error: '无权查看团队进度' }, { status: 403 });
    }

    // 查询公司下所有成员
    const { data: members, error: membersError } = await supabase
      .from('profiles')
      .select('id, display_name, role')
      .eq('company_id', profile.company_id)
      .neq('id', user.id); // 排除老板自己

    if (membersError) {
      console.error('[team-learning-progress] Members error:', membersError.message);
      return NextResponse.json({ error: '查询成员失败' }, { status: 500 });
    }

    if (!members || members.length === 0) {
      return NextResponse.json({ members: [], progress: [] });
    }

    const memberIds = members.map((m: { id: string }) => m.id);

    // 查询所有成员的学习进度
    const { data: progress, error: progressError } = await supabase
      .from('personal_learning_progress')
      .select('user_id, lesson_id, learned, learned_at')
      .in('user_id', memberIds)
      .eq('learned', true);

    if (progressError) {
      console.error('[team-learning-progress] Progress error:', progressError.message);
      return NextResponse.json({ error: '查询进度失败' }, { status: 500 });
    }

    return NextResponse.json({
      members: members || [],
      progress: progress || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[team-learning-progress] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
