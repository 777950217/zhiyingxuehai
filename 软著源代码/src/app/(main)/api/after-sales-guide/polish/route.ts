import { NextRequest, NextResponse } from 'next/server';
import { Config, HeaderUtils, LLMClient } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, context } = body as { text: string; context?: string };

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: '缺少待润色文本' }, { status: 400 });
    }

    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(config, customHeaders);

    const systemPrompt = `你是${context || '卫浴售后'}领域的专业文案润色专家。
规则：
1. 保留原文所有关键信息，不丢失任何细节
2. 语言专业简洁，去除口语化表达
3. 控制在100字以内
4. 只返回润色后的文本，不要解释、不要加引号、不要加前缀`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `请润色以下文本：\n${text.trim()}` },
    ];

    const stream = client.stream(messages, { model: 'doubao-seed-2-0-lite-260215' });
    let result = '';

    for await (const chunk of stream) {
      if (chunk.content) {
        result += chunk.content;
      }
    }

    return NextResponse.json({ result: result.trim() || text.trim() });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '润色失败';
    console.error('[after-sales-guide/polish] error:', msg);
    return NextResponse.json({ error: '润色服务暂时不可用，请稍后重试' }, { status: 500 });
  }
}
