import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const supabase = getSupabaseClient();

    let query = supabase
      .from('knowledge_notes')
      .select('*')
      .eq('user_id', auth.userId)
      .order('updated_at', { ascending: false });

    const category = searchParams.get('category');
    if (category) {
      query = query.eq('category', category);
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) {
      console.error('[knowledge-notes] GET error:', error.message);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[knowledge-notes] GET error:', err);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, content, category } = body as {
      title: string;
      content: string;
      category?: string;
    };

    if (!title || !content) {
      return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('knowledge_notes')
      .insert({
        user_id: auth.userId,
        company_id: auth.companyId || null,
        title,
        content,
        category: category || '知识笔记',
      })
      .select()
      .single();

    if (error) {
      console.error('[knowledge-notes] POST error:', error.message);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[knowledge-notes] POST error:', err);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
