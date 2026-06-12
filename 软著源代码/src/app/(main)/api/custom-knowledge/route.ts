import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

const VALID_CATEGORIES = ['product_params', 'install_guide', 'after_sales_policy', 'faq', 'other'];

/** GET /api/custom-knowledge?companyId=xxx&category=xxx */
export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const category = searchParams.get('category');

  if (!companyId) {
    return NextResponse.json({ error: '缺少companyId' }, { status: 400 });
  }

  try {
    let query = supabase
      .from('custom_knowledge')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (category && VALID_CATEGORIES.includes(category)) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('获取自定义知识失败:', err);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

/** POST /api/custom-knowledge — 创建单条或多条 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { companyId, items, ...single } = body;

    // 批量创建
    if (items && Array.isArray(items)) {
      const rows = items.map((item: { title: string; content: string; category: string; tags?: string }) => ({
        company_id: companyId,
        title: item.title?.trim(),
        content: item.content?.trim(),
        category: VALID_CATEGORIES.includes(item.category) ? item.category : 'other',
        tags: item.tags || null,
        is_active: true,
      })).filter((r: { title: string; content: string }) => r.title && r.content);

      if (rows.length === 0) {
        return NextResponse.json({ error: '没有有效数据' }, { status: 400 });
      }

      const { data, error } = await supabase.from('custom_knowledge').insert(rows).select();
      if (error) throw error;
      return NextResponse.json({ success: true, data, count: data.length });
    }

    // 单条创建
    if (!single.title?.trim() || !single.content?.trim()) {
      return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 });
    }
    if (!companyId) {
      return NextResponse.json({ error: '缺少companyId' }, { status: 400 });
    }

    const row = {
      company_id: companyId,
      title: single.title.trim(),
      content: single.content.trim(),
      category: VALID_CATEGORIES.includes(single.category) ? single.category : 'other',
      tags: single.tags || null,
      is_active: true,
      created_by: single.userId || null,
    };

    const { data, error } = await supabase.from('custom_knowledge').insert(row).select();
    if (error) throw error;
    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    console.error('创建自定义知识失败:', err);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

/** PUT /api/custom-knowledge — 更新单条 */
export async function PUT(request: NextRequest) {
  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { id, title, content, category, tags } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少id' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title.trim();
    if (content !== undefined) updates.content = content.trim();
    if (category !== undefined && VALID_CATEGORIES.includes(category)) updates.category = category;
    if (tags !== undefined) updates.tags = tags;

    const { data, error } = await supabase
      .from('custom_knowledge')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    console.error('更新自定义知识失败:', err);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

/** DELETE /api/custom-knowledge?id=xxx — 软删除 */
export async function DELETE(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: '缺少id' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('custom_knowledge')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('删除自定义知识失败:', err);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
