import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/ai-chat-history - 获取对话列表
export async function GET(req: NextRequest) {
  try {
    const sb = getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    const id = searchParams.get('id');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '20', 10);

    // 获取单条详情
    if (id) {
      const { data, error } = await sb
        .from('ai_chat_history')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // 获取列表
    if (!userId) {
      return NextResponse.json({ error: '缺少user_id参数' }, { status: 400 });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const [{ data, error }, { count }] = await Promise.all([
      sb
        .from('ai_chat_history')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
        .range(from, to),
      sb
        .from('ai_chat_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_archived', false),
    ]);

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取对话记录失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/ai-chat-history - 创建新对话记录
export async function POST(req: NextRequest) {
  try {
    const sb = getSupabaseClient();
    const body = await req.json();
    const { user_id, company_id, title, messages, tags } = body;

    if (!user_id) {
      return NextResponse.json({ error: '缺少user_id' }, { status: 400 });
    }

    const { data, error } = await sb
      .from('ai_chat_history')
      .insert({
        user_id,
        company_id: company_id || null,
        title: title || '',
        messages: messages || [],
        tags: tags || [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '创建对话记录失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
