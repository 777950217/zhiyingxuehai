import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/api-auth';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

// POST: AI建议更新过期话术
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth || !auth.userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { phrase_id } = body;

    if (!phrase_id) {
      return NextResponse.json({ error: '缺少phrase_id' }, { status: 400 });
    }

    const supabase = await getSupabaseClient();

    // 获取原始话术
    const { data: phrase, error: fetchError } = await supabase
      .from('phrase_library')
      .select('id, question, content, category, tags, created_at, expires_at')
      .eq('id', phrase_id)
      .single();

    if (fetchError || !phrase) {
      return NextResponse.json({ error: '未找到该话术' }, { status: 404 });
    }

    // 使用 LLMClient 生成更新建议
    const config = new Config({
      apiKey: process.env.COZE_API_KEY || '',
      baseUrl: process.env.COZE_API_BASE || 'https://api.coze.cn',
    });
    const llm = new LLMClient(config);

    const prompt = `你是一个卫浴行业客服话术专家。以下是一条可能过时的客服话术，请基于当前行业最佳实践，生成更新版本。

原始话术标题：${phrase.question || phrase.content?.slice(0, 50)}
原始话术内容：${phrase.content}
分类：${phrase.category}
创建时间：${phrase.created_at}

请生成：
1. 更新后的标题
2. 更新后的内容
3. 更新要点说明（简述哪些地方做了更新）

以JSON格式返回：
{"updated_title": "...", "updated_content": "...", "update_notes": "..."}`;

    const messages = [{ role: 'user' as const, content: prompt }];
    const stream = llm.stream(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.7,
    });

    let fullText = '';
    for await (const chunk of stream) {
      if (chunk?.content) {
        fullText += chunk.content;
      }
    }

    let suggestion;
    try {
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestion = JSON.parse(jsonMatch[0]);
      } else {
        suggestion = {
          updated_title: (phrase.question || phrase.content?.slice(0, 50)) + '（更新版）',
          updated_content: fullText,
          update_notes: 'AI建议更新',
        };
      }
    } catch {
      suggestion = {
        updated_title: (phrase.question || phrase.content?.slice(0, 50)) + '（更新版）',
        updated_content: fullText,
        update_notes: 'AI建议更新',
      };
    }

    return NextResponse.json({
      original: {
        id: phrase.id,
        title: phrase.question || phrase.content?.slice(0, 50),
        content: phrase.content,
        category: phrase.category,
        expires_at: phrase.expires_at,
      },
      suggestion,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[refresh-suggest] Error:', message);
    return NextResponse.json({ error: `AI建议生成失败: ${message}` }, { status: 500 });
  }
}
