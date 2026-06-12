import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/item-enhancements
 * 查询当前用户的enhancements + platform默认的
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
    }

    // Get user's company_id
    const { data: profile } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: '未关联企业' }, { status: 400 });
    }

    const companyId = profile.company_id;

    // Query: own company + platform-level
    const { data, error } = await supabase
      .from('item_enhancements')
      .select('*')
      .in('company_id', [companyId, 'platform'])
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[item-enhancements] GET error:', error.message);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[item-enhancements] GET Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/item-enhancements
 * 添加/更新快捷语或示例图
 *
 * Body:
 *   - module_key: string (必填)
 *   - section_index: number (必填)
 *   - item_index: number (必填)
 *   - quick_phrase?: string
 *   - images?: string[] (URL数组)
 *   - custom_meaning?: string (商家自定义条目含义)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: '未关联企业' }, { status: 400 });
    }

    const body = await request.json();
    const { module_key, section_index, item_index, quick_phrase, images, custom_meaning, custom_title, is_hidden } = body as {
      module_key: string;
      section_index: number;
      item_index: number;
      quick_phrase?: string;
      images?: string[];
      custom_meaning?: string;
      custom_title?: string;
      is_hidden?: boolean;
    };

    if (!module_key || section_index === undefined || item_index === undefined) {
      return NextResponse.json({ error: '缺少参数: module_key, section_index, item_index' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Check if record already exists for this company+module+section+item
    const { data: existing, error: findError } = await supabase
      .from('item_enhancements')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('module_key', module_key)
      .eq('section_index', section_index)
      .eq('item_index', item_index)
      .eq('is_deleted', false)
      .maybeSingle();

    if (findError) {
      console.error('[item-enhancements] Find error:', findError.message);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    if (existing) {
      // Update existing record
      const updateData: Record<string, unknown> = { updated_at: now };
      if (quick_phrase !== undefined) updateData.quick_phrase = quick_phrase;
      if (images !== undefined) updateData.images = images;
      if (custom_meaning !== undefined) updateData.custom_meaning = custom_meaning;
      if (custom_title !== undefined) updateData.custom_title = custom_title;
      if (is_hidden !== undefined) updateData.is_hidden = is_hidden;
      // If content changed, reset review_status to pending
      if (quick_phrase !== undefined || images !== undefined || custom_meaning !== undefined || custom_title !== undefined || is_hidden !== undefined) {
        updateData.review_status = 'pending';
        updateData.reviewed_at = null;
      }

      const { data: updated, error: updateError } = await supabase
        .from('item_enhancements')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('[item-enhancements] Update error:', updateError.message);
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
      }

      return NextResponse.json({ data: updated, action: 'updated' });
    }

    // Insert new record
    const { data: inserted, error: insertError } = await supabase
      .from('item_enhancements')
      .insert({
        company_id: profile.company_id,
        module_key,
        section_index,
        item_index,
        quick_phrase: quick_phrase || null,
        images: images || [],
        custom_meaning: custom_meaning || null,
        custom_title: custom_title || null,
        is_hidden: is_hidden || false,
        source: 'merchant',
        review_status: 'pending',
        is_deleted: false,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[item-enhancements] Insert error:', insertError.message);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({ data: inserted, action: 'created' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[item-enhancements] POST Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/item-enhancements
 * 软删除enhancement记录（仅可删除自己的）
 *
 * Body:
 *   - id: string (必填)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: '未关联企业' }, { status: 400 });
    }

    const body = await request.json();
    const { id } = body as { id: string };

    if (!id) {
      return NextResponse.json({ error: '缺少参数: id' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Soft delete - only own records
    const { error: deleteError } = await supabase
      .from('item_enhancements')
      .update({ is_deleted: true, updated_at: now })
      .eq('id', id)
      .eq('company_id', profile.company_id);

    if (deleteError) {
      console.error('[item-enhancements] Delete error:', deleteError.message);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[item-enhancements] DELETE Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
