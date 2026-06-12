import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

const supabase = getSupabaseClient();

// GET /api/courses/[id] — 获取单节课详情
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: lesson, error } = await supabase
      .from('course_lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !lesson) {
      return NextResponse.json({ error: '课程不存在' }, { status: 404 });
    }

    return NextResponse.json({ lesson });
  } catch (err) {
    console.error('[Course Detail GET] Error:', err);
    return NextResponse.json({ error: '获取课程详情失败' }, { status: 500 });
  }
}
