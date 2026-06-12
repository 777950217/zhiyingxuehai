import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { sanitizeString, validateId } from '@/lib/validate';

// POST /api/lesson-feedback — 提交课时反馈
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, lessonId, courseId, noteId, understood, reason, feedbackStatus } = body;

    if (!userId || !lessonId || typeof understood !== 'boolean') {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const userIdCheck = validateId(userId);
    if (!userIdCheck.valid) return NextResponse.json({ error: 'userId格式无效' }, { status: 400 });

    const lessonIdCheck = validateId(lessonId);
    if (!lessonIdCheck.valid) return NextResponse.json({ error: 'lessonId格式无效' }, { status: 400 });

    const sanitizedReason = reason ? sanitizeString(reason, 500) : null;
    const status = feedbackStatus === 'skipped' ? 'skipped' : 'completed';

    const supabase = getSupabaseClient();

    // upsert: 同一用户同一课时仅1次反馈
    const { data, error } = await supabase
      .from('lesson_feedback')
      .upsert(
        {
          user_id: userId,
          lesson_id: lessonId,
          course_id: courseId || null,
          note_id: noteId || null,
          understood,
          reason: sanitizedReason,
          feedback_status: status,
        },
        { onConflict: 'user_id,lesson_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[lesson-feedback] insert error:', error);
      return NextResponse.json({ error: '提交反馈失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[lesson-feedback] POST error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// GET /api/lesson-feedback — 查询反馈
// ?userId=xxx  查某用户反馈列表
// ?lessonId=xxx 查某课时所有反馈（admin）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const lessonId = searchParams.get('lessonId');

    const supabase = getSupabaseClient();

    if (userId) {
      // 查某用户的所有反馈
      const { data, error } = await supabase
        .from('lesson_feedback')
        .select('id, lesson_id, course_id, understood, reason, feedback_status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[lesson-feedback] GET user error:', error);
        return NextResponse.json({ error: '查询失败' }, { status: 500 });
      }
      return NextResponse.json({ data });
    }

    if (lessonId) {
      // 查某课时的所有反馈（admin用）
      const { data, error } = await supabase
        .from('lesson_feedback')
        .select('id, user_id, lesson_id, course_id, understood, reason, feedback_status, created_at')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[lesson-feedback] GET lesson error:', error);
        return NextResponse.json({ error: '查询失败' }, { status: 500 });
      }
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: '请提供userId或lessonId参数' }, { status: 400 });
  } catch (err) {
    console.error('[lesson-feedback] GET error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
