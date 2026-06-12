import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const company_id = searchParams.get('company_id');

    let query = supabase
      .from('industry_trends')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (category && category !== '全部') {
      query = query.eq('category', category);
    }
    if (company_id) {
      query = query.or(`company_id.eq.${company_id},company_id.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const body = await req.json();
    const { company_id, category, trend, title, key_data, advice, advice_detail, data_source } = body;

    if (!category || !trend || !title) {
      return NextResponse.json({ error: 'category、trend和title必填' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('industry_trends')
      .insert({
        company_id: company_id || null,
        category,
        trend,
        title,
        key_data: key_data || null,
        advice: advice || null,
        advice_detail: advice_detail || null,
        data_source: data_source || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id必填' }, { status: 400 });
    }

    const { error } = await supabase
      .from('industry_trends')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
