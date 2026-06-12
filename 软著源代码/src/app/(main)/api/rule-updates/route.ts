import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform');
    const company_id = searchParams.get('company_id');

    let query = supabase
      .from('rule_updates')
      .select('*')
      .eq('is_active', true)
      .order('effective_date', { ascending: false });

    if (platform && platform !== '全部') {
      query = query.eq('platform', platform);
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
    const { company_id, platform, title, summary, action_advice, effective_date, source_url } = body;

    if (!platform || !title) {
      return NextResponse.json({ error: 'platform和title必填' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('rule_updates')
      .insert({
        company_id: company_id || null,
        platform,
        title,
        summary: summary || null,
        action_advice: action_advice || null,
        effective_date: effective_date || null,
        source_url: source_url || null,
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
      .from('rule_updates')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
