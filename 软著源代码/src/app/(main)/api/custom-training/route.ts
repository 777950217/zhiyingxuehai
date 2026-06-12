import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/custom-training
 * 查询当前company的自定义培训内容
 *
 * 查询参数:
 *   - module_key: 可选，不传则返回该company全部自定义内容
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: '用户信息缺失' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const moduleKey = searchParams.get('module_key');

    // Query both company-specific AND platform-level (adopted) content
    let query = supabase
      .from('custom_training_content')
      .select('*')
      .in('company_id', [profile.company_id, 'platform'])
      .eq('is_deleted', false)
      .order('module_key', { ascending: true })
      .order('section_index', { ascending: true })
      .order('item_index', { ascending: true });

    if (moduleKey) {
      query = query.eq('module_key', moduleKey);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[custom-training] GET error:', error.message);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[custom-training] GET Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/custom-training
 * 新增/编辑单条自定义内容
 *
 * Body:
 *   - module_key: string (必填)
 *   - section_index: number (必填)
 *   - item_index: number (必填)
 *   - custom_title: string (可选)
 *   - custom_content: string (可选)
 *
 * 如果同company_id+module_key+section_index+item_index已存在且未删除，则更新
 * 如果不存在，则插入
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
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: '用户信息缺失' }, { status: 400 });
    }

    const body = await request.json();
    const { module_key, section_index, item_index, custom_title, custom_content } = body as {
      module_key: string;
      section_index: number;
      item_index: number;
      custom_title?: string;
      custom_content?: string;
    };

    if (!module_key || section_index === undefined || item_index === undefined) {
      return NextResponse.json({ error: '缺少必填参数: module_key, section_index, item_index' }, { status: 400 });
    }

    // Check if record exists (same company + module + section + item, not deleted)
    const { data: existing, error: findError } = await supabase
      .from('custom_training_content')
      .select('id')
      .eq('company_id', profile.company_id)
      .eq('module_key', module_key)
      .eq('section_index', section_index)
      .eq('item_index', item_index)
      .eq('is_deleted', false)
      .maybeSingle();

    if (findError) {
      console.error('[custom-training] POST find error:', findError.message);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    const now = new Date().toISOString();

    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('custom_training_content')
        .update({
          custom_title: custom_title || null,
          custom_content: custom_content || null,
          updated_at: now,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('[custom-training] POST update error:', error.message);
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
      }

      return NextResponse.json({ data });
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('custom_training_content')
        .insert({
          company_id: profile.company_id,
          module_key,
          section_index,
          item_index,
          custom_title: custom_title || null,
          custom_content: custom_content || null,
          source: 'merchant',
          merchant_source: profile.company_id,
          is_deleted: false,
          review_status: 'pending',
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('[custom-training] POST insert error:', error.message);
        return NextResponse.json({ error: '新增失败' }, { status: 500 });
      }

      return NextResponse.json({ data });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[custom-training] POST Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/custom-training
 * 软删除单条自定义内容
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
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: '用户信息缺失' }, { status: 400 });
    }

    const body = await request.json();
    const { id } = body as { id: string };

    if (!id) {
      return NextResponse.json({ error: '缺少参数: id' }, { status: 400 });
    }

    // Soft delete - verify ownership first
    const { data: existing, error: findError } = await supabase
      .from('custom_training_content')
      .select('id, company_id')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (findError) {
      console.error('[custom-training] DELETE find error:', findError.message);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: '记录不存在或已删除' }, { status: 404 });
    }

    if (existing.company_id !== profile.company_id) {
      return NextResponse.json({ error: '无权操作此记录' }, { status: 403 });
    }

    const { error } = await supabase
      .from('custom_training_content')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[custom-training] DELETE error:', error.message);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[custom-training] DELETE Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
