import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

const supabase = getSupabaseClient();

// GET /api/courses — 获取所有课程（按stage+sort_order排序）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // /api/courses?action=next-lesson — 获取推荐下一课+进度摘要（首页引导卡片用）
    if (action === 'next-lesson') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: '未授权' }, { status: 401 });
      }

      const token = authHeader.slice(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return NextResponse.json({ error: '未授权' }, { status: 401 });
      }

      // 获取所有已发布课程（按stage+sort_order排序）
      const { data: lessons, error: lessonsError } = await supabase
        .from('course_lessons')
        .select('id, stage, lesson_number, title, duration_minutes')
        .eq('is_published', true)
        .order('stage', { ascending: true })
        .order('sort_order', { ascending: true });

      if (lessonsError) throw lessonsError;

      // 获取用户进度
      const { data: progress, error: progressError } = await supabase
        .from('user_course_progress')
        .select('lesson_id, status, completed_at, notes')
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      const progressNotesMap = new Map<string, string>();
      for (const p of progress ?? []) {
        if (p.notes) progressNotesMap.set(p.lesson_id, p.notes);
      }

      const completedIds = new Set(
        (progress ?? []).filter(p => p.status === 'completed').map(p => p.lesson_id)
      );
      const inProgressItem = (progress ?? []).find(p => p.status === 'in_progress');
      const totalCompleted = completedIds.size;
      const totalLessons = (lessons ?? []).length;

      // 找推荐下一课：优先in_progress的，否则找第一个未完成的
      let nextLesson: typeof lessons[number] | null = null;
      let isAllCompleted = false;

      if (totalLessons > 0 && totalCompleted >= totalLessons) {
        isAllCompleted = true;
      } else if (inProgressItem) {
        nextLesson = (lessons ?? []).find(l => l.id === inProgressItem.lesson_id) ?? null;
      } else {
        nextLesson = (lessons ?? []).find(l => !completedIds.has(l.id)) ?? null;
      }

      // 阶段进度
      const stageMap: Record<number, { total: number; completed: number; name: string }> = {};
      const stageNames: Record<number, string> = { 1: '角色认知', 2: '目标管理', 3: '团队带教', 4: '业务落地' };
      for (const l of lessons ?? []) {
        if (!stageMap[l.stage]) stageMap[l.stage] = { total: 0, completed: 0, name: stageNames[l.stage] || `阶段${l.stage}` };
        stageMap[l.stage].total++;
        if (completedIds.has(l.id)) stageMap[l.stage].completed++;
      }

      // 最近完成的课程（用于"上次学到哪"）
      const lastCompletedLesson = (progress ?? [])
        .filter(p => p.status === 'completed' && p.completed_at)
        .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0];
      const lastCompleted = lastCompletedLesson
        ? (lessons ?? []).find(l => l.id === lastCompletedLesson.lesson_id) ?? null
        : null;

      return NextResponse.json({
        nextLesson: nextLesson ? {
          id: nextLesson.id,
          stage: nextLesson.stage,
          lesson_number: nextLesson.lesson_number,
          title: nextLesson.title,
          duration_minutes: nextLesson.duration_minutes,
          stageName: stageMap[nextLesson.stage]?.name || '',
        } : null,
        lastCompleted: lastCompleted ? {
          id: lastCompleted.id,
          stage: lastCompleted.stage,
          lesson_number: lastCompleted.lesson_number,
          title: lastCompleted.title,
          stageName: stageMap[lastCompleted.stage]?.name || '',
          completed_at: lastCompletedLesson!.completed_at,
        } : null,
        isAllCompleted,
        totalCompleted,
        totalLessons,
        stageSummary: stageMap,
      });
    }

    // /api/courses?action=learning-context — 获取学习进度+学以致用推荐（前端AI助手页用）
    if (action === 'learning-context') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: '未授权' }, { status: 401 });
      }

      const token = authHeader.slice(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return NextResponse.json({ error: '未授权' }, { status: 401 });
      }

      // 获取所有课程
      const { data: lessons, error: lessonsError } = await supabase
        .from('course_lessons')
        .select('id, stage, lesson_number, title, duration_minutes')
        .eq('is_published', true)
        .order('stage', { ascending: true })
        .order('sort_order', { ascending: true });

      if (lessonsError) throw lessonsError;

      // 获取用户进度
      const { data: progress, error: progressError } = await supabase
        .from('user_course_progress')
        .select('lesson_id, status, completed_at, notes')
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      const completedMap = new Map<string, string>();
      const inProgressSet = new Set<string>();
      const notesMap = new Map<string, string>();
      for (const p of progress ?? []) {
        if (p.status === 'completed' && p.completed_at) {
          completedMap.set(p.lesson_id, p.completed_at);
        } else if (p.status === 'in_progress') {
          inProgressSet.add(p.lesson_id);
        }
        if (p.notes) {
          notesMap.set(p.lesson_id, p.notes);
        }
      }

      const completedLessonNumbers = new Set(
        (lessons ?? []).filter(l => completedMap.has(l.id)).map(l => `${l.stage}.${l.lesson_number}`)
      );
      const totalCompleted = completedMap.size;
      const totalLessons = (lessons ?? []).length;

      // 24小时内完成的课程
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recentlyCompleted = (lessons ?? []).filter(l => {
        const completedAt = completedMap.get(l.id);
        return completedAt && new Date(completedAt) > oneDayAgo;
      }).map(l => ({
        id: l.id,
        stage: l.stage,
        lesson_number: l.lesson_number,
        title: l.title,
        completed_at: completedMap.get(l.id)!,
      }));

      // 学以致用推荐映射
      const TOOL_RECOMMENDATIONS: Record<string, { icon: string; title: string; desc: string; href: string }> = {
        '1.2': { icon: '💬', title: '话术练兵场', desc: '用AI帮你写各类场景标准话术', href: '/ai-assistant?prompt=帮我写一份标准话术' },
        '1.3': { icon: '🔍', title: 'AI质检助手', desc: 'AI帮你快速质检客服聊天记录', href: '/kpi' },
        '1.4': { icon: '💰', title: '成本预警', desc: '实时监控售后赔付，防止超权赔付', href: '/cost-alert' },
        '2.1': { icon: '📋', title: '新人培训模板', desc: '7天新人培训全套模板+考核标准', href: '/training' },
        '3.4': { icon: '📊', title: 'KPI管理工具', desc: '在线制定和追踪团队KPI', href: '/kpi' },
        '4.1': { icon: '📝', title: 'SOP模板库', desc: '三段式SOP编写模板+落地检查清单', href: '/training' },
        '4.3': { icon: '✅', title: '体系自检10+12问', desc: '10条自查+12条灵魂问，精准定位管理漏洞', href: '/learning-center' },
      };

      // 根据已完成课程推荐工具
      const recommendations: { icon: string; title: string; desc: string; href: string; fromLesson: string }[] = [];
      for (const [lessonKey, tool] of Object.entries(TOOL_RECOMMENDATIONS)) {
        if (completedLessonNumbers.has(lessonKey)) {
          recommendations.push({ ...tool, fromLesson: lessonKey });
        }
      }

      // 全部完成时追加体系自检
      if (totalCompleted >= totalLessons && totalLessons > 0 && !recommendations.find(r => r.fromLesson === '4.3')) {
        recommendations.push({
          icon: '✅',
          title: '体系自检10+12问',
          desc: '10条自查+12条灵魂问，精准定位管理漏洞',
          href: '/learning-center',
          fromLesson: 'all',
        });
      }

      return NextResponse.json({
        recentlyCompleted,
        recommendations,
        totalCompleted,
        totalLessons,
        isAllCompleted: totalCompleted >= totalLessons && totalLessons > 0,
        completedLessonNumbers: [...completedLessonNumbers],
      });
    }

    // /api/courses?action=progress — 获取当前用户学习进度
    if (action === 'progress') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: '未授权' }, { status: 401 });
      }

      const token = authHeader.slice(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return NextResponse.json({ error: '未授权' }, { status: 401 });
      }

      const { data: progress, error: progressError } = await supabase
        .from('user_course_progress')
        .select('lesson_id, status, completed_at, exercise_submitted, notes')
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      // 计算各阶段进度
      const { data: lessons, error: lessonsError } = await supabase
        .from('course_lessons')
        .select('id, stage')
        .eq('is_published', true);

      if (lessonsError) throw lessonsError;

      const stageMap: Record<number, { total: number; completed: number }> = {};
      for (const l of lessons ?? []) {
        if (!stageMap[l.stage]) stageMap[l.stage] = { total: 0, completed: 0 };
        stageMap[l.stage].total++;
      }

      const completedIds = new Set((progress ?? []).filter(p => p.status === 'completed').map(p => p.lesson_id));
      for (const l of lessons ?? []) {
        if (completedIds.has(l.id)) {
          stageMap[l.stage].completed++;
        }
      }

      return NextResponse.json({
        progress: progress ?? [],
        stageSummary: stageMap,
        totalCompleted: (progress ?? []).filter(p => p.status === 'completed').length,
        totalLessons: (lessons ?? []).length,
      });
    }

    // 默认：获取所有课程列表
    const { data: courses, error } = await supabase
      .from('course_lessons')
      .select('*')
      .eq('is_published', true)
      .order('stage', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) throw error;

    // 按阶段分组
    const grouped: Record<number, typeof courses> = {};
    for (const c of courses ?? []) {
      if (!grouped[c.stage]) grouped[c.stage] = [];
      grouped[c.stage].push(c);
    }

    return NextResponse.json({ courses: courses ?? [], grouped });
  } catch (err) {
    console.error('[Courses GET] Error:', err);
    return NextResponse.json({ error: '获取课程失败' }, { status: 500 });
  }
}

