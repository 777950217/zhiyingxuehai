"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  BookOpen, Target, Calendar, Shield, ListChecks,
  Sparkles, Trophy, ChevronDown, ChevronUp, Save,
  FileText, GraduationCap, CheckCircle2, Lock,
} from "lucide-react";

/* ── 模块定义 ── */
interface ModuleDef {
  key: string;
  title: string;
  icon: React.ReactNode;
  hint: string;
  courseRef: string;
  placeholder: string;
  contentField: string;
  aiField: string;
  completedField: string;
}

const MODULES: ModuleDef[] = [
  {
    key: "scripts",
    title: "话术库框�?,
    icon: <BookOpen className="w-5 h-5" />,
    hint: "整理你的客服话术体系——售前咨询、售后处理、投诉应对、促销引导，让团队有「话」可依�?,
    courseRef: "�?-4课「角色认知�? �?-10课「话术体系�?,
    placeholder: "例如：\n一、售前咨询话术\n1. 产品咨询：您好，请问您关注的是哪款产品？我帮您详细介绍一�?..\n2. 价格疑问：这款产品目前活动价是XX，性价比很�?..\n\n二、售后处理话术\n1. 质量问题：非常抱歉给您带来不便，我们马上为您处理...\n2. 物流异常：我帮您查一下物流状态，请稍�?..",
    contentField: "scripts_framework",
    aiField: "scripts_ai_optimized",
    completedField: "scripts_completed",
  },
  {
    key: "kpi",
    title: "KPI方案",
    icon: <Target className="w-5 h-5" />,
    hint: "设定团队核心指标和考核规则——响应时长、解决率、满意度，让团队有「标」可考�?,
    courseRef: "�?-6课「目标管理�? �?1课「KPI管理�?,
    placeholder: "例如：\n一、核心指标\n1. 平均响应时长：≤3分钟（权�?0%）\n2. 首次解决率：�?0%（权�?5%）\n3. 客户满意度：�?0%（权�?5%）\n4. 退货率：≤5%（权�?0%）\n\n二、考核规则\n月度考核，按权重加权计算综合得分...",
    contentField: "kpi_plan",
    aiField: "kpi_ai_optimized",
    completedField: "kpi_completed",
  },
  {
    key: "scheduling",
    title: "排班规则",
    icon: <Calendar className="w-5 h-5" />,
    hint: "规划团队排班方案——班次设置、人力配置、轮换规则，让团队有「班」可上�?,
    courseRef: "�?-8课「团队带教�? �?2课「排班管理�?,
    placeholder: "例如：\n一、班次设置\n1. 早班 8:00-16:00�?人）\n2. 中班 12:00-20:00�?人）\n3. 晚班 16:00-24:00�?人）\n\n二、排班原则\n1. 高峰时段加人�?0:00-12:00, 20:00-22:00）\n2. 大促期间全员到岗\n3. 技能搭配：每班至少1名资深客�?..",
    contentField: "scheduling_rules",
    aiField: "scheduling_ai_optimized",
    completedField: "scheduling_completed",
  },
  {
    key: "quality",
    title: "质检标准",
    icon: <Shield className="w-5 h-5" />,
    hint: "建立质检评分体系——服务态度、专业能力、流程规范，让团队有「质」可检�?,
    courseRef: "�?3-14课「质检评分�?,
    placeholder: "例如：\n一、质检维度与权重\n1. 服务态度�?0%）：用语规范、情绪管理、客户感受\n2. 专业能力�?0%）：产品知识、问题判断、方案准确\n3. 流程规范�?0%）：SOP执行、记录完整、升级及时\n4. 效率指标�?0%）：响应时长、解决时效\n\n二、红线标准（一票否决）\n1. 辱骂客户\n2. 泄露客户隐私\n3. 引导私下交易...",
    contentField: "quality_standards",
    aiField: "quality_ai_optimized",
    completedField: "quality_completed",
  },
  {
    key: "sop",
    title: "SOP清单",
    icon: <ListChecks className="w-5 h-5" />,
    hint: "梳理标准作业流程——售前接待、售后处理、退换货、升级，让团队有「法」可依�?,
    courseRef: "�?9-25课「业务落地�?,
    placeholder: "例如：\n一、售前SOP\n1. 咨询接待（≤30秒响应）\n2. 需求确认（3个关键问题）\n3. 产品推荐（匹配客户需求）\n4. 促单成交（限时优�?赠品引导）\n\n二、售后SOP\n1. 投诉接收（记录客户诉求）\n2. 问题分类（质�?物流/描述不符）\n3. 处理方案（≤24小时响应）\n4. 回访确认�?日内回访�?..",
    contentField: "sop_checklist",
    aiField: "sop_ai_optimized",
    completedField: "sop_completed",
  },
];

