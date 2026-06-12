import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/ai-chat-history/[id] - 更新对话（追加消息/修改标题/归档）
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sb = getSupabaseClient();
    const { id } = await params;
    const body = await req.json();

    // 如果是追加消息，先获取当前 messages 再合并
    if (body.append_messages) {
      const { data: existing, error: fetchError } = await sb
        .from('ai_chat_history')
        .select('messages')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;

      const currentMessages = Array.isArray(existing?.messages) ? existing.messages : [];
      const merged = [...currentMessages, ...body.append_messages];

      const { data, error } = await sb
        .from('ai_chat_history')
        .update({
          messages: merged,
          updated_at: new Date().toISOString(),
          ...(body.title ? { title: body.title } : {}),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // 普通更新
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.messages !== undefined) updateData.messages = body.messages;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.is_archived !== undefined) updateData.is_archived = body.is_archived;

    const { data, error } = await sb
      .from('ai_chat_history')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '更新对话记录失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/ai-chat-history/[id] - 删除对话
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sb = getSupabaseClient();
    const { id } = await params;

    const { error } = await sb
      .from('ai_chat_history')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '删除对话记录失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
