import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * POST /api/onboarding-tasks/complete
 * 完成单个入职任务
 *
 * Body:
 *   - task_id: 任务ID (required)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { task_id } = body;

    if (!task_id) {
      return NextResponse.json({ error: 'task_id必填' }, { status: 400 });
    }

    // 1. 查询任务记录
    const { data: task, error: fetchError } = await supabase
      .from('onboarding_tasks')
      .select('id, company_id, user_id, agent_id, day, title, task_type, is_completed')
      .eq('id', task_id)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    if (task.is_completed) {
      return NextResponse.json({ error: '任务已完成，无需重复操作', data: task }, { status: 200 });
    }

    const now = new Date().toISOString();

    // 2. 标记任务完成
    const { data: updatedTask, error: updateError } = await supabase
      .from('onboarding_tasks')
      .update({
        is_completed: true,
        completed_at: now,
        updated_at: now,
      })
      .eq('id', task_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 3. 更新 onboarding_progress 中的 completed_days 和 current_day
    const { data: progress } = await supabase
      .from('onboarding_progress')
      .select('id, current_day, completed_days, total_days')
      .eq('user_id', task.user_id)
      .eq('company_id', task.company_id || '')
      .maybeSingle();

    if (progress) {
      // 统计该用户当天所有任务是否都已完成
      const { data: dayTasks } = await supabase
        .from('onboarding_tasks')
        .select('id, is_completed')
        .eq('user_id', task.user_id)
        .eq('company_id', task.company_id || '')
        .eq('day', task.day);

      const allDayCompleted = (dayTasks || []).length > 0 && dayTasks!.every(t => t.is_completed);

      const newCompletedDays = allDayCompleted
        ? Math.max(progress.completed_days, task.day)
        : progress.completed_days;

      const newCurrentDay = allDayCompleted && task.day >= progress.current_day
        ? Math.min(task.day + 1, progress.total_days)
        : progress.current_day;

      const allDone = newCompletedDays >= progress.total_days;

      const { error: progressError } = await supabase
        .from('onboarding_progress')
        .update({
          completed_days: newCompletedDays,
          current_day: newCurrentDay,
          completed_at: allDone ? now : null,
          updated_at: now,
        })
        .eq('id', progress.id);

      if (progressError) {
        console.error('[API] 更新onboarding_progress失败:', progressError);
      }

      // 4. 联动：所有天数完成 → 更新 onboarding_records step3 为已完成
      if (allDone) {
        const { data: onboardingRecord } = await supabase
          .from('onboarding_records')
          .select('id, step3_status')
          .eq('user_id', task.user_id)
          .eq('company_id', task.company_id || '')
          .maybeSingle();

        if (onboardingRecord && onboardingRecord.step3_status !== '已完成') {
          await supabase
            .from('onboarding_records')
            .update({ step3_status: '已完成', updated_at: now })
            .eq('id', onboardingRecord.id);
        }
      }
    }

    // 5. 联动：Day 6 完成 → 增加AI使用次数
    if (task.day === 6) {
      try {
        // 检查Day 6所有任务是否都完成
        const { data: day6Tasks } = await supabase
          .from('onboarding_tasks')
          .select('id, is_completed')
          .eq('user_id', task.user_id)
          .eq('company_id', task.company_id || '')
          .eq('day', 6);

        const allDay6Completed = (day6Tasks || []).length > 0 && day6Tasks!.every(t => t.is_completed);

        if (allDay6Completed && task.company_id) {
          // 增加企业AI使用次数
          const { data: company } = await supabase
            .from('companies')
            .select('id, ai_credits_remaining')
            .eq('id', task.company_id)
            .single();

          if (company) {
            const bonusCredits = 10;
            await supabase
              .from('companies')
              .update({
                ai_credits_remaining: (company.ai_credits_remaining || 0) + bonusCredits,
                updated_at: now,
              })
              .eq('id', company.id);
          }

          // 更新 onboarding_records step4 为已完成 + agents training_stage 为独立上岗
          const { data: onboardingRecord } = await supabase
            .from('onboarding_records')
            .select('id, step4_status, agent_id')
            .eq('user_id', task.user_id)
            .eq('company_id', task.company_id || '')
            .maybeSingle();

          if (onboardingRecord && onboardingRecord.step4_status !== '已完成') {
            await supabase
              .from('onboarding_records')
              .update({ step4_status: '已完成', updated_at: now })
              .eq('id', onboardingRecord.id);

            // 同步更新agents表training_stage
            if (onboardingRecord.agent_id) {
              await supabase
                .from('agents')
                .update({ training_stage: '独立上岗', updated_at: now })
                .eq('id', onboardingRecord.agent_id);
            }
          }
        }
      } catch (bonusErr) {
        console.error('[API] Day 6联动奖励失败:', bonusErr);
        // 不影响主流程
      }
    }

    // 6. 联动：特定类型任务完成后更新 training_progress
    if (task.task_type === 'learn' || task.task_type === 'quiz') {
      try {
        const { data: course } = await supabase
          .from('courses')
          .select('id')
          .eq('title', task.title)
          .maybeSingle();

        if (course) {
          await supabase
            .from('learning_records')
            .upsert({
              user_id: task.user_id,
              course_id: course.id,
              progress: 100,
              completed: true,
              completed_at: now,
              updated_at: now,
            }, { onConflict: 'user_id,course_id' });
        }
      } catch (learnErr) {
        console.error('[API] 学习记录联动失败:', learnErr);
      }
    }

    return NextResponse.json({
      data: updatedTask,
      message: '任务已完成',
    });
  } catch (err) {
    console.error('[API] POST /onboarding-tasks/complete error:', err);
    return NextResponse.json({ error: '完成任务失败' }, { status: 500 });
  }
}
