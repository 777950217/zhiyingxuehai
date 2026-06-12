import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, systemPrompt } = body as { prompt: string; systemPrompt?: string };
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: '缺少prompt参数' }, { status: 400 });
    }

    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(config, customHeaders);

    const messages = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      { role: 'user' as const, content: prompt },
    ];
    let fullResponse = '';

    const llmStream = client.stream(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.7,
    });

    for await (const chunk of llmStream) {
      if (chunk.content) {
        fullResponse += chunk.content.toString();
      }
    }

    return NextResponse.json({ content: fullResponse });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'AI生成失败';
    console.error('[AI Generate] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
