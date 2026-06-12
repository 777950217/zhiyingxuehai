import { NextRequest, NextResponse } from 'next/server';
import { Config, HeaderUtils, LLMClient } from 'coze-coding-dev-sdk';

interface QAAnswer {
  question: string;
  answer: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problemDescription, problemType, qaAnswers } = body as {
      problemDescription: string;
      problemType?: string;
      qaAnswers: QAAnswer[];
    };

    if (!problemDescription || !qaAnswers || !Array.isArray(qaAnswers)) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(config, customHeaders);

    const systemPrompt = `你是卫浴售后专家。根据客户的问题描述和排查问答结果，生成一份IF-THEN格式的售后排查攻略。

规则：
1. 使用IF-THEN条件判断格式，清晰标注每一步排查逻辑
2. 每个判断分支都要有明确的操作指引和话术建议
3. 如果判断需要更换配件，标注配件名称和注意事项
4. 最后给出"如果以上都无法解决"的兜底建议
5. 语言简洁专业，客服可以直接照着念给客户听
6. 必须基于12年卫浴行业实际售后经验生成

你必须严格返回以下JSON格式，不要包含任何其他文字：
{
  "title": "攻略标题（简短，10字以内）",
  "content": "完整的IF-THEN格式攻略文本（用换行符分隔每一步）",
  "steps": [
    {
      "condition": "IF条件描述",
      "action": "THEN操作建议",
      "script": "对应的话术建议（可选）"
    }
  ]
}`;

    const qaSummary = qaAnswers
      .map((a: QAAnswer, i: number) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`)
      .join('\n');

    const userMessage = `问题类型：${problemType || '未指定'}
问题描述：${problemDescription}

排查问答结果：
${qaSummary}

请生成IF-THEN格式的售后排查攻略。`;

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
            const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              throw new Error('AI返回格式异常');
            }
            parsed = JSON.parse(jsonMatch[0]);
          } catch (parseError) {
            console.error('[generate-guide] Parse error:', parseError, 'Raw:', fullContent);
            // Fallback: treat raw content as the guide text
            controller.enqueue(encoder.encode(JSON.stringify({
              title: (problemDescription || '售后攻略').slice(0, 10),
              content: fullContent,
              steps: [],
            })));
            controller.close();
            return;
          }

          controller.enqueue(encoder.encode(JSON.stringify({
            title: parsed.title || (problemDescription || '售后攻略').slice(0, 10),
            content: parsed.content || fullContent,
            steps: Array.isArray(parsed.steps) ? parsed.steps : [],
          })));
          controller.close();
        } catch (err) {
          console.error('[generate-guide] Stream error:', err);
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
    console.error('[generate-guide] Error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
