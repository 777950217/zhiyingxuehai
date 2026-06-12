import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/business-records?companyId=xxx&year=2025&month=6
 * 查询公司指定月份的经营数据（从 business_records 表）
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');
    if (!userId || !userRole) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const { data: user } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single();
    if (!user?.company_id) {
      return NextResponse.json({ error: '未找到公司' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId') || user.company_id;
    const yearStr = searchParams.get('year');
    const monthStr = searchParams.get('month');

    let query = supabase
      .from('business_records')
      .select('*')
      .eq('company_id', companyId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (yearStr) query = query.eq('year', Number(yearStr));
    if (monthStr) query = query.eq('month', Number(monthStr));

    const { data, error } = await query;
    if (error) throw new Error(`查询经营数据失败: ${error.message}`);

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/business-records
 * 保存/更新公司月度经营数据（upsert by company_id + year + month）
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');
    if (!userId || !userRole) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await req.json();
    const {
      company_id, year, month,
      total_revenue, purchase_total, ad_total, shipping_pack_total,
      salary_total, rent_total, utilities_total, after_sales_total,
      returns_total, platform_fee_total, total_expense, net_profit, ad_roi,
      fixed_rent, fixed_salary, fixed_utilities, fixed_after_sales,
      fixed_returns, monthly_orders, notes,
    } = body;

    if (!company_id || !year || !month) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // upsert by unique constraint (company_id, year, month)
    const record: Record<string, unknown> = {
      company_id,
      user_id: userId,
      year: Number(year),
      month: Number(month),
      total_revenue: Number(total_revenue) || 0,
      purchase_total: Number(purchase_total) || 0,
      ad_total: Number(ad_total) || 0,
      shipping_pack_total: Number(shipping_pack_total) || 0,
      salary_total: Number(salary_total) || 0,
      rent_total: Number(rent_total) || 0,
      utilities_total: Number(utilities_total) || 0,
      after_sales_total: Number(after_sales_total) || 0,
      returns_total: Number(returns_total) || 0,
      platform_fee_total: Number(platform_fee_total) || 0,
      total_expense: Number(total_expense) || 0,
      net_profit: Number(net_profit) || 0,
      ad_roi: Number(ad_roi) || 0,
      fixed_rent: Number(fixed_rent) || 0,
      fixed_salary: Number(fixed_salary) || 0,
      fixed_utilities: Number(fixed_utilities) || 0,
      fixed_after_sales: Number(fixed_after_sales) || 0,
      fixed_returns: Number(fixed_returns) || 0,
      monthly_orders: Number(monthly_orders) || 0,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('business_records')
      .upsert(record, { onConflict: 'company_id,year,month' })
      .select()
      .single();

    if (error) throw new Error(`保存经营数据失败: ${error.message}`);

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
