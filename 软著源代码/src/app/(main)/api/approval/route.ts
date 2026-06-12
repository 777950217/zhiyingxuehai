import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET: 获取审批阈值配置
// POST: 提交审批 / 更新阈值配置
// PATCH: 审批操作(通过/拒绝)

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const body = await request.json();
    const { action, company_id, record_id, amount, reason, submitted_by, manager_limit, boss_limit, boss_plus_note } = body;

    if (!company_id) {
      return NextResponse.json({ error: '缺少company_id' }, { status: 400 });
    }

    if (action === 'submit') {
      // 提交赔付审批
      if (!amount || !submitted_by) {
        return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
      }

      // 获取阈值配置
      const { data: threshold } = await supabase
        .from('approval_thresholds')
        .select('*')
        .eq('company_id', company_id)
        .maybeSingle();

      const managerLimit = Number(threshold?.manager_limit || 500);
      const bossLimit = Number(threshold?.boss_limit || 2000);

      // 判断审批级别
      let level = 'manager';
      if (Number(amount) > bossLimit) {
        level = 'boss_plus';
      } else if (Number(amount) > managerLimit) {
        level = 'boss';
      }

      const { data: flow, error } = await supabase
        .from('approval_flows')
        .insert({
          company_id,
          record_id: record_id || null,
          amount: Number(amount),
          reason: reason || '',
          submitted_by,
          status: level === 'manager' ? 'auto_approved' : 'pending',
          level,
        })
        .select()
        .single();

      if (error) {
        console.error('[approval POST submit] Error:', JSON.stringify(error));
        return NextResponse.json({ error: '审批提交失败' }, { status: 500 });
      }

      return NextResponse.json({ data: flow, autoApproved: level === 'manager' });
    }

    if (action === 'update_threshold') {
      // 更新审批阈值配置
      const { data, error } = await supabase
        .from('approval_thresholds')
        .upsert({
          company_id,
          manager_limit: manager_limit || 500,
          boss_limit: boss_limit || 2000,
          boss_plus_note: boss_plus_note !== undefined ? boss_plus_note : true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id' })
        .select()
        .single();

      if (error) {
        console.error('[approval POST threshold] Error:', JSON.stringify(error));
        return NextResponse.json({ error: '阈值更新失败' }, { status: 500 });
      }

      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[approval POST] Error:', message);
    return NextResponse.json({ error: `操作失败: ${message}` }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const body = await request.json();
    const { id, action: patchAction, approved_by, reject_reason } = body;

    if (!id || !approved_by) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    if (patchAction === 'approve') {
      const { data, error } = await supabase
        .from('approval_flows')
        .update({
          status: 'approved',
          approved_by,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: '审批通过操作失败' }, { status: 500 });
      }
      return NextResponse.json({ data });
    }

    if (patchAction === 'reject') {
      const { data, error } = await supabase
        .from('approval_flows')
        .update({
          status: 'rejected',
          approved_by,
          reject_reason: reject_reason || '',
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: '审批拒绝操作失败' }, { status: 500 });
      }
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[approval PATCH] Error:', message);
    return NextResponse.json({ error: `操作失败: ${message}` }, { status: 500 });
  }
}
