import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET: 自检清单+记录+提醒配置
// POST: 添加检查项/提交自检/更新提醒配置
export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: '缺少company_id' }, { status: 400 });
    }

    // 预设+自定义检查项
    const { data: presetItems } = await supabase
      .from('self_check_items')
      .select('*')
      .eq('company_id', 'preset')
      .eq('is_active', true)
      .order('sort_order');

    const { data: customItems } = await supabase
      .from('self_check_items')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order');

    const items = [
      ...(presetItems || []).map((i: { id: string; content: string; category: string; is_preset: boolean; sort_order: number }) => ({
        id: i.id, content: i.content, category: i.category, isPreset: true, sortOrder: i.sort_order,
      })),
      ...(customItems || []).map((i: { id: string; content: string; category: string; is_preset: boolean; sort_order: number }) => ({
        id: i.id, content: i.content, category: i.category, isPreset: false, sortOrder: i.sort_order,
      })),
    ];

    // 最近的自检记录
    const { data: recentRecords } = await supabase
      .from('self_check_records')
      .select('*')
      .eq('company_id', companyId)
      .order('check_date', { ascending: false })
      .limit(10);

    // 提醒配置
    const { data: reminder } = await supabase
      .from('self_check_reminders')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    return NextResponse.json({
      data: {
        items,
        recentRecords: (recentRecords || []).map((r: { id: string; check_date: string; total_items: number; passed_items: number; score: string | null; results: unknown }) => ({
          id: r.id,
          checkDate: r.check_date,
          totalItems: r.total_items,
          passedItems: r.passed_items,
          score: r.score ? Number(r.score) : null,
          results: r.results,
        })),
        reminder: reminder ? {
          frequency: reminder.frequency,
          reminderDay: reminder.reminder_day,
          isActive: reminder.is_active,
          lastRemindedAt: reminder.last_reminded_at,
        } : null,
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const body = await request.json();
    const { action, company_id } = body;

    if (!company_id) {
      return NextResponse.json({ error: '缺少company_id' }, { status: 400 });
    }

    if (action === 'add_item') {
      const { data, error } = await supabase
        .from('self_check_items')
        .insert({
          company_id,
          content: body.content,
          category: body.category || '日常检查',
          sort_order: body.sort_order || 100,
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: '检查项添加失败' }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (action === 'delete_item') {
      const { error } = await supabase
        .from('self_check_items')
        .delete()
        .eq('id', body.item_id)
        .eq('company_id', company_id);
      if (error) return NextResponse.json({ error: '删除失败' }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'submit_check') {
      const results = body.results || []; // [{itemId, passed, note}]
      const totalItems = results.length;
      const passedItems = results.filter((r: { passed: boolean }) => r.passed).length;
      const score = totalItems > 0 ? Math.round((passedItems / totalItems) * 100 * 10) / 10 : 0;

      const { data, error } = await supabase
        .from('self_check_records')
        .insert({
          company_id,
          user_id: body.user_id,
          check_date: new Date().toISOString().split('T')[0],
          results: JSON.stringify(results),
          total_items: totalItems,
          passed_items: passedItems,
          score,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: '自检提交失败' }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (action === 'update_reminder') {
      const { data, error } = await supabase
        .from('self_check_reminders')
        .upsert({
          company_id,
          frequency: body.frequency || 'weekly',
          reminder_day: body.reminder_day || 1,
          is_active: body.is_active !== undefined ? body.is_active : true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id' })
        .select()
        .single();

      if (error) return NextResponse.json({ error: '提醒配置更新失败' }, { status: 500 });
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
