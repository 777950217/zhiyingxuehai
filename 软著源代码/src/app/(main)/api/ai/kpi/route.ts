import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getCustomKnowledgePrompt } from '@/lib/ai/custom-knowledge';
import { getCompanyProfileData, buildCompanyProfilePrompt, verifyCompanyAccess } from '@/lib/ai/company-profile';

const KPI_PROMPTS: Record<string, string> = {
  "售前": `你是职盈学海KPI顾问，专注于卫浴行业售前客服团队KPI设计。

## 任务
为售前客服团队生成一套完整的KPI方案。

## 输出格式（严格遵守）

### 售前客服KPI方案

**一、核心指标（占比60%）**
- 每个指标：名称 / 计算方式 / 目标值 / 权重
- 至少包含：响应时长、转化率、客单价等

**二、过程指标（占比25%）**
- 每个指标：名称 / 计算方式 / 目标值 / 权重

**三、态度指标（占比15%）**
- 每个指标：名称 / 计算方式 / 目标值 / 权重

**四、评判说明**
- 简要说明如何手动评判各指标达成情况
- 建议评判周期和流程

**五、落地建议**
- 3条实施建议`,

  "售后": `你是职盈学海KPI顾问，专注于卫浴行业售后客服团队KPI设计。

## 任务
为售后客服团队生成一套完整的KPI方案。

## 输出格式（严格遵守）

### 售后客服KPI方案

**一、核心指标（占比60%）**
- 每个指标：名称 / 计算方式 / 目标值 / 权重
- 至少包含：问题解决率、客户满意度、退换货处理时长等

**二、过程指标（占比25%）**
- 每个指标：名称 / 计算方式 / 目标值 / 权重

**三、态度指标（占比15%）**
- 每个指标：名称 / 计算方式 / 目标值 / 权重

**四、评判说明**
- 简要说明如何手动评判各指标达成情况
- 建议评判周期和流程

**五、落地建议**
- 3条实施建议`,

  "通用": `你是职盈学海KPI顾问，专注于卫浴行业客服团队通用KPI设计。

## 任务
为客服团队生成一套通用的KPI方案，适用于售前+售后混合团队。

## 输出格式（严格遵守）

### 通用客服KPI方案

**一、核心指标（占比60%）**
- 每个指标：名称 / 计算方式 / 目标值 / 权重

**二、过程指标（占比25%）**
- 每个指标：名称 / 计算方式 / 目标值 / 权重

**三、态度指标（占比15%）**
- 每个指标：名称 / 计算方式 / 目标值 / 权重

**四、评判说明**
- 简要说明如何手动评判各指标达成情况

**五、落地建议**
- 3条实施建议`,

  "薪酬": `你是职盈学海薪酬顾问，专注于卫浴行业客服团队薪酬方案设计。

## 任务
为客服团队设计一套薪酬方案，包含底薪+绩效+提成结构。

## 输出格式（严格遵守）

### 客服团队薪酬方案

**一、薪酬结构**
- 底薪范围 / 绩效基数 / 提成规则

**二、绩效系数**
- 不同KPI得分对应的绩效系数表

**三、提成规则**
- 售前提成 / 售后提成 / 大促提成

**四、薪酬示例**
- 3个不同绩效等级的月收入示例

**五、评判说明**
- 简要说明如何手动评定绩效等级

**六、落地建议**
- 3条实施建议`,
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { kpiType, teamSize, painPoints, goals, extraNote, userId, companyId: claimedCompanyId } = body;

  // ── 后端校验 companyId ──
  let verifiedCompanyId: string | null = null;
  if (userId && claimedCompanyId) {
    verifiedCompanyId = await verifyCompanyAccess(userId, claimedCompanyId);
    if (!verifiedCompanyId) {
      return NextResponse.json({ error: "无权访问该企业数据" }, { status: 403 });
    }
  }

  if (!kpiType || !KPI_PROMPTS[kpiType]) {
    return NextResponse.json({ error: "请选择KPI类型" }, { status: 400 });
  }

  // Credits check (skip for personal/efficiency users)
  if (userId) {
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("remaining_credits, role")
      .eq("id", userId)
      .maybeSingle();

    if (userError || !userData) {
      return NextResponse.json({ error: "用户信息异常" }, { status: 401 });
    }

    const isPersonalOrEfficiency = userData.role === 'personal_user' || userData.role === 'efficiency_user';
    if (!isPersonalOrEfficiency) {
      const credits = userData.remaining_credits ?? 0;
      if (credits <= 0) {
        return NextResponse.json(
          { error: "当日免费次数已用完，明日再来", creditsExhausted: true },
          { status: 403 }
        );
      }
    }
  }

  const systemPrompt = KPI_PROMPTS[kpiType];
  let userMessage = `请生成KPI方案。\n\n团队人数：${teamSize || '5-10人'}`;
  if (painPoints?.length) userMessage += `\n当前痛点：${painPoints.join('、')}`;
  if (goals?.length) userMessage += `\n目标：${goals.join('、')}`;
  if (extraNote) userMessage += `\n其他说明：${extraNote}`;

  // 获取产品档案并构建 system prompt 片段 — 不再注入 user message
  const profileData = await getCompanyProfileData(verifiedCompanyId || "");
  const companyProfilePrompt = buildCompanyProfilePrompt(profileData);

  // Get custom knowledge
  const customKnowledge = verifiedCompanyId ? await getCustomKnowledgePrompt(verifiedCompanyId) : '';

  const config = new Config();
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const client = new LLMClient(config, customHeaders);

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...(companyProfilePrompt ? [{ role: "system" as const, content: companyProfilePrompt }] : []),
    ...(customKnowledge ? [{ role: "system" as const, content: customKnowledge }] : []),
    { role: "user" as const, content: userMessage },
  ];

  const encoder = new TextEncoder();
  let aiCallSucceeded = false;
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const llmStream = client.stream(messages, {
          model: "doubao-seed-2-0-lite-260215",
          temperature: 0.7,
        });

        for await (const chunk of llmStream) {
          if (chunk.content) {
            const text = chunk.content.toString();
            fullContent += text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
            );
            aiCallSucceeded = true;
          }
        }

        // Save to kpi_records & deduct credit after success
        let creditsRemaining: number | null = null;
        if (aiCallSucceeded && userId && verifiedCompanyId) {
          try {
            const supabase = getSupabaseClient();

            // Save to kpi_plans (AI生成的完整方案)
            try {
              await supabase.from("kpi_plans").insert({
                company_id: verifiedCompanyId,
                name: `${kpiType}KPI方案`,
                team_size: teamSize ? parseInt(teamSize) : null,
                team_stage: kpiType,
                focus: JSON.stringify(painPoints || []),
                metrics: fullContent,
                created_by: userId,
              });
            } catch (planErr) {
              console.error("[KPI] Save plan error:", planErr);
            }

            // Save KPI record (元信息)
            await supabase.from("kpi_records").insert({
              company_id: verifiedCompanyId,
              user_id: userId,
              period: kpiType,
              metrics: JSON.stringify({
                kpiType, teamSize, painPoints, goals, extraNote,
              }),
            });

            // Deduct credit (skip for personal/efficiency users)
            const { data: kpiUserData } = await supabase
              .from("users")
              .select("remaining_credits, role")
              .eq("id", userId)
              .maybeSingle();

            const isKpiPersonalOrEfficiency = kpiUserData?.role === 'personal_user' || kpiUserData?.role === 'efficiency_user';

            if (!isKpiPersonalOrEfficiency && kpiUserData && (kpiUserData.remaining_credits ?? 0) > 0) {
              const newCredits = (kpiUserData.remaining_credits ?? 1) - 1;
              await supabase
                .from("users")
                .update({ remaining_credits: newCredits })
                .eq("id", userId);
              creditsRemaining = newCredits;
            }
          } catch (err) {
            console.error("[KPI] Save/deduct error:", err);
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, creditsRemaining, fullContent })}\n\n`
          )
        );
        controller.close();
      } catch (error) {
        console.error("[KPI] Stream error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "AI助手暂时无法响应" })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
