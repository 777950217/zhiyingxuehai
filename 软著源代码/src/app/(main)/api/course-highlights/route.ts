import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseServiceRoleKey } from '@/storage/database/supabase-client';

export const dynamic = 'force-dynamic';

/* ───── GET /api/course-highlights ───── */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const action = searchParams.get('action');

    // 获取所有课程的标注计数（用于列表页badge）
    if (action === 'counts') {
      const supabaseAdmin = getSupabaseClient(getSupabaseServiceRoleKey());
      const { data, error } = await supabaseAdmin
        .from('course_highlights')
        .select('course_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of (data || [])) {
        counts[row.course_id] = (counts[row.course_id] || 0) + 1;
      }
      return NextResponse.json({ counts });
    }

    // 获取指定课程的标注列表
    if (!courseId) {
      return NextResponse.json({ error: '缺少course_id参数' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseClient(getSupabaseServiceRoleKey());
    const { data, error } = await supabaseAdmin
      .from('course_highlights')
      .select('id, highlighted_text, created_at')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      highlights: (data || []).map((row: { id: string; highlighted_text: string; created_at: string }) => ({
        id: row.id,
        text: row.highlighted_text,
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    console.error('[course-highlights] GET error:', err);
    return NextResponse.json({ error: '获取标注失败' }, { status: 500 });
  }
}

/* ───── POST /api/course-highlights ───── */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const body = await request.json();
    const { courseId, highlightedText, pagePath } = body;

    if (!courseId || !highlightedText) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseClient(getSupabaseServiceRoleKey());
    const { data, error } = await supabaseAdmin
      .from('course_highlights')
      .insert({
        user_id: user.id,
        company_id: null,
        course_id: courseId,
        highlighted_text: highlightedText,
        page_path: pagePath || null,
      })
      .select('id, highlighted_text, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json({
      highlight: {
        id: data.id,
        text: data.highlighted_text,
        createdAt: data.created_at,
      },
    });
  } catch (err) {
    console.error('[course-highlights] POST error:', err);
    return NextResponse.json({ error: '添加标注失败' }, { status: 500 });
  }
}

/* ───── DELETE /api/course-highlights ───── */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少标注ID' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseClient(getSupabaseServiceRoleKey());
    const { error } = await supabaseAdmin
      .from('course_highlights')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[course-highlights] DELETE error:', err);
    return NextResponse.json({ error: '删除标注失败' }, { status: 500 });
  }
}
