import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest } from '@/lib/api-auth';

/**
 * GET /api/personal-product-profile
 * 获取当前用户的个人产品档案（仅自己的、按user_id隔离）
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json({ error: '未授权，请重新登录' }, { status: 401 });
    }
    const { userId } = auth;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('product_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ data: null });
    }
    return NextResponse.json({ data: data[0] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[personal-product-profile] GET error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PUT /api/personal-product-profile
 * 创建或更新当前用户的个人产品档案（upsert by user_id）
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json({ error: '未授权，请重新登录' }, { status: 401 });
    }
    const { userId, companyId } = auth;
    const body = await request.json();
    const { product_name, category, brand, model, specifications, features, faq, selling_points, notes } = body;

    if (!product_name) {
      return NextResponse.json({ error: '缺少product_name' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Check if user already has a profile
    const { data: existing } = await supabase
      .from('product_profiles')
      .select('id, updated_at')
      .eq('user_id', userId)
      .limit(1);

    const rowFields = {
      user_id: userId,
      company_id: companyId || null,
      product_name,
      category: category || null,
      brand: brand || null,
      model: model || null,
      specifications: specifications || {},
      features: features || [],
      faq: faq || [],
      selling_points: selling_points || [],
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    if (existing && existing.length > 0) {
      // Optimistic locking: check updated_at if provided
      const clientUpdatedAt = body.updated_at;
      if (clientUpdatedAt && existing[0].updated_at && clientUpdatedAt !== existing[0].updated_at) {
        // Don't reject outright, just log - the latest save wins
        console.log('[personal-product-profile] version conflict detected, overwriting');
      }

      const { data, error } = await supabase
        .from('product_profiles')
        .update(rowFields)
        .eq('id', existing[0].id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data });
    } else {
      // Create new
      const { data, error } = await supabase
        .from('product_profiles')
        .insert(rowFields)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[personal-product-profile] PUT error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
