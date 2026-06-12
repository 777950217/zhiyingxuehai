import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const CHECKUP_PROMPTS: Record<string, string> = {
  speech: `你是职盈学海话术体检顾问，专注于电商客服话术优化。

## 任务
根据用户选择的模式，对批量话术进行体检优化。

## 模式说明
- 高情商优化模式：改语气、软化表达、提升共情、增强说服力，让客户感觉被重视
- 风控净化模式：扫描敏感词、营销硬广词、违规引导词（如"最便宜"、"保证"、"一定"等），自动替换为合规话术
- 全能模式：同时优化语气+规避风控

## 输出格式（严格遵守）
对每条话术，输出JSON数组：
[
  {
    "original": "原文",
    "optimized": "优化后文本",
    "changes": [
      {"type": "优化"|"风控", "from": "原词", "to": "替换词", "reason": "原因"}
    ]
  }
]
只输出JSON，不要其他文字。`,

  sop: `你是职盈学海SOP体检顾问，专注于电商客服SOP完善。

## 任务
对用户提交的SOP进行体检，找出缺口、合规问题和升级建议。

## 输出格式（严格遵守）
{
  "gaps": [
    {"scenario": "未覆盖场景", "severity": "高|中|低", "description": "说明为什么这个场景重要"}
  ],
  "compliance": [
    {"clause": "有问题的条款", "issue": "与什么规则冲突", "suggestion": "修改建议"}
  ],
  "upgrades": [
    {"area": "改进领域", "bestPractice": "行业最佳实践", "action": "具体行动"}
  ]
}
只输出JSON，不要其他文字。`,

  case: `你是职盈学海案例体检顾问，专注于电商售后案例根因分析。

## 任务
对用户提交的售后案例进行深度分析，找出根因、防复发方案和成本测算。

## 输出格式（严格遵守）
{
  "rootCause": {
    "directCause": "直接原因",
    "systemicCause": "系统性原因",
    "probability": "同类问题再发概率(高/中/低)"
  },
  "prevention": {
    "process": ["流程层面改进1", "流程层面改进2"],
    "script": ["话术层面改进1", "话术层面改进2"],
    "policy": ["制度层面改进1", "制度层面改进2"]
  },
  "costAnalysis": {
    "monthlyEstimate": "月均亏损预估金额",
    "savingsIfFixed": "堵住后可节省金额",
    "roiNote": "投入产出说明"
  }
}
只输出JSON，不要其他文字。`,

  quality: `你是职盈学海质检体检顾问，专注于电商客服质检标准优化。

## 任务
对用户提交的质检评分标准进行体检，对标行业水平，找出盲区和优化建议。

## 输出格式（严格遵守）
{
  "benchmark": {
    "overallLevel": "偏严|偏松|正常",
    "comparison": "与同行业标准的对比说明"
  },
  "blindSpots": [
    {"dimension": "缺失的质检维度", "importance": "为什么重要", "suggestedWeight": "建议权重%"}
  ],
  "optimization": [
    {"dimension": "需要调整的维度", "currentWeight": "当前权重", "suggestedWeight": "建议权重", "reason": "调整原因"}
  ]
}
只输出JSON，不要其他文字。`,

  generateProductKnowledge: `你是职盈学海产品知识生成专家，专注于电商行业。

## 任务
根据用户提供的品牌、品类、产品型号等基础信息，生成该品类的产品功能特点、材质参数、常见问题及标准回复、推荐快捷语。

## 输出格式（严格遵守）
{
  "features": ["功能特点1", "功能特点2", "功能特点3", "功能特点4", "功能特点5"],
  "materials": ["材质参数1", "材质参数2", "材质参数3", "材质参数4"],
  "commonIssues": [
    {"question": "客户常见问题1", "answer": "标准回复话术1"},
    {"question": "客户常见问题2", "answer": "标准回复话术2"},
    {"question": "客户常见问题3", "answer": "标准回复话术3"},
    {"question": "客户常见问题4", "answer": "标准回复话术4"},
    {"question": "客户常见问题5", "answer": "标准回复话术5"},
    {"question": "客户常见问题6", "answer": "标准回复话术6"}
  ],
  "quickPhrases": {
    "presale": ["售前快捷语1", "售前快捷语2", "售前快捷语3"],
    "aftersale": ["售后快捷语1", "售后快捷语2", "售后快捷语3"]
  }
}

## 要求
1. features: 5-8个该品类核心功能卖点，要具体、能直接用话术表达
2. materials: 3-6个材质/工艺参数，如釉面、ABS盖板、304不锈钢、铜芯阀芯等
3. commonIssues: 5-8个该品类高频客诉问题+标准回复话术，回复要体现共情+解决方案
4. quickPhrases: 售前3条（引导成交类）+售后3条（安抚解决类），每条50字以内
5. 如果用户提供了客诉类型，commonIssues优先覆盖这些类型
6. 通用行业视角生成，不需要特定品牌内部数据
只输出JSON，不要其他文字。`,

  plan: `你是职盈学海方案体检顾问，专注于电商客服管理方案可行性评估。

## 任务
对用户提交的管理方案进行体检，评估可行性、找出漏洞、给出落地建议。

## 输出格式（严格遵守）
{
  "feasibility": [
    {"module": "方案模块名", "difficulty": 1, "note": "难度说明（1=容易，5=极难）"}
  ],
  "vulnerabilities": [
    {"gap": "缺失的关键环节", "impact": "不补上的后果", "priority": "高|中|低"}
  ],
  "actionPlan": [
    {"step": "行动步骤", "priority": 1, "timeline": "建议时间", "prerequisite": "前置条件"}
  ]
}
只输出JSON，不要其他文字。`,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, input, mode, action, productContext, role } = body as { type: string; input: string; mode?: string; action?: string; productContext?: Record<string, unknown> | null; role?: string };

    // Support action-based routing (e.g. generate-product-knowledge)
    const effectiveType = action === 'generate-product-knowledge' ? 'generateProductKnowledge' : type;

    if (!effectiveType || !input) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const systemPrompt = CHECKUP_PROMPTS[effectiveType];
    if (!systemPrompt) {
      return NextResponse.json({ error: '不支持的体检类型' }, { status: 400 });
    }

    let userMessage = input;
    if (effectiveType === 'speech' && mode) {
      const modeDesc: Record<string, string> = {
        'eq': '高情商优化模式',
        'risk': '风控净化模式',
        'all': '全能模式',
      };
      userMessage = `请用【${modeDesc[mode] || mode}】模式体检以下话术：\n\n${input}`;
    } else if (effectiveType === 'generateProductKnowledge') {
      userMessage = `请根据以下产品信息生成产品知识库：\n\n${input}`;
    }

    // Inject product context into user message if provided
    if (productContext && effectiveType !== 'generateProductKnowledge') {
      const ctx = productContext as Record<string, unknown>;
      let ctxStr = `\n\n【产品档案信息】`;
      if (ctx.brand) ctxStr += `\n品牌：${ctx.brand}`;
      if (ctx.category) ctxStr += `\n品类：${ctx.category}`;
      if (Array.isArray(ctx.products) && ctx.products.length) ctxStr += `\n产品型号：${(ctx.products as string[]).join('、')}`;
      if (ctx.teamSize) ctxStr += `\n团队人数：${ctx.teamSize}`;
      if (Array.isArray(ctx.complaintTypes) && ctx.complaintTypes.length) ctxStr += `\n客诉类型：${(ctx.complaintTypes as string[]).join('、')}`;
      if (Array.isArray(ctx.features) && ctx.features.length) ctxStr += `\n产品功能：${(ctx.features as string[]).join('、')}`;
      if (Array.isArray(ctx.commonIssues) && ctx.commonIssues.length) ctxStr += `\n常见问题：${(ctx.commonIssues as string[]).join('、')}`;
      if (ctx.quickPhrases && typeof ctx.quickPhrases === 'object') {
        const qp = ctx.quickPhrases as { presale?: string[]; aftersale?: string[] };
        if (qp.presale?.length) ctxStr += `\n售前快捷语：${qp.presale.join(' | ')}`;
        if (qp.aftersale?.length) ctxStr += `\n售后快捷语：${qp.aftersale.join(' | ')}`;
      }
      ctxStr += `\n请结合以上产品信息进行分析和优化。`;
      userMessage += ctxStr;
    }

    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(config, customHeaders);

    const industryContext = (role === 'personal_user' || role === 'efficiency_user')
      ? '你是一位全行业客服管理专家，拥有跨行业的客服管理经验。请基于通用的客服管理最佳实践进行分析和建议，适用于电商、零售、服务等多个行业。'
      : '你是一位卫浴行业客服管理专家，深耕卫浴电商客服领域12年。请基于卫浴行业的专业知识进行分析和建议，包括但不限于：卫浴产品（马桶、花洒、浴室柜、龙头、地漏、浴缸等）的材质特性、安装注意事项、售后问题处理（漏水、坑距、安装纠纷、物流破损、配件缺失等）、平台规则（抖音/拼多多/京东/天猫）、行业常见客诉话术和应对策略。';

    const messages = [
      { role: 'system' as const, content: industryContext + '\n\n' + systemPrompt },
      { role: 'user' as const, content: userMessage },
    ];

    const encoder = new TextEncoder();
    let fullContent = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const llmStream = client.stream(messages, {
            model: 'doubao-seed-2-0-lite-260215',
            temperature: 0.7,
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              fullContent += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
              );
            }
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, fullContent })}\n\n`)
          );
          controller.close();
        } catch (error) {
          console.error('[AI-Checkup] Stream error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'AI体检暂时无法响应，请稍后重试' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[AI-Checkup] Error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
