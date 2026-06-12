import { NextRequest } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getCustomKnowledgePrompt } from "@/lib/ai/custom-knowledge";
import { getCompanyProfileData, buildCompanyProfilePrompt, verifyCompanyAccess } from "@/lib/ai/company-profile";

const KNOWLEDGE_SYSTEM_PROMPT = `你是"职盈学海"产品百科助手，专注于卫浴产品的知识查询与解答。

## 你的职责
回答卫浴产品相关的知识性问题，包括：产品规格参数、安装指南、故障排查、配件说明、使用方法、保养维护等。

## 回答范围（仅限以下领域）
- 产品参数与规格（尺寸、功率、水效等级等）
- 安装说明与注意事项
- 产品故障初步判断与排查步骤
- 配件说明与兼容性
- 保修政策与售后服务流程
- 产品使用方法与操作指南
- 保养维护建议

## 边界限制（严格遵守）
如果用户的问题属于以下类型，请直接回复引导语，不要尝试解答：
- 售后纠纷处理（如退货、投诉、赔偿）→ 回复："这类售后处理问题请使用「AI急救站」获取实战方案和话术"
- 客户话术应对（如怎么跟客户说、怎么安抚客户）→ 回复："这类话术应对问题请使用「话术练兵场」进行练习"
- 团队管理问题（如KPI、质检、培训）→ 回复："这类管理问题请联系主管或查看培训中心"

引导语格式：
"🚨 这个问题超出了产品百科的范围。[具体引导语]"

## 回答风格
- 专业、准确、简洁
- 有数据支撑的尽量给数据
- 涉及安全事项的必须强调（如：电气安全、水压限制）
- 如果有企业自定义知识库内容，优先参考
- 不确定的信息标注"建议核实"

## 专业领域
你精通以下卫浴产品的知识：
- 智能马桶：功能说明、安装要求、故障码、配件规格
- 花洒/淋浴系统：水压要求、恒温原理、安装高度
- 浴室柜：材质分类、尺寸标准、排水方式
- 龙头/角阀：接口规格、水压适配、安装方法
- 淋浴房：玻璃标准、五金配件、防水要求
- 卫浴通用：坑距测量、水管规格、保修政策`;

const PERSONAL_KNOWLEDGE_SYSTEM_PROMPT = `你是"职盈学海"产品百科助手，专注于电商产品的知识查询与解答。

## 你的职责
回答电商产品相关的知识性问题，包括：产品规格参数、使用指南、故障排查、配件说明、使用方法、保养维护等。适用于各行业电商客服场景。

## 回答范围（仅限以下领域）
- 产品参数与规格
- 使用说明与注意事项
- 产品故障初步判断与排查步骤
- 配件说明与兼容性
- 保修政策与售后服务流程
- 保养维护建议

## 边界限制（严格遵守）
如果用户的问题属于以下类型，请直接回复引导语，不要尝试解答：
- 售后纠纷处理（如退货、投诉、赔偿）→ 回复："这类售后处理问题请使用「AI急救站」获取实战方案和话术"
- 客户话术应对（如怎么跟客户说、怎么安抚客户）→ 回复："这类话术应对问题请使用「话术练兵场」进行练习"
- 团队管理问题（如KPI、质检、培训）→ 回复："这类管理问题请联系主管或查看培训中心"

引导语格式：
"🚨 这个问题超出了产品百科的范围。[具体引导语]"

## 回答风格
- 专业、准确、简洁
- 有数据支撑的尽量给数据
- 涉及安全事项的必须强调
- 如果有企业自定义知识库内容，优先参考
- 不确定的信息标注"建议核实"
- 适用于各行业电商场景，不限定特定行业`;

export async function POST(request: NextRequest) {
  const { question, companyId: claimedCompanyId, userId, role: userRole } = await request.json();
  const isPersonalOrEfficiency = userRole === 'personal_user' || userRole === 'efficiency_user';

  // ── 后端校验 companyId ──
  let verifiedCompanyId: string | null = null;
  if (userId && claimedCompanyId) {
    verifiedCompanyId = await verifyCompanyAccess(userId, claimedCompanyId);
    if (!verifiedCompanyId) {
      return new Response(JSON.stringify({ error: "无权访问该企业数据" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (!question || !question.trim()) {
    return new Response(JSON.stringify({ error: "请输入您的问题" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 获取产品档案
  const profileData = await getCompanyProfileData(verifiedCompanyId || "");
  const companyProfilePrompt = buildCompanyProfilePrompt(profileData);

  // 获取企业自定义知识（RAG上下文）
  const customKnowledge = await getCustomKnowledgePrompt(verifiedCompanyId || "");

  // 获取用户行业档案上下文
  let industryProfilePrompt: string | null = null;
  if (userId) {
    const supabase = getSupabaseClient();
    const { data: userData } = await supabase
      .from('users')
      .select('industry, industry_profile_completed')
      .eq('id', userId)
      .single();

    if (userData?.industry_profile_completed && userData?.industry) {
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
        const promptParts = [`用户来自${profileData2.industry}行业，主营${profileData2.main_product}${materialSuffix}，团队${profileData2.team_size}人。请结合用户行业特点回答产品知识问题。`];
        if (pd?.complaint_types?.length) promptParts.push(`该行业常见客诉：${pd.complaint_types.join('、')}`);
        industryProfilePrompt = promptParts.join('\n');
      }
    }
  }

  const config = new Config();
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const client = new LLMClient(config, customHeaders);

  const messages = [
    { role: "system" as const, content: isPersonalOrEfficiency ? PERSONAL_KNOWLEDGE_SYSTEM_PROMPT : KNOWLEDGE_SYSTEM_PROMPT },
    ...(companyProfilePrompt ? [{ role: "system" as const, content: companyProfilePrompt }] : []),
    ...(industryProfilePrompt ? [{ role: "system" as const, content: industryProfilePrompt }] : []),
    ...(customKnowledge ? [{ role: "system" as const, content: customKnowledge }] : []),
    { role: "user" as const, content: question },
  ];

  const encoder = new TextEncoder();
  let aiCallSucceeded = false;
  let fullAIResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const llmStream = client.stream(messages, {
          model: "doubao-seed-2-0-lite-260215",
          temperature: 0.5,
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

        // ── Stream done signal ──
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
        );
      } catch (err) {
        console.error("[Knowledge QA] Stream error:", err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "AI服务暂时不可用，请稍后重试" })}\n\n`)
        );
      } finally {
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
