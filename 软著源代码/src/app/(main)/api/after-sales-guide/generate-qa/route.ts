import { NextRequest, NextResponse } from 'next/server';
import { Config, HeaderUtils, LLMClient } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problemDescription, problemType } = body;

    if (!problemDescription || typeof problemDescription !== 'string') {
      return NextResponse.json({ error: '缺少问题描述' }, { status: 400 });
    }

    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(config, customHeaders);

    const systemPrompt = `你是卫浴售后专家。根据客户描述的售后问题，生成4个排查引导问题，帮助准确定位问题根因。

规则：
1. 先判断问题属于哪个子系统（冲水系统/加热系统/控制系统/排水系统/安装结构/其他）
2. 生成4个与该子系统相关的排查问题，从易到难排列
3. 每个问题提供4-5个选项，最后一个选项始终是"不确定"
4. 选项要具体、可操作，不要模糊表述
5. 问题要围绕实际问题方向，不要问无关方向（比如冲水问题不要问电源）

你必须严格返回以下JSON格式，不要包含任何其他文字：
{
  "subsystem": "问题所属子系统名称",
  "questions": [
    {
      "key": "q1",
      "question": "排查问题文本",
      "options": ["选项A", "选项B", "选项C", "选项D", "不确定"]
    },
    {
      "key": "q2",
      "question": "排查问题文本",
      "options": ["选项A", "选项B", "选项C", "选项D", "不确定"]
    },
    {
      "key": "q3",
      "question": "排查问题文本",
      "options": ["选项A", "选项B", "选项C", "选项D", "不确定"]
    },
    {
      "key": "q4",
      "question": "排查问题文本",
      "options": ["选项A", "选项B", "选项C", "选项D", "不确定"]
    }
  ]
}`;

    const userMessage = `问题类型：${problemType || '未指定'}
问题描述：${problemDescription}

请生成4个排查引导问题。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage },
    ];

    let fullContent = '';

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of client.stream(messages, {})) {
            if (chunk.content) {
              fullContent += chunk.content.toString();
            }
          }

          // Parse the AI response as JSON
          let parsed;
          try {
            // Extract JSON from response (AI might wrap it in markdown code blocks)
            const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              throw new Error('AI返回格式异常');
            }
            parsed = JSON.parse(jsonMatch[0]);
          } catch (parseError) {
            console.error('[generate-qa] Parse error:', parseError, 'Raw:', fullContent);
            controller.enqueue(encoder.encode(JSON.stringify({
              error: 'AI返回格式异常，请重试',
              raw: fullContent,
            })));
            controller.close();
            return;
          }

          // Validate structure
          if (!parsed.questions || !Array.isArray(parsed.questions)) {
            controller.enqueue(encoder.encode(JSON.stringify({
              error: 'AI返回格式不完整',
              raw: fullContent,
            })));
            controller.close();
            return;
          }

          // Ensure each question has key, question, options
          const questions = parsed.questions.map((q: Record<string, unknown>, i: number) => ({
            key: q.key || `q${i + 1}`,
            question: q.question || `排查问题${i + 1}`,
            options: Array.isArray(q.options) ? q.options : ['不确定'],
          }));

          // Ensure last option is "不确定"
          questions.forEach((q: { options: string[] }) => {
            if (q.options[q.options.length - 1] !== '不确定') {
              q.options.push('不确定');
            }
          });

          controller.enqueue(encoder.encode(JSON.stringify({
            subsystem: parsed.subsystem || '未识别',
            questions,
          })));
          controller.close();
        } catch (err) {
          console.error('[generate-qa] Stream error:', err);
          controller.enqueue(encoder.encode(JSON.stringify({
            error: 'AI生成失败，请重试',
          })));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('[generate-qa] Error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
