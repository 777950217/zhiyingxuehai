import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getCustomKnowledgePrompt } from '@/lib/ai/custom-knowledge';
import { getCompanyProfileData, buildCompanyProfilePrompt, verifyCompanyAccess } from '@/lib/ai/company-profile';

const SCRIPT_GEN_PROMPT = `你是"职盈学海"话术专家，专注于卫浴行业客服话术创作。

## 任务
根据用户描述的场景/问题，生成专业的客服话术。

## 输出格式（严格遵守，不要输出其他内容）

【话术内容】
直接给出一段完整的话术文本，要求：
- 口语化、有同理心，像真人客服
- 用"姐""哥""您"称呼，不用"亲"
- 先安抚情绪，再引导配合
- 承诺具体，不说空话
- 长度100-200字

【话术要点】
列出3个要点，每点一句话，说明这段话术的关键技巧

【适用场景】
一句话说明什么情况下使用这段话术`;

const SCRIPT_OPTIMIZE_PROMPT = `你是"职盈学海"话术优化专家，专注于卫浴行业客服话术优化。

## 任务
对给定的话术进行优化，使其更加专业、有效。

## 输出格式（严格遵守，不要输出其他内容）

【优化后话术】
直接给出优化后的完整话术文本，要求：
- 保留原话术核心意思
- 更加口语化、自然
- 增强说服力和同理心
- 长度100-200字

【优化说明】
列出2-3个优化点，说明为什么这样改更好`;

const PERSONAL_SCRIPT_GEN_PROMPT = `你是"职盈学海"话术专家，擅长各行业电商客服话术创作。

## 任务
根据用户描述的场景/问题，生成专业的通用客服话术。不限行业，适用于各类电商客服场景（服装、美妆、食品、3C、家居等）。

## 输出格式（严格遵守，不要输出其他内容）

【话术内容】
直接给出一段完整的话术文本，要求：
- 口语化、有同理心，像真人客服
- 用"姐""哥""您"称呼，不用"亲"
- 先安抚情绪，再引导配合
- 承诺具体，不说空话
- 长度100-200字

【话术要点】
列出3个要点，每点一句话，说明这段话术的关键技巧

【适用场景】
一句话说明什么情况下使用这段话术`;

