import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/onboarding-tasks - 获取7天自学任务列表+进度
export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    const companyId = searchParams.get('company_id');

    // 获取所有任务
    const { data: tasks, error: tasksError } = await supabase
      .from('onboarding_tasks')
      .select('*')
      .order('day_number', { ascending: true });

    if (tasksError) throw tasksError;

    // 获取用户进度
    let progress: Array<{ day_number: number; status: string; completed_at: string | null; notes: string | null }> = [];
    if (userId) {
      const { data: progressData, error: progressError } = await supabase
        .from('onboarding_progress')
        .select('day_number, status, completed_at, notes')
        .eq('user_id', userId);
      if (progressError) throw progressError;
      progress = progressData || [];
    }

    // 合并任务和进度
    const progressMap = new Map(progress.map(p => [p.day_number, p]));
    const result = tasks.map(task => ({
      ...task,
      status: progressMap.get(task.day_number)?.status || 'pending',
      completed_at: progressMap.get(task.day_number)?.completed_at || null,
      notes: progressMap.get(task.day_number)?.notes || null,
    }));

    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    let message = '未知错误';
    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === 'object' && err !== null && 'message' in err) {
      message = String((err as { message: unknown }).message);
    } else {
      message = String(err);
    }
    console.error('[onboarding-tasks GET] Error:', JSON.stringify(err));
    return NextResponse.json({ error: `获取自学任务失败: ${message}` }, { status: 500 });
  }
}

// POST /api/onboarding-tasks - 更新任务进度
export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const body = await req.json();
    const { company_id, user_id, day_number, status, notes } = body;

    if (!company_id || !user_id || !day_number) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const upsertData = {
      company_id,
      user_id,
      day_number,
      status: status || 'completed',
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('onboarding_progress')
      .upsert(upsertData, { onConflict: 'user_id,day_number' })
      .select();

    if (error) throw error;

    return NextResponse.json({ data: data?.[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新进度失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
