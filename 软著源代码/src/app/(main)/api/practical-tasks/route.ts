import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getPracticalTask } from '@/lib/practical-tasks';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: '未授权，请重新登录' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: '未授权，请重新登录' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const lessonNumber = searchParams.get('lesson_number');

  // 获取实操统计
  if (action === 'stats') {
    const { data: tasks, error } = await supabase
      .from('practical_tasks')
      .select('lesson_number, ai_score')
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const total = tasks?.length || 0;
    const avgScore = total > 0
      ? Math.round(tasks!.reduce((sum: number, t: { ai_score: number | null }) => sum + (t.ai_score || 0), 0) / total)
      : 0;

    // 按阶段统计
    const stageStats: Record<string, { total: number; completed: number; avgScore: number }> = {};
    for (const t of tasks || []) {
      const stage = t.lesson_number.split('.')[0];
      if (!stageStats[stage]) stageStats[stage] = { total: 0, completed: 0, avgScore: 0 };
      stageStats[stage].total++;
      if (t.ai_score !== null) stageStats[stage].completed++;
      stageStats[stage].avgScore += t.ai_score || 0;
    }
    for (const s of Object.values(stageStats)) {
      s.avgScore = s.completed > 0 ? Math.round(s.avgScore / s.completed) : 0;
    }

    return NextResponse.json({ total, avgScore, stageStats });
  }

  // 获取某节课的实操任务（配置+已有提交）
  if (lessonNumber) {
    const taskConfig = getPracticalTask(lessonNumber);
    if (!taskConfig) {
      return NextResponse.json({ config: null, submission: null });
    }

    const { data: submissions, error } = await supabase
      .from('practical_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('lesson_number', lessonNumber)
      .order('submitted_at', { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      config: taskConfig,
      submission: submissions?.[0] || null,
    });
  }

  // 获取所有实操任务完成情况
  const { data: allTasks, error } = await supabase
    .from('practical_tasks')
    .select('lesson_number, ai_score, submitted_at')
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: allTasks || [] });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: '未授权，请重新登录' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: '未授权，请重新登录' }, { status: 401 });
  }

  const body = await request.json();
  const { lessonNumber, submission } = body as {
    lessonNumber: string;
    submission: string;
  };

  if (!lessonNumber || !submission) {
    return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
  }

  // 获取任务配置
  const taskConfig = getPracticalTask(lessonNumber);
  if (!taskConfig) {
    return NextResponse.json({ error: '该课程暂无实操任务' }, { status: 404 });
  }

  // 用AI评分
  const config = new Config();
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const client = new LLMClient(config, customHeaders);

  const scoringPrompt = `你是"职盈学海"客服管理培训的AI教练，负责对学员的实操练习进行评分。

## 任务信息
- 课程编号：${lessonNumber}
- 任务标题：${taskConfig.title}
- 任务描述：${taskConfig.description}
${taskConfig.material ? `- 任务材料：${taskConfig.material}` : ''}

## 评分维度
${taskConfig.scoringDimensions.map((d, i) => `${i + 1}. ${d}`).join('\n')}

## 评分标准
${taskConfig.scoringPrompt}

## 学员提交内容
${submission}

## 输出格式（严格遵守）
请按以下格式输出，不要输出其他内容：

得分：XX分

💡 亮点：
- XXX

📌 改进建议：
- XXX

📚 建议复习：
- XXX`;

  const messages = [{ role: 'user' as const, content: scoringPrompt }];

  let aiFeedback = '';
  let aiScore = 0;

  try {
    const llmStream = client.stream(messages);

    for await (const chunk of llmStream) {
      if (typeof chunk === 'string') {
        aiFeedback += chunk;
      } else if (chunk && typeof chunk === 'object' && 'content' in chunk) {
        aiFeedback += (chunk as { content: string }).content;
      }
    }

    // 提取分数
    const scoreMatch = aiFeedback.match(/得分[：:]\s*(\d+)/);
    if (scoreMatch) {
      aiScore = Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)));
    }
  } catch (err) {
    console.error('AI scoring error:', err);
    aiFeedback = '评分生成失败，请稍后重试';
    aiScore = 0;
  }

  // 保存到数据库（upsert）
  const { data: existing, error: fetchError } = await supabase
    .from('practical_tasks')
    .select('id')
    .eq('user_id', user.id)
    .eq('lesson_number', lessonNumber)
    .limit(1);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (existing && existing.length > 0) {
    // 更新已有记录
    const { error: updateError } = await supabase
      .from('practical_tasks')
      .update({
        task_type: taskConfig.taskType,
        task_content: taskConfig.description,
        user_submission: submission,
        ai_score: aiScore,
        ai_feedback: aiFeedback,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', existing[0].id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    // 新增记录
    const { error: insertError } = await supabase
      .from('practical_tasks')
      .insert({
        user_id: user.id,
        lesson_number: lessonNumber,
        task_type: taskConfig.taskType,
        task_content: taskConfig.description,
        user_submission: submission,
        ai_score: aiScore,
        ai_feedback: aiFeedback,
        submitted_at: new Date().toISOString(),
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    aiScore,
    aiFeedback,
    scoreLevel: aiScore >= 80 ? 'excellent' : aiScore >= 60 ? 'pass' : 'needs_work',
  });
}
