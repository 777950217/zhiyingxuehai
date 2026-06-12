import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** GET /api/payment-orders — 查询订单 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const companyId = searchParams.get('company_id');
    const userId = searchParams.get('user_id');

    let query = supabase
      .from('payment_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (companyId) query = query.eq('company_id', companyId);
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) throw new Error(`查询订单失败: ${error.message}`);

    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/payment-orders — 创建订单 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { company_id, user_id, plan, amount, period, payment_method } = body;

    if (!company_id || !user_id || !plan || !amount) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const orderNo = 'PG' + Date.now();

    const { data, error } = await supabase
      .from('payment_orders')
      .insert({
        company_id,
        user_id,
        order_no: orderNo,
        plan,
        amount,
        period: period || 'monthly',
        payment_method: payment_method || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new Error(`创建订单失败: ${error.message}`);

    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
