import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/personal/learning-progress
 * Fetch all learned lesson IDs for the current user.
 */
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { data: rows, error } = await supabase
      .from('personal_learning_progress')
      .select('lesson_id, learned, learned_at')
      .eq('user_id', user.id)
      .eq('learned', true);

    if (error) throw error;

    const learnedIds: string[] = (rows ?? []).map((r: { lesson_id: string }) => r.lesson_id);
    return NextResponse.json({ learnedIds });
  } catch (err) {
    console.error('[learning-progress GET] error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * POST /api/personal/learning-progress
 * Save learning progress for the current user.
 * Body: { lessonId: string, learned: boolean }
 */
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const body = await request.json() as { lessonId: string; learned: boolean };
    if (!body.lessonId || typeof body.learned !== 'boolean') {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }

    if (body.learned) {
      // Upsert: mark as learned
      const { error: upsertErr } = await supabase
        .from('personal_learning_progress')
        .upsert(
          { user_id: user.id, lesson_id: body.lessonId, learned: true, learned_at: new Date().toISOString() },
          { onConflict: 'user_id,lesson_id' }
        );
      if (upsertErr) throw upsertErr;
    } else {
      // Delete: mark as unlearned
      const { error: delErr } = await supabase
        .from('personal_learning_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('lesson_id', body.lessonId);
      if (delErr) throw delErr;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[learning-progress POST] error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
