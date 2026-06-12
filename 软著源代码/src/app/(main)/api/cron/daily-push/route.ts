import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { LLMClient, Config } from "coze-coding-dev-sdk";

// ── Bearer token 认证 ──
function verifyCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || "dev-cron-secret";
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === secret;
}

// ── 预设话题列表 ──
const INDUSTRY_TOPICS = [
  { title: "智能马桶市场趋势", prompt: "请简要分析当前智能马桶行业的最新趋势，包括技术升级方向和消费者偏好变化，150字以内" },
  { title: "花洒品类消费升级", prompt: "请简要分析花洒/淋浴系统品类的消费升级趋势，包括恒温花洒、大顶喷等新卖点，150字以内" },
  { title: "浴室柜设计新风向", prompt: "请简要分析浴室柜/卫浴柜的设计趋势，包括材质、风格和收纳创新方向，150字以内" },
  { title: "整装卫浴一体化", prompt: "请简要分析整装卫浴一体化的发展趋势，对卫浴企业的机会和挑战，150字以内" },
  { title: "节水政策与卫浴产品", prompt: "请简要分析国家节水政策对卫浴产品的影响，企业应如何应对，150字以内" },
  { title: "电商卫浴品类增长", prompt: "请简要分析电商平台（抖音/天猫/京东）卫浴品类的增长数据和趋势，150字以内" },
  { title: "卫浴品牌出海机遇", prompt: "请简要分析中国卫浴品牌出海的机遇和挑战，主要目标市场，150字以内" },
  { title: "适老化卫浴产品", prompt: "请简要分析适老化卫浴产品的发展前景，银发经济对卫浴行业的影响，150字以内" },
  { title: "卫浴直播带货趋势", prompt: "请简要分析卫浴行业直播带货的最新趋势，什么品类最适合直播，150字以内" },
  { title: "卫浴售后服务差异化", prompt: "请简要分析卫浴品牌如何通过售后服务差异化竞争，行业最佳实践，150字以内" },
  { title: "智能卫浴与健康监测", prompt: "请简要分析智能卫浴与健康监测结合的最新产品趋势，150字以内" },
  { title: "卫浴安装服务标准化", prompt: "请简要分析卫浴安装服务标准化的进展，如何降低安装投诉率，150字以内" },
];

const PLATFORM_RULE_TOPICS = [
  { title: "抖音电商售后规则更新", platform: "抖音", prompt: "请生成一条抖音电商平台售后规则变动的通知，内容涉及退货时效或仅退款政策的调整，100字以内，要看起来像是真实平台公告的摘要" },
  { title: "天猫发货规范调整", platform: "天猫", prompt: "请生成一条天猫平台发货规范调整的通知，内容涉及发货时效或违规扣分规则的更新，100字以内，要看起来像是真实平台公告的摘要" },
  { title: "京东售后政策变化", platform: "京东", prompt: "请生成一条京东平台售后政策变化的通知，内容涉及上门取件或退货审核流程的调整，100字以内，要看起来像是真实平台公告的摘要" },
  { title: "拼多多仅退款规则", platform: "拼多多", prompt: "请生成一条拼多多仅退款规则变动的通知，内容涉及商家申诉或自动退款门槛的调整，100字以内，要看起来像是真实平台公告的摘要" },
  { title: "抖音直播间违规处罚", platform: "抖音", prompt: "请生成一条抖音直播间违规处罚规则更新的通知，内容涉及卫浴品类敏感词或宣传规范的调整，100字以内" },
  { title: "天猫大促活动规则", platform: "天猫", prompt: "请生成一条天猫大促期间特殊售后规则的通知，内容涉及发货延迟免责或退货延期的调整，100字以内" },
  { title: "电商平台客服响应指标", platform: "通用", prompt: "请生成一条电商平台客服响应考核指标调整的通知，内容涉及回复时效或满意率要求的变化，100字以内" },
];

const DAILY_CASE_SCENARIOS = [
  "客户收到的智能马桶盖板有划痕，要求换新但已安装使用3天，如何处理？",
  "客户反映花洒水压太小，要求退货，但检查发现是客户家水压问题，如何话术引导？",
  "客户买了浴室柜尺寸不合适要求退货，但已超过7天无理由退货期，如何处理？",
  "客户投诉智能马桶感应不灵敏，远程指导后仍无法解决，需要安排师傅上门，如何沟通？",
  "客户在直播间买的马桶收货时陶瓷有裂纹，物流签收了，客户要求全额退款加赔偿，如何处理？",
  "客户使用智能马桶1个月后要求退货，理由是'老婆不喜欢'，已安装使用，如何话术挽留？",
  "客户投诉花洒恒温功能失效，水温忽冷忽热，需要判断是产品问题还是安装问题，如何引导排查？",
  "浴室柜安装师傅上门发现客户家管道位置和产品不匹配，需要改管，客户拒绝付费，如何协调？",
  "客户在拼多多下单后申请仅退款，理由是'质量问题'但无法提供证据，商家如何申诉？",
  "客户投诉马桶冲水声音太大影响邻居，要求退换，但产品本身符合国家标准，如何话术安抚？",
  "智能马桶遥控器失灵，客户情绪激动说'什么破产品'，需要远程排查+情绪安抚，话术怎么写？",
  "客户收到货后迟迟不确认安装时间，催了3次都说'再等等'，如何话术推进安装？",
];

// ── 日期种子轮换 ──
function getDaySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function pickBySeed<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

