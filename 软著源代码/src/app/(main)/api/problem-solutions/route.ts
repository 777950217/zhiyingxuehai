import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id') || searchParams.get('companyId');
    const userId = searchParams.get('user_id') || searchParams.get('userId');

    let query = supabase
      .from('problem_solutions')
      .select('*')
      .order('created_at', { ascending: false });

    if (companyId) query = query.eq('company_id', companyId);
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] GET /problem-solutions error:', err);
    return NextResponse.json({ error: '获取问题解决记录失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('problem_solutions')
      .insert({
        company_id: body.company_id,
        user_id: body.user_id,
        query: body.query,
        category: body.category,
        judgment: body.judgment,
        steps: body.steps,
        script: body.script,
        solution_used: body.solution_used || false,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] POST /problem-solutions error:', err);
    return NextResponse.json({ error: '保存问题解决记录失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少id参数' }, { status: 400 });
    }

    const { error } = await supabase
      .from('problem_solutions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API] DELETE /problem-solutions error:', err);
    return NextResponse.json({ error: '删除问题解决记录失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { id, ...updates } = body;

    const { data, error } = await supabase
      .from('problem_solutions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] PUT /problem-solutions error:', err);
    return NextResponse.json({ error: '更新问题解决记录失败' }, { status: 500 });
  }
}