// PATCH /api/courses — 更新学习进度（标记开始/完成）
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
    const { lesson_id, status, exercise_submitted, notes } = body as {
      lesson_id: string;
      status?: 'not_started' | 'in_progress' | 'completed';
      exercise_submitted?: boolean;
      notes?: string;
    };

    if (!lesson_id) {
      return NextResponse.json({ error: '缺少lesson_id' }, { status: 400 });
    }

    // 验证课程存在
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lessons')
      .select('id')
      .eq('id', lesson_id)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: '课程不存在' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === 'completed') updateData.completed_at = new Date().toISOString();
      if (status === 'in_progress') updateData.status = 'in_progress';
    }
    if (exercise_submitted !== undefined) {
      updateData.exercise_submitted = exercise_submitted;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Upsert
    const { data: existing } = await supabase
      .from('user_course_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('lesson_id', lesson_id)
      .single();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('user_course_progress')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('user_course_progress')
        .insert({
          user_id: user.id,
          lesson_id,
          ...updateData,
        })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ progress: result });
  } catch (err) {
    console.error('[Courses PATCH] Error:', err);
    return NextResponse.json({ error: '更新进度失败' }, { status: 500 });
  }
}

// PUT /api/courses — 管理员更新课程内容（video_url/video_duration等）
export async function PUT(request: NextRequest) {
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

    // 验证管理员权限
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !['admin', 'enterprise_admin'].includes(userData.role)) {
      return NextResponse.json({ error: '无权限，仅管理员可更新课程内容' }, { status: 403 });
    }

    const body = await request.json();
    const { lesson_id, video_url, video_duration } = body as {
      lesson_id: string;
      video_url?: string;
      video_duration?: string;
    };

    if (!lesson_id) {
      return NextResponse.json({ error: '缺少lesson_id' }, { status: 400 });
    }

    const updateData: Record<string, string> = {};
    if (video_url !== undefined) updateData.video_url = video_url;
    if (video_duration !== undefined) updateData.video_duration = video_duration;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('course_lessons')
      .update(updateData)
      .eq('id', lesson_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: '课程不存在' }, { status: 404 });
    }

    return NextResponse.json({ lesson: data });
  } catch (err) {
    console.error('[Courses PUT] Error:', err);
    return NextResponse.json({ error: '更新课程失败' }, { status: 500 });
  }
}
