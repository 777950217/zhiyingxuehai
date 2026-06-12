import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getQuestionsForStage, pickDailyQuestion } from "@/lib/daily-practice-questions";

// GET /api/daily-practice — 获取今日练习题
// GET /api/daily-practice?action=stats — 获取打卡统计
// GET /api/daily-practice?action=wrong-questions — 获取错题本列表
// GET /api/daily-practice?action=wrong-count — 获取待复习错题数
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
    const userId = user.id;

    const action = request.nextUrl.searchParams.get("action");

    // 统计接口
    if (action === "stats") {
      return handleStats(supabase, userId);
    }

    // 错题本接口
    if (action === "wrong-questions") {
      const stage = request.nextUrl.searchParams.get("stage");
      return handleWrongQuestions(supabase, userId, stage);
    }

    // 待复习错题数量
    if (action === "wrong-count") {
      return handleWrongCount(supabase, userId);
    }

    // 获取今日题目
    return handleGetTodayQuestion(supabase, userId);
  } catch (err) {
    console.error("[daily-practice] GET error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

async function handleGetTodayQuestion(supabase: ReturnType<typeof getSupabaseClient>, userId: string) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // 检查今天是否已答过
  const { data: todayPractice } = await supabase
    .from("daily_practice")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00`)
    .lt("created_at", `${today}T23:59:59`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (todayPractice) {
    // 今天已答过
    return NextResponse.json({
      alreadyAnswered: true,
      practice: todayPractice,
    });
  }

  // 获取用户学习进度，确定当前阶段
  const { data: progressList } = await supabase
    .from("user_course_progress")
    .select("lesson_id, status, completed_at")
    .eq("user_id", userId)
    .eq("status", "completed");

  // 获取所有课程，映射 lesson_id → lesson_number + stage
  const { data: allLessons } = await supabase
    .from("course_lessons")
    .select("id, lesson_number, stage, title");

  const lessonMap = new Map((allLessons || []).map((l: { id: string; lesson_number: number; stage: number }) => [l.id, l]));
  const completedLessonNumbers = new Set<string>();
  let currentStage = 1;

  for (const p of (progressList || [])) {
    const lesson = lessonMap.get(p.lesson_id);
    if (lesson) {
      completedLessonNumbers.add(String(lesson.lesson_number));
      if (lesson.stage >= currentStage) {
        currentStage = lesson.stage;
      }
    }
  }

  // 获取题目池并选取今日题目
  const questionPool = getQuestionsForStage(currentStage, completedLessonNumbers);
  const dailyQuestion = pickDailyQuestion(questionPool, userId, today);

  if (!dailyQuestion) {
    return NextResponse.json({ noQuestion: true });
  }

  // 获取课程标题
  const lessonTitle = allLessons?.find(
    (l: { lesson_number: number }) => l.lesson_number === Number(dailyQuestion.lessonNumber)
  );

  return NextResponse.json({
    alreadyAnswered: false,
    question: {
      lessonNumber: dailyQuestion.lessonNumber,
      lessonTitle: lessonTitle?.title || "",
      questionType: dailyQuestion.questionType,
      question: dailyQuestion.question,
      options: dailyQuestion.options || null,
      correctHint: dailyQuestion.correctHint,
      stage: dailyQuestion.stage,
    },
  });
}

async function handleStats(supabase: ReturnType<typeof getSupabaseClient>, userId: string) {
  // 获取所有答题记录
  const { data: allPractices } = await supabase
    .from("daily_practice")
    .select("created_at, is_correct")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const practices = allPractices || [];
  const totalAnswered = practices.length;
  const correctCount = practices.filter((p: { is_correct: boolean | null }) => p.is_correct === true).length;
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  // 计算连续打卡天数
  let streakDays = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split("T")[0];
    const hasPractice = practices.some((p: { created_at: string }) => {
      const practiceDate = new Date(p.created_at).toISOString().split("T")[0];
      return practiceDate === dateStr;
    });
    if (hasPractice) {
      streakDays++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }

  // 当月打卡日历
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays: { day: number; answered: boolean }[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const hasPractice = practices.some((p: { created_at: string }) => {
      const practiceDate = new Date(p.created_at).toISOString().split("T")[0];
      return practiceDate === dateStr;
    });
    calendarDays.push({ day: d, answered: hasPractice });
  }

  return NextResponse.json({
    totalAnswered,
    correctCount,
    accuracy,
    streakDays,
    calendarDays,
  });
}

async function handleWrongQuestions(supabase: ReturnType<typeof getSupabaseClient>, userId: string, stageStr: string | null) {
  let query = supabase
    .from("wrong_questions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // 按阶段筛选
  if (stageStr) {
    const stage = parseInt(stageStr, 10);
    if (stage >= 1 && stage <= 4) {
      // 1.1-1.4 → stage 1, 2.1-2.4 → stage 2, etc.
      const stageLessons: Record<number, string[]> = {
        1: ["1.1", "1.2", "1.3", "1.4"],
        2: ["2.1", "2.2", "2.3", "2.4"],
        3: ["3.1", "3.2", "3.3", "3.4"],
        4: ["4.1", "4.2", "4.3", "4.4"],
      };
      const lessonNumbers = stageLessons[stage] || [];
      query = query.in("lesson_number", lessonNumbers);
    }
  }

  const { data: wrongList, error } = await query;
  if (error) {
    console.error("[daily-practice] wrong-questions error:", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }

  const items = wrongList || [];
  const totalCount = items.length;
  const reviewedCount = items.filter((w: { reviewed: boolean }) => w.reviewed).length;
  const pendingCount = totalCount - reviewedCount;

  return NextResponse.json({
    items,
    totalCount,
    reviewedCount,
    pendingCount,
  });
}

async function handleWrongCount(supabase: ReturnType<typeof getSupabaseClient>, userId: string) {
  const { count, error } = await supabase
    .from("wrong_questions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("reviewed", false);

  if (error) {
    console.error("[daily-practice] wrong-count error:", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }

  return NextResponse.json({ pendingCount: count || 0 });
}

// POST /api/daily-practice — 提交答案，AI评价
// POST /api/daily-practice?action=review-wrong — 标记错题已复习
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
    const userId = user.id;

    const action = request.nextUrl.searchParams.get("action");

    // 标记错题已复习
    if (action === "review-wrong") {
      return handleReviewWrong(supabase, userId, request);
    }

    // 提交每日一练答案
    return handleSubmitAnswer(supabase, userId, request);
  } catch (err) {
    console.error("[daily-practice] POST error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

async function handleReviewWrong(supabase: ReturnType<typeof getSupabaseClient>, userId: string, request: NextRequest) {
  const body = await request.json();
  const { questionId, markAllReviewed } = body as {
    questionId?: string;
    markAllReviewed?: boolean;
  };

  if (markAllReviewed) {
    // 标记所有待复习为已复习
    const { error } = await supabase
      .from("wrong_questions")
      .update({ reviewed: true })
      .eq("user_id", userId)
      .eq("reviewed", false);

    if (error) {
      console.error("[daily-practice] review-wrong all error:", error);
      return NextResponse.json({ error: "操作失败" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (!questionId) {
    return NextResponse.json({ error: "缺少题目ID" }, { status: 400 });
  }

  const { error } = await supabase
    .from("wrong_questions")
    .update({ reviewed: true })
    .eq("id", questionId)
    .eq("user_id", userId);

  if (error) {
    console.error("[daily-practice] review-wrong error:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

async function handleSubmitAnswer(supabase: ReturnType<typeof getSupabaseClient>, userId: string, request: NextRequest) {
  const body = await request.json();
  const { lessonNumber, question, questionType, userAnswer, options, correctHint } = body as {
    lessonNumber: string;
    question: string;
    questionType: string;
    userAnswer: string;
    options?: string[];
    correctHint?: string;
  };

  if (!lessonNumber || !question || !userAnswer) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }

  // 检查今天是否已答过
  const today = new Date().toISOString().split("T")[0];
  const { data: existingPractice } = await supabase
    .from("daily_practice")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00`)
    .lt("created_at", `${today}T23:59:59`)
    .maybeSingle();

  if (existingPractice) {
    return NextResponse.json({ error: "今天已经答过了" }, { status: 400 });
  }

  // 用AI评价答案
  const config = new Config();
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const client = new LLMClient(config, customHeaders);

  const evaluationPrompt = `你是"职盈学海"客服管理培训的AI教练，负责评价学员的练习答案。

## 评价要求
1. 判断答案是否正确/合理（针对情景判断题和简答题，不要求完全一致，关键思路对即可）
2. 给出1-2句做得好的地方
3. 给出1-2句改进建议
4. 用简洁清晰的语言，年龄偏大的用户要看得懂

## 题目信息
- 课程编号：${lessonNumber}
- 题型：${questionType === 'scenario' ? '情景判断题' : questionType === 'choice' ? '选择题' : '简答题'}
${options ? `- 选项：${options.join(' / ')}` : ''}
- 题目：${question}
- 参考答案要点：${correctHint || '无'}

## 学员答案
${userAnswer}

## 输出格式（严格按此格式）
【评价】正确/基本正确/需改进
【做得好的】1-2句
【改进建议】1-2句`;

  const messages = [
    { role: "system" as const, content: evaluationPrompt },
    { role: "user" as const, content: userAnswer },
  ];

  let aiFeedback = "";
  let isCorrect = false;

  try {
    const llmStream = client.stream(messages, {
      model: "doubao-seed-2-0-lite-260215",
      temperature: 0.3,
    });

    for await (const chunk of llmStream) {
      if (chunk.content) {
        aiFeedback += chunk.content.toString();
      }
    }

    // 解析AI评价结果
    isCorrect = aiFeedback.includes("正确") && !aiFeedback.includes("需改进");
  } catch (aiErr) {
    console.error("[daily-practice] AI evaluation error:", aiErr);
    aiFeedback = "评价生成失败，请稍后再试。";
    isCorrect = false;
  }

  // 保存到数据库
  const { error: insertError } = await supabase
    .from("daily_practice")
    .insert({
      user_id: userId,
      lesson_number: lessonNumber,
      question,
      question_type: questionType,
      user_answer: userAnswer,
      is_correct: isCorrect,
      ai_feedback: aiFeedback,
    });

  if (insertError) {
    console.error("[daily-practice] Insert error:", insertError);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }

  // 答错时，生成详细解析并存入错题本
  if (!isCorrect) {
    try {
      const analysisPrompt = `你是"职盈学海"客服管理培训的AI教练，学员做错了一道题，请生成详细的错题解析。

## 题目信息
- 课程编号：${lessonNumber}
- 题型：${questionType === 'scenario' ? '情景判断题' : questionType === 'choice' ? '选择题' : '简答题'}
${options ? `- 选项：${options.join(' / ')}` : ''}
- 题目：${question}
- 参考答案要点：${correctHint || '无'}
- 学员的错误答案：${userAnswer}

## 输出格式（严格按此格式，每行一个要点）
📖 考查知识点：[这题考的是什么知识点，对应哪节课]
💡 你的答案问题：[错在哪里，忽略了什么]
✅ 正确思路：[应该怎么答，关键点是什么]
🎯 工作中如何规避：[实际工作中怎么避免这个错误]
📚 复习建议：[建议重看哪节课的哪个部分]`;

      const analysisMessages = [
        { role: "system" as const, content: analysisPrompt },
        { role: "user" as const, content: "请生成错题解析" },
      ];

      let aiAnalysis = "";
      const analysisStream = client.stream(analysisMessages, {
        model: "doubao-seed-2-0-lite-260215",
        temperature: 0.3,
      });

      for await (const chunk of analysisStream) {
        if (chunk.content) {
          aiAnalysis += chunk.content.toString();
        }
      }

      // 保存到错题本
      const { error: wrongInsertError } = await supabase
        .from("wrong_questions")
        .insert({
          user_id: userId,
          lesson_number: lessonNumber,
          question,
          question_type: questionType,
          options: options ? options.join("\n") : null,
          user_answer: userAnswer,
          correct_answer: correctHint || "",
          ai_analysis: aiAnalysis,
          reviewed: false,
        });

      if (wrongInsertError) {
        console.error("[daily-practice] Wrong question insert error:", wrongInsertError);
      }
    } catch (analysisErr) {
      console.error("[daily-practice] AI analysis error:", analysisErr);
      // 不影响主流程，继续返回评价结果
    }
  }

  return NextResponse.json({
    isCorrect,
    aiFeedback,
  });
}
