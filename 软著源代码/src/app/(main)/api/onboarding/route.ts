import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

const supabase = getSupabaseClient();

// 7天引导任务定义
const ONBOARDING_TASKS = [
  { day: 1, task: '配置团队人员权限', module: '人员管理', link: '/agents', icon: 'Users' },
  { day: 2, task: '完成新人培训入门', module: '新人培训', link: '/newbie-training', icon: 'BookOpen' },
  { day: 3, task: '使用AI问题解决器', module: 'AI问题解决器', link: '/ai-assistant', icon: 'Brain' },
  { day: 4, task: '录入第一条售后工单', module: '售后管理', link: '/customer-records', icon: 'ClipboardList' },
  { day: 5, task: '开启售后成本预警', module: '成本预警', link: '/cost-alert', icon: 'ShieldAlert' },
  { day: 6, task: '进行首次5维质检', module: 'KPI管理', link: '/kpi', icon: 'ClipboardCheck' },
  { day: 7, task: '查看数据复盘报告', module: 'AI周报月报', link: '/ai-reports', icon: 'BarChart3' },
];

// staff 只能看到和自己相关的任务
const STAFF_VISIBLE_DAYS = [2, 3, 6];

// GET /api/onboarding - 获取当前用户引导进度
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 获取用户角色
    const { data: userData } = await supabase
      .from('users')
      .select('role, created_at')
      .eq('id', user.id)
      .single();

    const role = userData?.role || 'staff';
    const isStaff = role === 'staff';

    // 获取进度记录
    const { data: progress, error } = await supabase
      .from('onboarding_progress')
      .select('day_number, completed, completed_at')
      .eq('user_id', user.id);

    if (error) throw error;

    const progressMap = new Map(
      (progress || []).map((p: { day_number: number; completed: boolean; completed_at: string | null }) => [p.day_number, p])
    );

    // 过滤任务：staff只看部分
    const visibleDays = isStaff ? STAFF_VISIBLE_DAYS : [1, 2, 3, 4, 5, 6, 7];
    const tasks = ONBOARDING_TASKS
      .filter(t => visibleDays.includes(t.day))
      .map(t => ({
        ...t,
        completed: progressMap.get(t.day)?.completed || false,
        completed_at: progressMap.get(t.day)?.completed_at || null,
      }));

    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
    const allCompleted = completedCount === totalCount;

    // 检查是否是首次登录（注册时间 < 30天，且没有任何进度记录）
    const createdAt = userData?.created_at ? new Date(userData.created_at) : new Date();
    const daysSinceRegister = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const isFirstLogin = (progress || []).length === 0 && daysSinceRegister < 30;

    return NextResponse.json({
      tasks,
      completedCount,
      totalCount,
      allCompleted,
      isFirstLogin,
      daysSinceRegister,
    });
  } catch (err) {
    console.error('获取引导进度失败:', err);
    return NextResponse.json({ error: '获取引导进度失败' }, { status: 500 });
  }
}

// PATCH /api/onboarding - 标记某天任务完成
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { day_number, completed = true } = body;

    if (!day_number || day_number < 1 || day_number > 7) {
      return NextResponse.json({ error: '无效的天数' }, { status: 400 });
    }

    // Upsert: 如果记录存在则更新，不存在则创建
    const { error } = await supabase
      .from('onboarding_progress')
      .upsert(
        {
          user_id: user.id,
          day_number,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        },
        { onConflict: 'user_id,day_number' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true, day_number, completed });
  } catch (err) {
    console.error('更新引导进度失败:', err);
    return NextResponse.json({ error: '更新引导进度失败' }, { status: 500 });
  }
}
