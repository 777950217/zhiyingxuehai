import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * POST /api/custom-training/import
 * 批量导入自定义培训内容
 *
 * Body:
 *   - items: Array<{ module_key, section_index, item_index, custom_title?, custom_content? }>
 *   - 先查后写：已存在则update（保留created_at），不存在则insert
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
    const { items } = body as {
      items: Array<{
        module_key: string;
        section_index: number;
        item_index: number;
        custom_title?: string;
        custom_content?: string;
      }>;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: '缺少items数组或数组为空' }, { status: 400 });
    }

    // Filter out items with missing required fields
    const validItems = items.filter(
      (item) => item.module_key && item.section_index !== undefined && item.item_index !== undefined
    );

    if (validItems.length === 0) {
      return NextResponse.json({ error: '无有效数据可导入' }, { status: 400 });
    }

    const companyId = profile.company_id;
    const now = new Date().toISOString();

    // Step 1: Query existing records for this company + module_keys
    const moduleKeys = [...new Set(validItems.map((item) => item.module_key))];
    const { data: existingRows, error: queryError } = await supabase
      .from('custom_training_content')
      .select('id, module_key, section_index, item_index, created_at')
      .eq('company_id', companyId)
      .in('module_key', moduleKeys)
      .eq('is_deleted', false);

    if (queryError) {
      console.error('[custom-training/import] Query existing error:', queryError.message);
      return NextResponse.json({ error: '查询已有记录失败' }, { status: 500 });
    }

    // Build a lookup map: "module_key:section_index:item_index" => { id, created_at }
    const existingMap = new Map<string, { id: string; created_at: string }>();
    for (const row of existingRows || []) {
      const key = `${row.module_key}:${row.section_index}:${row.item_index}`;
      existingMap.set(key, { id: row.id, created_at: row.created_at });
    }

    // Step 2: Separate into insert and update batches
    const toInsert: Array<{
      company_id: string;
      module_key: string;
      section_index: number;
      item_index: number;
      custom_title: string | null;
      custom_content: string | null;
      source: string;
      merchant_source: string;
      is_deleted: boolean;
      review_status: string;
      created_at: string;
      updated_at: string;
    }> = [];

    const toUpdate: Array<{ id: string; data: Record<string, unknown> }> = [];

    for (const item of validItems) {
      const lookupKey = `${item.module_key}:${item.section_index}:${item.item_index}`;
      const existing = existingMap.get(lookupKey);

      if (existing) {
        // Update: only update mutable fields, preserve created_at
        toUpdate.push({
          id: existing.id,
          data: {
            custom_title: item.custom_title || null,
            custom_content: item.custom_content || null,
            updated_at: now,
          },
        });
      } else {
        // Insert: new record with created_at
        toInsert.push({
          company_id: companyId,
          module_key: item.module_key,
          section_index: item.section_index,
          item_index: item.item_index,
          custom_title: item.custom_title || null,
          custom_content: item.custom_content || null,
          source: 'merchant',
          merchant_source: companyId,
          is_deleted: false,
          review_status: 'pending',
          created_at: now,
          updated_at: now,
        });
      }
    }

    // Step 3: Execute inserts and updates
    let insertedCount = 0;
    let updatedCount = 0;

    if (toInsert.length > 0) {
      const { data: insertData, error: insertError } = await supabase
        .from('custom_training_content')
        .insert(toInsert)
        .select();

      if (insertError) {
        console.error('[custom-training/import] Insert error:', insertError.message);
        return NextResponse.json({ error: '批量导入新增失败' }, { status: 500 });
      }
      insertedCount = insertData?.length || 0;
    }

    if (toUpdate.length > 0) {
      // Update records one by one (Supabase JS doesn't support batch update with different data per row)
      const updatePromises = toUpdate.map(({ id, data }) =>
        supabase
          .from('custom_training_content')
          .update(data)
          .eq('id', id)
          .select()
      );

      const updateResults = await Promise.all(updatePromises);
      for (const result of updateResults) {
        if (result.error) {
          console.error('[custom-training/import] Update error:', result.error.message);
        } else {
          updatedCount += result.data?.length || 0;
        }
      }
    }

    return NextResponse.json({
      imported: insertedCount + updatedCount,
      inserted: insertedCount,
      updated: updatedCount,
      total: validItems.length,
      skipped: items.length - validItems.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[custom-training/import] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
