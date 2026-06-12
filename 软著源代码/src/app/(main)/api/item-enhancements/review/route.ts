import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/item-enhancements/review
 * 获取待审核的item enhancements（仅admin角色可调用）
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

    // Verify admin role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: '无权限，仅管理员可审核' }, { status: 403 });
    }

    // Query pending review items
    const { data, error } = await supabase
      .from('item_enhancements')
      .select('*')
      .eq('source', 'merchant')
      .eq('review_status', 'pending')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[item-enhancements/review] GET error:', error.message);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // Enrich with company name
    const companyIds = [...new Set((data || []).map(item => item.company_id).filter(Boolean))];
    const companyMap: Record<string, string> = {};
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds);
      companies?.forEach(c => { companyMap[c.id] = c.name; });
    }

    const enriched = (data || []).map(item => ({
      ...item,
      company_name: item.company_id ? companyMap[item.company_id] || '-' : '-',
    }));

    return NextResponse.json({ data: enriched });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[item-enhancements/review] GET Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/item-enhancements/review
 * 审核item enhancement（仅admin角色可调用）
 *
 * Body:
 *   - item_id: string (必填)
 *   - action: 'approve' | 'reject' (必填)
 *
 * approve逻辑：
 *   1. 将原记录 review_status 改为 'approved'
 *   2. 创建一条 source='platform', company_id='platform' 的新记录
 * reject逻辑：
 *   1. 将原记录 review_status 改为 'rejected'
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

    // Verify admin role
    const { data: adminProfile } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: '无权限，仅管理员可审核' }, { status: 403 });
    }

    const body = await request.json();
    const { item_id, action } = body as { item_id: string; action: 'approve' | 'reject' };

    if (!item_id || !action) {
      return NextResponse.json({ error: '缺少参数: item_id, action' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action 必须为 approve 或 reject' }, { status: 400 });
    }

    // Get the item
    const { data: item, error: findError } = await supabase
      .from('item_enhancements')
      .select('*')
      .eq('id', item_id)
      .eq('source', 'merchant')
      .eq('is_deleted', false)
      .maybeSingle();

    if (findError) {
      console.error('[item-enhancements/review] Find error:', findError.message);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    if (!item) {
      return NextResponse.json({ error: '记录不存在或已删除' }, { status: 404 });
    }

    if (item.review_status !== 'pending') {
      return NextResponse.json({ error: '该记录不在待审核状态' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (action === 'reject') {
      const { error: updateError } = await supabase
        .from('item_enhancements')
        .update({
          review_status: 'rejected',
          reviewed_at: now,
          updated_at: now,
        })
        .eq('id', item_id);

      if (updateError) {
        console.error('[item-enhancements/review] Reject error:', updateError.message);
        return NextResponse.json({ error: '拒绝失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'rejected' });
    }

    // Approve: update original record
    const { error: updateError } = await supabase
      .from('item_enhancements')
      .update({
        review_status: 'approved',
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', item_id);

    if (updateError) {
      console.error('[item-enhancements/review] Approve update error:', updateError.message);
      return NextResponse.json({ error: '采纳失败' }, { status: 500 });
    }

    // Create platform-level record
    const { data: newRecord, error: insertError } = await supabase
      .from('item_enhancements')
      .insert({
        company_id: 'platform',
        module_key: item.module_key,
        section_index: item.section_index,
        item_index: item.item_index,
        quick_phrase: item.quick_phrase,
        images: item.images,
        custom_meaning: item.custom_meaning,
        custom_title: item.custom_title,
        is_hidden: false,
        source: 'platform',
        review_status: 'none',
        is_deleted: false,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[item-enhancements/review] Platform insert error:', insertError.message);
      // Rollback
      await supabase
        .from('item_enhancements')
        .update({ review_status: 'pending', reviewed_at: null, updated_at: now })
        .eq('id', item_id);
      return NextResponse.json({ error: '创建平台模板失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, action: 'approved', platform_record_id: newRecord?.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[item-enhancements/review] POST Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
