import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content, category } = body as {
      title?: string;
      content?: string;
      category?: string;
    };

    const supabase = getSupabaseClient();
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;

    const { data, error } = await supabase
      .from('knowledge_notes')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', auth.userId)
      .select()
      .single();

    if (error) {
      console.error('[knowledge-notes/[id]] PATCH error:', error.message);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '笔记不存在或无权限' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[knowledge-notes/[id]] PATCH error:', err);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('knowledge_notes')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.userId);

    if (error) {
      console.error('[knowledge-notes/[id]] DELETE error:', error.message);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[knowledge-notes/[id]] DELETE error:', err);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