/* ── 类型 ── */
interface PlanData {
  id?: string;
  scripts_framework?: string;
  scripts_ai_optimized?: string;
  scripts_completed?: boolean;
  kpi_plan?: string;
  kpi_ai_optimized?: string;
  kpi_completed?: boolean;
  scheduling_rules?: string;
  scheduling_ai_optimized?: string;
  scheduling_completed?: boolean;
  quality_standards?: string;
  quality_ai_optimized?: string;
  quality_completed?: boolean;
  sop_checklist?: string;
  sop_ai_optimized?: string;
  sop_completed?: boolean;
  progress?: number;
  is_graduated?: boolean;
  graduated_at?: string;
  generated_doc?: string;
}

/* ── 组件 ── */
export default function ManagementPlanPage() {
  const { profile, authFetch } = useAuth();
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState<string | null>("scripts");
  const [editContents, setEditContents] = useState<Record<string, string>>({});
  const [aiResults, setAiResults] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [showAiResult, setShowAiResult] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  const [showDoc, setShowDoc] = useState(false);

  const companyId = profile?.companyId;
  const userId = profile?.id;

  /* 加载数据 */
  const loadPlan = useCallback(async () => {
    if (!userId || !companyId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/management-plan?user_id=${userId}&company_id=${companyId}`);
      const json = await res.json();
      if (json.data) {
        setPlanData(json.data);
        // 初始化编辑内�?
        const contents: Record<string, string> = {};
        const aiRes: Record<string, string> = {};
        const aiVisible: Record<string, boolean> = {};
        for (const m of MODULES) {
          contents[m.key] = (json.data as Record<string, unknown>)[m.contentField] as string || "";
          const aiContent = (json.data as Record<string, unknown>)[m.aiField] as string;
          if (aiContent) {
            aiRes[m.key] = aiContent;
            aiVisible[m.key] = false;
          }
        }
        setEditContents(contents);
        setAiResults(aiRes);
        setShowAiResult(aiVisible);
        if (json.data.generated_doc) {
          setGeneratedDoc(json.data.generated_doc);
        }
      } else {
        setPlanData(null);
        const contents: Record<string, string> = {};
        for (const m of MODULES) contents[m.key] = "";
        setEditContents(contents);
      }
    } catch (e) {
      console.error("加载方案失败", e);
    } finally {
      setLoading(false);
    }
  }, [userId, companyId, authFetch]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  /* 保存模块 */
  const saveModule = async (moduleKey: string) => {
    if (!userId || !companyId) return;
    setSaving((s) => ({ ...s, [moduleKey]: true }));
    try {
      await authFetch("/api/management-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          companyId,
          module: moduleKey,
          content: editContents[moduleKey] || "",
          aiContent: aiResults[moduleKey] || null,
        }),
      });
      await loadPlan();
    } catch (e) {
      console.error("保存失败", e);
    } finally {
      setSaving((s) => ({ ...s, [moduleKey]: false }));
    }
  };

  /* AI优化 */
  const optimizeWithAI = async (moduleKey: string) => {
    setAiLoading((s) => ({ ...s, [moduleKey]: true }));
    setShowAiResult((s) => ({ ...s, [moduleKey]: true }));
    setAiResults((s) => ({ ...s, [moduleKey]: "" }));

    try {
      const res = await fetch("/api/ai/management-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: moduleKey,
          content: editContents[moduleKey] || "",
          userName: profile?.displayName || "主管",
        }),
      });

      if (!res.ok || !res.body) {
        setAiResults((s) => ({ ...s, [moduleKey]: "优化请求失败，请稍后重试" }));
        setAiLoading((s) => ({ ...s, [moduleKey]: false }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullText += data.content;
                setAiResults((s) => ({ ...s, [moduleKey]: fullText }));
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch (e) {
      console.error("AI优化失败", e);
      setAiResults((s) => ({ ...s, [moduleKey]: "优化出错，请稍后重试" }));
    } finally {
      setAiLoading((s) => ({ ...s, [moduleKey]: false }));
    }
  };

  /* 采纳AI结果 */
  const adoptAiResult = (moduleKey: string) => {
    if (aiResults[moduleKey]) {
      setEditContents((s) => ({ ...s, [moduleKey]: aiResults[moduleKey] }));
      setShowAiResult((s) => ({ ...s, [moduleKey]: false }));
    }
  };

  /* 生成方案文档 */
  const generateDoc = async () => {
    if (!userId || !companyId || !planData) return;
    setGenerating(true);
    try {
      const sections = MODULES.map((m) => {
        const content = editContents[m.key] || (planData as Record<string, unknown>)[m.contentField] as string || "";
        return `## ${m.title}\n\n${content}`;
      }).join("\n\n---\n\n");

      const doc = `# 我的管理方案\n\n> 作者：${profile?.displayName || "客服主管"}\n> 生成时间�?{new Date().toLocaleDateString("zh-CN")}\n\n---\n\n${sections}\n\n---\n\n*本文档由"职盈学海"管理系统生成，恭喜你完成了管理方案的输出�?\n`;

      await authFetch("/api/management-plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          companyId,
          action: "generate_doc",
          generatedDoc: doc,
        }),
      });

      setGeneratedDoc(doc);
      setShowDoc(true);
      await loadPlan();
    } catch (e) {
      console.error("生成文档失败", e);
    } finally {
      setGenerating(false);
    }
  };

  /* 进度计算 */
  const progress = planData?.progress ?? 0;
  const isGraduated = planData?.is_graduated ?? false;

  /* ── 渲染 ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-blue-900/60 text-lg">加载�?..</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 标题�?*/}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="w-8 h-8 text-blue-800" />
            <h1 className="text-2xl font-bold text-blue-900">我的管理方案</h1>
          </div>
          <p className="text-base text-slate-600 leading-relaxed">
            学完25课后，输出一份属于你自己的管理方案——离开系统也能带走的核心能力�?
            五个模块逐一填写，每填完一个模块可用「AI帮我优化」�?
          </p>
        </div>

        {/* 进度�?+ 毕业标识 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className={`w-5 h-5 ${progress === 100 ? "text-amber-500" : "text-slate-400"}`} />
              <span className="text-lg font-semibold text-blue-900">
                完成进度 {progress}%
              </span>
            </div>
            {isGraduated && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-4 py-1">
                <CheckCircle2 className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-semibold text-amber-700">已毕�?/span>
              </div>
            )}
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-600 to-sky-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {MODULES.map((m) => {
              const completed = (planData as Record<string, unknown>)?.[m.completedField] as boolean;
              return (
                <div key={m.key} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-full ${completed ? "bg-sky-500" : "bg-slate-300"}`} />
                  <span className="text-xs text-slate-500">{m.title.slice(0, 2)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5个模�?*/}
        <div className="space-y-4">
          {MODULES.map((m) => {
            const isExpanded = expandedModule === m.key;
            const completed = (planData as Record<string, unknown>)?.[m.completedField] as boolean;
            const currentContent = editContents[m.key] || "";
            const aiContent = aiResults[m.key] || "";
            const isAiLoading = aiLoading[m.key] ?? false;
            const isSavingModule = saving[m.key] ?? false;
            const isAiVisible = showAiResult[m.key] ?? false;

            return (
              <div
                key={m.key}
                className={`bg-white rounded-xl shadow-sm border transition-colors ${
                  completed ? "border-sky-200 bg-sky-50/30" : "border-slate-200"
                }`}
              >
                {/* 模块头部 */}
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  onClick={() => setExpandedModule(isExpanded ? null : m.key)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${completed ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-500"}`}>
                      {m.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-blue-900">{m.title}</span>
                        {completed && <CheckCircle2 className="w-4 h-4 text-sky-500" />}
                      </div>
                      <span className="text-sm text-slate-500">{m.courseRef}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>

                {/* 展开内容 */}
                {isExpanded && (
                  <div className="px-5 pb-5">
                    {/* 提示�?*/}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-blue-800 leading-relaxed">{m.hint}</p>
                      </div>
                    </div>

                    {/* 编辑�?*/}
                    <textarea
                      className="w-full h-64 p-4 border border-slate-200 rounded-lg text-base text-slate-800 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 placeholder:text-slate-400"
                      placeholder={m.placeholder}
                      value={currentContent}
                      onChange={(e) => setEditContents((s) => ({ ...s, [m.key]: e.target.value }))}
                    />

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => saveModule(m.key)}
                        disabled={isSavingModule}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-800 text-white rounded-lg text-base font-medium hover:bg-blue-900 disabled:opacity-50 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {isSavingModule ? "保存�?.." : "保存"}
                      </button>
                      <button
                        type="button"
                        onClick={() => optimizeWithAI(m.key)}
                        disabled={isAiLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white rounded-lg text-base font-medium hover:bg-sky-600 disabled:opacity-50 transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                        {isAiLoading ? "AI优化�?.." : "AI帮我优化"}
                      </button>
                    </div>

                    {/* AI优化结果 */}
                    {isAiVisible && (aiContent || isAiLoading) && (
                      <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Sparkles className="w-4 h-4 text-sky-500" />
                            <span className="text-sm font-semibold">AI优化建议</span>
                          </div>
                          {!isAiLoading && aiContent && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => adoptAiResult(m.key)}
                                className="text-sm text-sky-600 hover:text-sky-700 font-medium"
                              >
                                采纳此方�?
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowAiResult((s) => ({ ...s, [m.key]: false }))}
                                className="text-sm text-slate-400 hover:text-slate-600"
                              >
                                收起
                              </button>
                            </div>
                          )}
                        </div>
                        {isAiLoading ? (
                          <div className="flex items-center gap-2 text-slate-500">
                            <div className="animate-spin w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full" />
                            <span className="text-sm">AI正在优化中，请稍�?..</span>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{aiContent}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 生成方案文档 */}
        {progress === 100 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-amber-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-amber-600" />
              <h2 className="text-xl font-bold text-blue-900">生成方案文档</h2>
            </div>
            <p className="text-base text-slate-600 mb-4">
              五个模块全部填写完成！点击下方按钮，系统将自动生成完整的管理方案文档�?
            </p>
            {!isGraduated ? (
              <button
                type="button"
                onClick={generateDoc}
                disabled={generating}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg text-lg font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                <Trophy className="w-5 h-5" />
                {generating ? "生成�?.." : "生成方案文档"}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">方案文档已生成，恭喜毕业�?/span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDoc(!showDoc)}
                  className="text-base text-blue-700 hover:text-blue-900 font-medium underline"
                >
                  {showDoc ? "收起文档" : "查看方案文档"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 方案文档展示 */}
        {showDoc && generatedDoc && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="prose max-w-none text-slate-800 whitespace-pre-wrap text-base leading-relaxed">
              {generatedDoc}
            </div>
          </div>
        )}

        {/* 毕业标识�?*/}
        {isGraduated && (
          <div className="mt-8 bg-gradient-to-br from-amber-50 to-sky-50 rounded-xl border border-amber-200 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                <GraduationCap className="w-10 h-10 text-amber-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-blue-900 mb-2">恭喜你完成管理方案！</h2>
            <p className="text-base text-slate-600">
              你已经输出了属于自己的管理方案，这是你学完课程后最核心的收获�?
              <br />离开系统，这套方案依然可以指导你的日常管理�?
            </p>
            {planData?.graduated_at && (
              <p className="text-sm text-slate-400 mt-3">
                毕业时间：{new Date(planData.graduated_at).toLocaleDateString("zh-CN")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
