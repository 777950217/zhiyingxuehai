import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest } from '@/lib/api-auth';

// POST: 采纳行业知识到个人知识库
export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { knowledge_id } = body;

    if (!knowledge_id) {
      return NextResponse.json({ error: '缺少knowledge_id' }, { status: 400 });
    }

    const supabase = await getSupabaseClient();

    // 1. 更新usage_count
    const { data: knowledge, error: fetchError } = await supabase
      .from('industry_knowledge')
      .select('id, category, title, content, usage_count')
      .eq('id', knowledge_id)
      .single();

    if (fetchError || !knowledge) {
      return NextResponse.json({ error: '未找到该知识条目' }, { status: 404 });
    }

    await supabase
      .from('industry_knowledge')
      .update({ usage_count: (knowledge.usage_count || 0) + 1 })
      .eq('id', knowledge_id);

    // 2. 写入个人知识库 (phrase_library)
    const { data: phrase, error: insertError } = await supabase
      .from('phrase_library')
      .insert({
        company_id: auth.companyId || null,
        user_id: auth.userId,
        category: '行业精选',
        title: knowledge.title,
        content: knowledge.content,
        tags: ['行业知识库', knowledge.category],
        source: 'industry',
        review_status: 'approved',
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: `采纳失败: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({ data: phrase });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[industry-knowledge/adopt POST] Error:', message);
    return NextResponse.json({ error: `采纳失败: ${message}` }, { status: 500 });
  }
}
