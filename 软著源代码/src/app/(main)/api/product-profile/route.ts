import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    if (!companyId) {
      return NextResponse.json({ error: '缺少企业ID' }, { status: 400 });
    }
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, brand_name, categories, price_range, platforms, team_size, daily_consultations, pain_points, supply_type, install_service, return_policy, profile_completed')
      .eq('id', companyId)
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { companyId, ...updates } = body;
    if (!companyId) {
      return NextResponse.json({ error: '缺少企业ID' }, { status: 400 });
    }
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('companies')
      .update({ ...updates, profile_completed: true, updated_at: new Date().toISOString() })
      .eq('id', companyId)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
