import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** GET /api/sop-templates?companyId=xxx&category=xxx */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const category = searchParams.get('category');

    const supabase = getSupabaseClient();

    // Fetch preset SOPs (no company_id) + company-specific SOPs
    let query = supabase
      .from('sop_templates')
      .select('*')
      .order('category', { ascending: true })
      .order('created_at', { ascending: true });

    if (companyId) {
      query = query.or(`company_id.is.null,company_id.eq.${companyId}`);
    } else {
      query = query.is('company_id', null);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/sop-templates — create new SOP */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { company_id, category, name, scenario, steps_json, role, updated_by } = body;

    if (!category || !name) {
      return NextResponse.json({ error: '分类和名称为必填项' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sop_templates')
      .insert({
        company_id: company_id || null,
        category,
        name,
        scenario: scenario || '',
        steps_json: steps_json || '[]',
        role: role || '售中客服',
        is_preset: false,
        needs_update: false,
        version: 1,
        updated_by: updated_by || '',
      })
      .select()
      .single();

    if (error) throw error;

    // Save version to localStorage key 'sop_versions' is handled client-side
    return NextResponse.json({ data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
