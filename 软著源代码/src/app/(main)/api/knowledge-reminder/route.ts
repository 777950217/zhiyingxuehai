import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET: 知识库更新提醒配置
// POST: 更新提醒配置 / 标记已检查
export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: '缺少company_id' }, { status: 400 });
    }

    const { data: config } = await supabase
      .from('knowledge_update_reminders')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    // 获取知识库最后更新时间
    const { data: latestKnowledge } = await supabase
      .from('custom_knowledge')
      .select('updated_at')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(1);

    const lastKnowledgeUpdate = latestKnowledge?.[0]?.updated_at || null;

    return NextResponse.json({
      data: {
        config: config ? {
          frequency: config.frequency,
          isActive: config.is_active,
          lastCheckAt: config.last_check_at,
          nextRemindAt: config.next_remind_at,
        } : null,
        lastKnowledgeUpdate,
        needsCheck: config ? (!config.last_check_at || new Date(config.last_check_at) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)) : true,
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

    if (action === 'update_config') {
      const frequency = body.frequency || 'biweekly';
      const now = new Date();
      const nextRemind = new Date();

      if (frequency === 'weekly') nextRemind.setDate(now.getDate() + 7);
      else if (frequency === 'biweekly') nextRemind.setDate(now.getDate() + 14);
      else nextRemind.setDate(now.getDate() + 30);

      const { data, error } = await supabase
        .from('knowledge_update_reminders')
        .upsert({
          company_id,
          frequency,
          is_active: body.is_active !== undefined ? body.is_active : true,
          next_remind_at: nextRemind.toISOString(),
          updated_at: now.toISOString(),
        }, { onConflict: 'company_id' })
        .select()
        .single();

      if (error) return NextResponse.json({ error: '配置更新失败' }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (action === 'mark_checked') {
      const now = new Date();
      const { data: existing } = await supabase
        .from('knowledge_update_reminders')
        .select('frequency')
        .eq('company_id', company_id)
        .maybeSingle();

      const frequency = existing?.frequency || 'biweekly';
      const nextRemind = new Date();
      if (frequency === 'weekly') nextRemind.setDate(now.getDate() + 7);
      else if (frequency === 'biweekly') nextRemind.setDate(now.getDate() + 14);
      else nextRemind.setDate(now.getDate() + 30);

      const { data, error } = await supabase
        .from('knowledge_update_reminders')
        .upsert({
          company_id,
          last_check_at: now.toISOString(),
          next_remind_at: nextRemind.toISOString(),
          updated_at: now.toISOString(),
        }, { onConflict: 'company_id' })
        .select()
        .single();

      if (error) return NextResponse.json({ error: '标记失败' }, { status: 500 });
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
