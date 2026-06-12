import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET: 管理员获取团队所有成员的学习进度
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

    const { data: members, error: membersError } = await supabase
      .from('profiles')
      .select('id, display_name, role')
      .eq('company_id', profile.company_id);

    if (membersError) {
      console.error('[newbie-training/team-progress] Members error:', membersError.message);
      return NextResponse.json({ error: '查询成员失败' }, { status: 500 });
    }

    const memberIds = (members || []).map((m: { id: string }) => m.id);
    const { data: progress, error: progressError } = await supabase
      .from('newbie_training_progress')
      .select('*')
      .in('user_id', memberIds);

    if (progressError) {
      console.error('[newbie-training/team-progress] Progress error:', progressError.message);
      return NextResponse.json({ error: '查询进度失败' }, { status: 500 });
    }

    return NextResponse.json({
      members: members || [],
      progress: progress || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[newbie-training/team-progress] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