// ── AI 生成内容 ──
async function generateAIContent(prompt: string): Promise<string> {
  try {
    const config = new Config();
    const client = new LLMClient(config);

    const messages = [
      { role: "system" as const, content: "你是一个卫浴行业信息编辑助手，输出简洁、专业、像真实行业资讯，不要加'好的'等废话前缀。" },
      { role: "user" as const, content: prompt },
    ];

    let result = "";
    const stream = client.stream(messages, {
      model: "doubao-seed-2-0-lite-260215",
      temperature: 0.8,
    });

    for await (const chunk of stream) {
      if (chunk.content) {
        result += chunk.content.toString();
      }
    }
    return result.trim();
  } catch (error) {
    console.error("[daily-push] AI generation failed:", error);
    return "";
  }
}

// ── 为企业下所有用户创建通知 ──
async function createNotificationsForCompany(
  companyId: string,
  type: string,
  title: string,
  content: string,
  platform?: string,
  summary?: string
): Promise<number> {
  const supabase = getSupabaseClient();

  // 获取该企业下所有活跃用户
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "active");

  if (userError || !users || users.length === 0) return 0;

  const notifications = users.map((u: { id: string }) => ({
    company_id: companyId,
    user_id: u.id,
    type,
    title,
    content,
    is_read: false,
    platform: platform || null,
    summary: summary || null,
  }));

  const { error: insertError } = await supabase
    .from("notifications")
    .insert(notifications);

  if (insertError) {
    console.error("[daily-push] Insert notification failed:", insertError);
    return 0;
  }

  return users.length;
}

// ── 主处理逻辑 ──
export async function POST(request: NextRequest) {
  // 验证 Bearer token
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  const seed = getDaySeed();
  const results: Record<string, string> = {};

  // 获取所有活跃企业
  const { data: companies, error: companyError } = await supabase
    .from("companies")
    .select("id, name, plan")
    .or("status.eq.active,status.is.null");

  if (companyError || !companies) {
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }

  // ─── 1. 行业趋势 ───
  const industryTopic = pickBySeed(INDUSTRY_TOPICS, seed);
  const industryContent = await generateAIContent(industryTopic.prompt);
  if (industryContent) {
    let count = 0;
    for (const company of companies) {
      count += await createNotificationsForCompany(
        company.id,
        "industry_trend",
        `行业动态：${industryTopic.title}`,
        industryContent,
        undefined,
        industryTopic.title
      );
    }
    results.industry_trend = `推送 ${count} 条通知`;
  } else {
    results.industry_trend = "AI生成失败，跳过";
  }

  // ─── 2. 规则变动 ───
  const ruleTopic = pickBySeed(PLATFORM_RULE_TOPICS, seed);
  const ruleContent = await generateAIContent(ruleTopic.prompt);
  if (ruleContent) {
    let count = 0;
    for (const company of companies) {
      count += await createNotificationsForCompany(
        company.id,
        "platform_rule",
        `规则变动：${ruleTopic.title}`,
        ruleContent,
        ruleTopic.platform,
        ruleTopic.title
      );
    }
    results.platform_rule = `推送 ${count} 条通知`;
  } else {
    results.platform_rule = "AI生成失败，跳过";
  }

  // ─── 3. 今日场景 ───
  const caseScenario = pickBySeed(DAILY_CASE_SCENARIOS, seed);
  const caseContent = await generateAIContent(
    `你是职盈学海客服培训助手。今日场景：${caseScenario}\n\n请给出：1）问题分析（1句话）；2）处理步骤（3步）；3）可以直接发给客户的话术（1段）。200字以内。`
  );
  if (caseContent) {
    let count = 0;
    for (const company of companies) {
      count += await createNotificationsForCompany(
        company.id,
        "daily_case",
        "今日场景：" + caseScenario.substring(0, 30) + "...",
        caseContent,
        undefined,
        caseScenario
      );
    }
    results.daily_case = `推送 ${count} 条通知`;
  } else {
    results.daily_case = "AI生成失败，跳过";
  }

  // ─── 4. 复盘提醒 ───
  // 检查昨天是否有未完成的质检记录（KPI quality 数据存储在 daily_data 中）
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let reviewCount = 0;
  for (const company of companies) {
    // 检查该企业昨天的质检记录
    const { data: qualityData } = await supabase
      .from("quality_inspections")
      .select("id")
      .eq("company_id", company.id)
      .gte("created_at", `${yesterdayStr}T00:00:00`)
      .lt("created_at", `${yesterdayStr}T23:59:59`);

    // 如果有质检记录但数量少于5条（日常目标未完成），则发复盘提醒
    if (qualityData && qualityData.length > 0 && qualityData.length < 5) {
      reviewCount += await createNotificationsForCompany(
        company.id,
        "review",
        "质检复盘提醒：昨日质检未达标",
        `昨日共完成 ${qualityData.length} 条质检记录，目标5条。请及时复盘昨日质检情况，补齐未完成的质检任务。`,
        undefined,
        `昨日${qualityData.length}条，目标5条`
      );
    }
  }
  results.review = reviewCount > 0 ? `推送 ${reviewCount} 条复盘提醒` : "无需复盘提醒";

  return NextResponse.json({
    success: true,
    date: new Date().toISOString().split("T")[0],
    companies: companies.length,
    results,
  });
}

// GET 也可触发（方便调试）
export async function GET(request: NextRequest) {
  return POST(request);
}
