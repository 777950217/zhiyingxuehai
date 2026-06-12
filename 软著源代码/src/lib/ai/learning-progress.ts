import { getSupabaseClient } from "@/storage/database/supabase-client";

const STAGE_NAMES: Record<number, string> = {
  1: '角色认知',
  2: '目标管理',
  3: '团队带教',
  4: '业务落地',
};

/**
 * 获取用户学习进度并格式化为AI系统提示词片段
 * @param userId 用户ID
 * @returns 格式化的学习进度prompt片段，如果没有进度则返回空字符串
 */
export async function getLearningProgressPrompt(
  userId: string
): Promise<string> {
  if (!userId) return "";

  try {
    const supabase = getSupabaseClient();

    // 获取所有已发布课程
    const { data: lessons, error: lessonsError } = await supabase
      .from("course_lessons")
      .select("id, stage, lesson_number, title, learning_outcome")
      .eq("is_published", true)
      .order("stage", { ascending: true })
      .order("sort_order", { ascending: true });

    if (lessonsError || !lessons || lessons.length === 0) {
      return "";
    }

    // 获取用户进度
    const { data: progress, error: progressError } = await supabase
      .from("user_course_progress")
      .select("lesson_id, status, completed_at")
      .eq("user_id", userId);

    if (progressError) {
      return "";
    }

    const completedMap = new Map<string, string>(); // lesson_id -> completed_at
    const inProgressSet = new Set<string>();
    for (const p of progress ?? []) {
      if (p.status === "completed" && p.completed_at) {
        completedMap.set(p.lesson_id, p.completed_at);
      } else if (p.status === "in_progress") {
        inProgressSet.add(p.lesson_id);
      }
    }

    if (completedMap.size === 0 && inProgressSet.size === 0) {
      return "";
    }

    // 构建已完成课程列表
    const completedLessons = lessons.filter((l) => completedMap.has(l.id));
    const inProgressLessons = lessons.filter((l) => inProgressSet.has(l.id));

    // 计算阶段进度
    const stageProgress: Record<number, { completed: number; total: number }> = {};
    for (const l of lessons) {
      if (!stageProgress[l.stage]) stageProgress[l.stage] = { completed: 0, total: 0 };
      stageProgress[l.stage].total++;
      if (completedMap.has(l.id)) stageProgress[l.stage].completed++;
    }

    // 找到当前阶段
    let currentStage = 1;
    for (const [stage, prog] of Object.entries(stageProgress)) {
      if (prog.completed > 0) currentStage = Math.max(currentStage, Number(stage));
    }

    // 构建提示词
    const parts: string[] = [];

    if (completedLessons.length > 0) {
      const lessonList = completedLessons
        .map((l) => `${l.stage}.${l.lesson_number} ${l.title}`)
        .join("、");
      parts.push(`该用户已完成以下课程：${lessonList}。`);
    }

    if (inProgressLessons.length > 0) {
      const inProgressList = inProgressLessons
        .map((l) => `${l.stage}.${l.lesson_number} ${l.title}`)
        .join("、");
      parts.push(`正在学习：${inProgressList}。`);
    }

    // 当前学习阶段
    const stageName = STAGE_NAMES[currentStage] || `阶段${currentStage}`;
    const sp = stageProgress[currentStage];
    if (sp) {
      parts.push(`当前学习阶段：${stageName}（${sp.completed}/${sp.total}完成）。`);
    }

    // 下一阶段
    const nextStage = currentStage + 1;
    if (STAGE_NAMES[nextStage] && stageProgress[nextStage]) {
      parts.push(`下一阶段：${STAGE_NAMES[nextStage]}。`);
    }

    // 核心指导
    parts.push("请根据用户的学习进度，优先推荐已学课程相关的落地工具和实操建议，帮助用户学以致用。");

    // 检查24小时内完成的课程（用于主动引导）
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentlyCompleted = completedLessons.filter((l) => {
      const completedAt = completedMap.get(l.id);
      return completedAt && new Date(completedAt) > oneDayAgo;
    });

    if (recentlyCompleted.length > 0) {
      const recentList = recentlyCompleted
        .map((l) => `${l.stage}.${l.lesson_number} ${l.title}`)
        .join("、");
      parts.push(`用户刚完成课程：${recentList}，请主动提供该课程的落地实操建议。`);
    }

    return `\n\n## 用户学习进度\n${parts.join("")}`;
  } catch (error) {
    console.error("获取学习进度失败:", error);
    return "";
  }
}

/**
 * 获取用户学习进度的结构化数据（供前端使用）
 */
export interface LearningProgressInfo {
  completedLessons: { id: string; stage: number; lesson_number: number; title: string }[];
  inProgressLessons: { id: string; stage: number; lesson_number: number; title: string }[];
  recentlyCompleted: { id: string; stage: number; lesson_number: number; title: string; completed_at: string }[];
  totalCompleted: number;
  totalLessons: number;
  isAllCompleted: boolean;
}

export async function getLearningProgressInfo(
  userId: string
): Promise<LearningProgressInfo | null> {
  if (!userId) return null;

  try {
    const supabase = getSupabaseClient();

    const { data: lessons, error: lessonsError } = await supabase
      .from("course_lessons")
      .select("id, stage, lesson_number, title")
      .eq("is_published", true)
      .order("stage", { ascending: true })
      .order("sort_order", { ascending: true });

    if (lessonsError || !lessons) return null;

    const { data: progress, error: progressError } = await supabase
      .from("user_course_progress")
      .select("lesson_id, status, completed_at")
      .eq("user_id", userId);

    if (progressError) return null;

    const completedMap = new Map<string, string>();
    const inProgressSet = new Set<string>();
    for (const p of progress ?? []) {
      if (p.status === "completed" && p.completed_at) {
        completedMap.set(p.lesson_id, p.completed_at);
      } else if (p.status === "in_progress") {
        inProgressSet.add(p.lesson_id);
      }
    }

    const completedLessons = lessons.filter((l) => completedMap.has(l.id));
    const inProgressLessons = lessons.filter((l) => inProgressSet.has(l.id));

    // 24小时内完成的课程
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentlyCompleted = completedLessons
      .filter((l) => {
        const completedAt = completedMap.get(l.id);
        return completedAt && new Date(completedAt) > oneDayAgo;
      })
      .map((l) => ({
        ...l,
        completed_at: completedMap.get(l.id)!,
      }));

    return {
      completedLessons,
      inProgressLessons,
      recentlyCompleted,
      totalCompleted: completedLessons.length,
      totalLessons: lessons.length,
      isAllCompleted: completedLessons.length >= lessons.length && lessons.length > 0,
    };
  } catch (error) {
    console.error("获取学习进度信息失败:", error);
    return null;
  }
}
