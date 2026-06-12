import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** PATCH /api/payment-orders/[id] — 更新订单状态 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseClient();
    const body = await request.json();

    // 先查询当前订单
    const { data: order, error: fetchErr } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 场景1: 用户上传付款截图 → pending → paid
    if (body.screenshot_url) {
      if (order.status !== 'pending') {
        return NextResponse.json({ error: '当前状态不允许上传截图' }, { status: 400 });
      }
      const { data, error } = await supabase
        .from('payment_orders')
        .update({
          screenshot_url: body.screenshot_url,
          payment_method: body.payment_method || order.payment_method,
          status: 'paid',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(`更新失败: ${error.message}`);
      return NextResponse.json({ data });
    }

    // 场景2: 管理员确认 → paid → confirmed
    if (body.action === 'confirm') {
      if (order.status !== 'paid') {
        return NextResponse.json({ error: '仅已付款订单可确认' }, { status: 400 });
      }

      const confirmedBy = body.confirmed_by || null;

      // ─── 角色自动升级逻辑 ───
      const planToRole: Record<string, string> = {
        basic: 'staff',
        pro: 'enterprise_manager',
        flagship: 'enterprise_admin',
      };
      const planToSeatLimit: Record<string, number> = {
        basic: 1,
        pro: 5,
        flagship: 15,
      };
      const planToCompanyPlan: Record<string, string> = {
        basic: 'basic',
        pro: 'pro',
        flagship: 'flagship',
      };

      const newRole = planToRole[order.plan] || 'staff';
      const newSeatLimit = planToSeatLimit[order.plan] || 1;
      const newCompanyPlan = planToCompanyPlan[order.plan] || 'basic';

      // 计算到期日
      const periodDays: Record<string, number> = {
        monthly: 30,
        quarterly: 90,
        semiannual: 180,
      };
      const days = periodDays[order.period] || 30;
      const now = new Date();
      const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      // 1. 更新订单状态
      const { data: updatedOrder, error: orderErr } = await supabase
        .from('payment_orders')
        .update({
          status: 'confirmed',
          confirmed_by: confirmedBy,
          confirmed_at: now.toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (orderErr) throw new Error(`确认失败: ${orderErr.message}`);

      // 2. 更新用户角色
      await supabase
        .from('users')
        .update({ role: newRole, updated_at: now.toISOString() })
        .eq('id', order.user_id);

      // 3. 更新企业信息
      await supabase
        .from('companies')
        .update({
          plan: newCompanyPlan,
          seat_limit: newSeatLimit,
          plan_start: now.toISOString(),
          plan_end: endDate.toISOString(),
          status: 'active',
        })
        .eq('id', order.company_id);

      // 4. 更新/创建 subscription 记录
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('company_id', order.company_id)
        .maybeSingle();

      if (existingSub) {
        await supabase
          .from('subscriptions')
          .update({
            plan: order.plan,
            plan_period: order.period,
            plan_start: now.toISOString(),
            plan_end: endDate.toISOString(),
          })
          .eq('id', existingSub.id);
      } else {
        await supabase.from('subscriptions').insert({
          company_id: order.company_id,
          plan: order.plan,
          plan_period: order.period,
          plan_start: now.toISOString(),
          plan_end: endDate.toISOString(),
        });
      }

      return NextResponse.json({ data: updatedOrder });
    }

    // 场景3: 管理员拒绝 → paid → rejected
    if (body.action === 'reject') {
      if (order.status !== 'paid') {
        return NextResponse.json({ error: '仅已付款订单可拒绝' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('payment_orders')
        .update({
          status: 'rejected',
          confirmed_by: body.confirmed_by || null,
          confirmed_at: new Date().toISOString(),
          remark: body.remark || '管理员拒绝',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(`拒绝失败: ${error.message}`);
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '操作失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
