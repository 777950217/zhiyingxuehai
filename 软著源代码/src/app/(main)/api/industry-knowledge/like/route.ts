import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest } from '@/lib/api-auth';

// POST: 点赞行业知识条目
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

    const { data: knowledge, error: fetchError } = await supabase
      .from('industry_knowledge')
      .select('id, like_count')
      .eq('id', knowledge_id)
      .single();

    if (fetchError || !knowledge) {
      return NextResponse.json({ error: '未找到该知识条目' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('industry_knowledge')
      .update({ like_count: (knowledge.like_count || 0) + 1 })
      .eq('id', knowledge_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: `点赞失败: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[industry-knowledge/like POST] Error:', message);
    return NextResponse.json({ error: `点赞失败: ${message}` }, { status: 500 });
  }
}
