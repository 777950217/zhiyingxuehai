import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { logAction, AuditAction, ResourceType, getClientIp } from '@/lib/audit-log';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    if (!userId) {
      return NextResponse.json({ error: '缺少user_id参数' }, { status: 400 });
    }
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('product_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[product-profiles] GET error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, company_id, product_name, category, brand, model, specifications, features, faq, selling_points, notes } = body;
    if (!user_id || !product_name) {
      return NextResponse.json({ error: '缺少user_id或product_name' }, { status: 400 });
    }
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('product_profiles')
      .insert({
        user_id,
        company_id: company_id || null,
        product_name,
        category: category || null,
        brand: brand || null,
        model: model || null,
        specifications: specifications || {},
        features: features || [],
        faq: faq || [],
        selling_points: selling_points || [],
        notes: notes || null,
      })
      .select()
      .single();
    if (error) throw error;

    // Audit log
    await logAction({
      userId: user_id,
      companyId: company_id,
      action: AuditAction.CREATE,
      resourceType: ResourceType.PRODUCT_PROFILE,
      resourceId: data.id,
      detail: { product_name, category, brand },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[product-profiles] POST error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
