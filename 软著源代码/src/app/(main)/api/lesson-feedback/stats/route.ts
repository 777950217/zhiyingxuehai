import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/lesson-feedback/stats — admin统计
// 按课时汇总：没看懂占比 + 问题标签汇总 + 用户反馈原文
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    // 获取所有反馈
    const { data: allFeedback, error } = await supabase
      .from('lesson_feedback')
      .select('id, user_id, lesson_id, course_id, understood, reason, feedback_status, created_at')
      .eq('feedback_status', 'completed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[lesson-feedback/stats] GET error:', error);
      return NextResponse.json({ error: '查询统计失败' }, { status: 500 });
    }

    // 按课时分组汇总
    const lessonMap = new Map<string, {
      lessonId: string;
      courseId: string | null;
      totalCount: number;
      understoodCount: number;
      notUnderstoodCount: number;
      reasons: string[];
      feedbacks: { userId: string; understood: boolean; reason: string | null; createdAt: string }[];
    }>();

    for (const fb of allFeedback || []) {
      const key = fb.lesson_id;
      if (!lessonMap.has(key)) {
        lessonMap.set(key, {
          lessonId: fb.lesson_id,
          courseId: fb.course_id,
          totalCount: 0,
          understoodCount: 0,
          notUnderstoodCount: 0,
          reasons: [],
          feedbacks: [],
        });
      }
      const entry = lessonMap.get(key)!;
      entry.totalCount++;
      if (fb.understood) {
        entry.understoodCount++;
      } else {
        entry.notUnderstoodCount++;
        if (fb.reason) entry.reasons.push(fb.reason);
      }
      entry.feedbacks.push({
        userId: fb.user_id,
        understood: fb.understood,
        reason: fb.reason,
        createdAt: fb.created_at,
      });
    }

    // 按没看懂占比排序
    const stats = Array.from(lessonMap.values())
      .map((entry) => ({
        ...entry,
        notUnderstoodRate: entry.totalCount > 0
          ? Math.round((entry.notUnderstoodCount / entry.totalCount) * 100)
          : 0,
      }))
      .sort((a, b) => b.notUnderstoodRate - a.notUnderstoodRate);

    // 问题标签汇总（解析reason中的选项）
    const reasonTagCount: Record<string, number> = {};
    for (const entry of stats) {
      for (const r of entry.reasons) {
        // reason 可能是逗号分隔的多个标签
        const tags = r.split(/[,，;；]/).map((t: string) => t.trim()).filter(Boolean);
        for (const tag of tags) {
          reasonTagCount[tag] = (reasonTagCount[tag] || 0) + 1;
        }
      }
    }

    const topReasonTags = Object.entries(reasonTagCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return NextResponse.json({
      totalFeedbacks: allFeedback?.length || 0,
      totalLessons: stats.length,
      overallUnderstoodRate: allFeedback && allFeedback.length > 0
        ? Math.round((allFeedback.filter((f: { understood: boolean }) => f.understood).length / allFeedback.length) * 100)
        : 0,
      lessonStats: stats,
      topReasonTags,
    });
  } catch (err) {
    console.error('[lesson-feedback/stats] GET error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
