import { NextRequest } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

const MODULE_PROMPTS: Record<string, { name: string; guidance: string }> = {
  scripts: {
    name: "话术库框架",
    guidance: `帮助用户完善客服话术库框架。话术库应包含：
1. 常见问题应答话术（售前咨询/售中跟进/售后处理）
2. 投诉处理话术（情绪安抚/解决方案/升级流程）
3. 促销活动话术（产品推荐/优惠引导/限时活动）
4. 危机应对话术（质量投诉/物流异常/退换货争议）
请基于用户提供的内容，优化结构、补充缺失、提炼关键话术要点。输出格式清晰，分场景分类。`,
  },
  kpi: {
    name: "KPI方案",
    guidance: `帮助用户完善客服团队KPI方案。KPI方案应包含：
1. 核心指标定义（响应时长/解决率/满意度/首次解决率）
2. 指标权重分配（各指标占比及理由）
3. 目标值设定（月度/季度目标）
4. 考核周期与奖惩规则
5. 数据采集与计算方式
请基于用户提供的内容，优化指标体系、给出合理权重建议、补充缺失维度。`,
  },
  scheduling: {
    name: "排班规则",
    guidance: `帮助用户完善客服团队排班规则。排班规则应包含：
1. 排班模式（固定班/轮班/弹性排班）
2. 班次设置（早班/中班/晚班/大促专项班）
3. 人力配置逻辑（按咨询量配比/高峰时段加人）
4. 轮换规则（周轮/月轮/技能搭配）
5. 请假与调班机制
请基于用户提供的内容，优化排班逻辑、补充缺失环节、给出实操建议。`,
  },
  quality: {
    name: "质检标准",
    guidance: `帮助用户完善质检评分标准。质检标准应包含：
1. 质检维度（服务态度/专业能力/流程规范/效率指标）
2. 评分规则（各维度权重/扣分项/加分项）
3. 抽检方式（随机抽检/重点抽检/全量质检）
4. 质检流程（录音/对话抽检→评分→反馈→改进）
5. 红线标准（一票否决项：辱骂/泄露信息/私下交易）
请基于用户提供的内容，优化评分体系、补充关键维度、设定合理权重。`,
  },
  sop: {
    name: "SOP清单",
    guidance: `帮助用户完善SOP（标准作业流程）清单。SOP清单应包含：
1. 售前SOP（咨询接待→需求确认→产品推荐→促单成交）
2. 售中SOP（订单确认→物流跟踪→到货提醒→签收确认）
3. 售后SOP（投诉接收→问题分类→处理方案→回访确认）
4. 退换货SOP（申请审核→物流协调→质检入库→退款/补发）
5. 升级SOP（超权限处理→跨部门协调→客户安抚→闭环确认）
请基于用户提供的内容，优化流程节点、补充缺失环节、明确责任人与时限。`,
  },
};

export async function POST(request: NextRequest) {
  const { module, content } = await request.json();

  if (!module || !content) {
    return new Response(JSON.stringify({ error: "缺少必要参数" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const moduleInfo = MODULE_PROMPTS[module];
  if (!moduleInfo) {
    return new Response(JSON.stringify({ error: "未知模块" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = `你是"职盈学海"的管理方案优化助手，专注帮助电商客服主管完善管理方案。

${moduleInfo.guidance}

## 优化原则
1. 保留用户原始意图和核心内容
2. 补充缺失的关键环节
3. 优化结构和逻辑顺序
4. 给出可落地的实操建议
5. 语言简洁明了，避免空洞理论

## 输出格式
直接输出优化后的完整内容，不要加"优化后"等前缀。用清晰的标题和编号组织内容。
如果用户内容是空白的，请给出该模块的完整模板供参考。`;

  const userPrompt = content.trim()
    ? `以下是我写的${moduleInfo.name}，请帮我优化完善：\n\n${content}`
    : `我还没有写${moduleInfo.name}，请帮我生成一份完整的模板供参考。`;

  const config = new Config();
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const client = new LLMClient(config, customHeaders);

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];

  const encoder = new TextEncoder();

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
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
            );
          }
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
        );
      } catch (err) {
        console.error("[management-plan AI stream error]", err);
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