const PERSONAL_SCRIPT_OPTIMIZE_PROMPT = `你是"职盈学海"话术优化专家，擅长各行业电商客服话术优化。

## 任务
对给定的话术进行优化，使其更加专业、有效。不限行业，适用于各类电商客服场景。

## 输出格式（严格遵守，不要输出其他内容）

【优化后话术】
直接给出优化后的完整话术文本，要求：
- 保留原话术核心意思
- 更加口语化、自然
- 增强说服力和同理心
- 长度100-200字

【优化说明】
列出2-3个优化点，说明为什么这样改更好`;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, scene, originalScript, category, userId, companyId: claimedCompanyId } = body;

  // ── 后端校验 companyId ──
  let verifiedCompanyId: string | null = null;
  if (userId && claimedCompanyId) {
    verifiedCompanyId = await verifyCompanyAccess(userId, claimedCompanyId);
    if (!verifiedCompanyId) {
      return NextResponse.json({ error: "无权访问该企业数据" }, { status: 403 });
    }
  }

  if (!type || (type === "generate" && !scene)) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }

  // Credits check + fetch role
  let isPersonalUser = false;
  if (userId) {
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("remaining_credits, role")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "用户信息异常" }, { status: 401 });
    }

    isPersonalUser = userData.role === 'personal_user' || userData.role === 'efficiency_user';
    // personal_user and efficiency_user are never hard-blocked by credits
    if (!isPersonalUser) {
      const credits = userData.remaining_credits ?? 0;
      if (credits <= 0) {
        return NextResponse.json(
          { error: "当日免费次数已用完，明日再来", creditsExhausted: true },
          { status: 403 }
        );
      }
    }
  }

  const config = new Config();
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const client = new LLMClient(config, customHeaders);

  // Fetch company profile for context — 移至 system prompt，不再注入 user message
  const profileData = await getCompanyProfileData(verifiedCompanyId || "");
  const companyProfilePrompt = buildCompanyProfilePrompt(profileData);
  const customKnowledge = verifiedCompanyId ? await getCustomKnowledgePrompt(verifiedCompanyId) : '';

  // 获取用户行业档案上下文
  let industryProfilePrompt: string | null = null;
  if (userId) {
    const supabase = getSupabaseClient();
    const { data: userData2 } = await supabase
      .from('users')
      .select('industry, industry_profile_completed')
      .eq('id', userId)
      .single();

    if (userData2?.industry_profile_completed && userData2?.industry) {
      const { data: profileData2 } = await supabase
        .from('user_industry_profiles')
        .select('industry, main_product, material, team_size, profile_data')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profileData2) {
        const pd = profileData2.profile_data as Record<string, string[]> | null;
        const materialSuffix = profileData2.material ? `（${profileData2.material}）` : '';
        const promptParts = [`你是一位电商客服管理专家。用户来自${profileData2.industry}行业，主营${profileData2.main_product}${materialSuffix}，团队${profileData2.team_size}人。请结合用户行业特点回答。`];
        if (pd?.complaint_types?.length) promptParts.push(`该行业常见客诉：${pd.complaint_types.join('、')}`);
        if (pd?.script_directions?.length) promptParts.push(`常用话术方向：${pd.script_directions.join('、')}`);
        industryProfilePrompt = promptParts.join('\n');
      }
    }
  }

  let systemPrompt = "";
  let userMessage = "";

  if (type === "generate") {
    systemPrompt = isPersonalUser ? PERSONAL_SCRIPT_GEN_PROMPT : SCRIPT_GEN_PROMPT;
    let msg = `场景/问题：${scene}`;
    if (category) msg += `\n话术分类：${category}`;
    userMessage = msg;
  } else if (type === "optimize") {
    systemPrompt = isPersonalUser ? PERSONAL_SCRIPT_OPTIMIZE_PROMPT : SCRIPT_OPTIMIZE_PROMPT;
    userMessage = `原始话术：${originalScript}`;
    if (scene) userMessage += `\n优化方向：${scene}`;
  } else {
    return NextResponse.json({ error: "无效的type参数" }, { status: 400 });
  }

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...(companyProfilePrompt ? [{ role: "system" as const, content: companyProfilePrompt }] : []),
    ...(industryProfilePrompt ? [{ role: "system" as const, content: industryProfilePrompt }] : []),
    ...(customKnowledge ? [{ role: "system" as const, content: customKnowledge }] : []),
    { role: "user" as const, content: userMessage },
  ];

  const encoder = new TextEncoder();
  let aiCallSucceeded = false;
  let fullAIResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const llmStream = client.stream(messages, {
          model: "doubao-seed-2-0-lite-260215",
          temperature: 0.8,
        });

        for await (const chunk of llmStream) {
          if (chunk.content) {
            const text = chunk.content.toString();
            fullAIResponse += text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
            );
            aiCallSucceeded = true;
          }
        }

        // Deduct credit after successful AI call (skip for personal/efficiency)
        let creditsRemaining: number | null = null;
        if (aiCallSucceeded && userId && !isPersonalUser) {
          try {
            const supabase = getSupabaseClient();
            const { data: currentData } = await supabase
              .from("users")
              .select("remaining_credits")
              .eq("id", userId)
              .single();

            if (currentData && (currentData.remaining_credits ?? 0) > 0) {
              const newCredits = (currentData.remaining_credits ?? 1) - 1;
              await supabase
                .from("users")
                .update({ remaining_credits: newCredits })
                .eq("id", userId);
              creditsRemaining = newCredits;
            }
          } catch (deductErr) {
            console.error("[AI Script] Credit deduction error:", deductErr);
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, creditsRemaining })}\n\n`
          )
        );

        // Write usage record to problem_solutions
        if (aiCallSucceeded && userId) {
          try {
            const supabase = getSupabaseClient();
            await supabase.from('problem_solutions').insert({
              company_id: verifiedCompanyId || null,
              user_id: userId,
              query: type === 'generate' ? scene : `话术优化：${originalScript?.substring(0, 100)}`,
              category: category || '话术',
              judgment: type === 'generate' ? '话术生成' : '话术优化',
              steps: '',
              script: fullAIResponse.substring(0, 2000),
              solution_used: false,
              diagnosis_type: 'script',
              ai_solution: fullAIResponse.substring(0, 4000),
              is_visible: true,
            });
          } catch (insertErr) {
            console.error("[AI Script] Usage record insert error:", insertErr);
          }
        }

        controller.close();
      } catch (error) {
        console.error("[AI Script] Stream error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "AI助手暂时无法响应，请稍后重试" })}\n\n`
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
