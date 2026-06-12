import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/custom-training/review
 * 获取待审核的自定义培训内容（仅admin角色可调用）
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
      .from('custom_training_content')
      .select('*')
      .eq('source', 'merchant')
      .eq('review_status', 'pending')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[custom-training/review] GET error:', error.message);
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
    console.error('[custom-training/review] GET Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/custom-training/review
 * 审核自定义培训内容（仅admin角色可调用）
 *
 * Body:
 *   - item_id: string (必填)
 *   - action: 'approve' | 'reject' (必填)
 *
 * approve逻辑：
 *   1. 将原记录 review_status 改为 'approved'
 *   2. 创建一条 source='platform' 的新记录，让所有商家可见
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
      .from('custom_training_content')
      .select('*')
      .eq('id', item_id)
      .eq('source', 'merchant')
      .eq('is_deleted', false)
      .maybeSingle();

    if (findError) {
      console.error('[custom-training/review] Find error:', findError.message);
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
      // Reject: update review_status
      const { error: updateError } = await supabase
        .from('custom_training_content')
        .update({
          review_status: 'rejected',
          reviewed_at: now,
          updated_at: now,
        })
        .eq('id', item_id);

      if (updateError) {
        console.error('[custom-training/review] Reject error:', updateError.message);
        return NextResponse.json({ error: '拒绝失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'rejected' });
    }

    // Approve: update original record + create platform-level record
    // Step 1: Update original record
    const { error: updateError } = await supabase
      .from('custom_training_content')
      .update({
        review_status: 'approved',
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', item_id);

    if (updateError) {
      console.error('[custom-training/review] Approve update error:', updateError.message);
      return NextResponse.json({ error: '采纳失败' }, { status: 500 });
    }

    // Step 2: Create platform-level record
    const { data: newRecord, error: insertError } = await supabase
      .from('custom_training_content')
      .insert({
        company_id: 'platform',
        module_key: item.module_key,
        section_index: item.section_index,
        item_index: item.item_index,
        custom_title: item.custom_title,
        custom_content: item.custom_content,
        source: 'platform',
        merchant_source: null,
        is_deleted: false,
        review_status: 'none',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[custom-training/review] Platform insert error:', insertError.message);
      // Rollback the approve status
      await supabase
        .from('custom_training_content')
        .update({ review_status: 'pending', reviewed_at: null, updated_at: now })
        .eq('id', item_id);
      return NextResponse.json({ error: '创建平台模板失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, action: 'approved', platform_record_id: newRecord?.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[custom-training/review] POST Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
