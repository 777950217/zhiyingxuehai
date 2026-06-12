import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface BusinessRecord {
  year: number;
  month: number;
  total_revenue: number;
  total_expense: number;
  net_profit: number;
  after_sales_total: number;
  returns_total: number;
  monthly_orders: number;
  ad_roi: number;
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');
    if (!userId || !userRole) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    if (userRole !== 'enterprise_admin' && userRole !== 'admin') {
      return NextResponse.json({ error: '仅旗舰版管理员可访问' }, { status: 403 });
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
    const companyId = user.company_id;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 读取近7个月的经营数据（含上月对比）
    const records: BusinessRecord[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;

      const { data } = await supabase
        .from('business_records')
        .select('year, month, total_revenue, total_expense, net_profit, after_sales_total, returns_total, monthly_orders, ad_roi')
        .eq('company_id', companyId)
        .eq('year', y)
        .eq('month', m)
        .single();

      if (data) {
        records.push(data as BusinessRecord);
      }
    }

    const hasAnyData = records.length > 0;

    // 1. 月度盈亏
    const currentRecord = records.find(r => r.year === currentYear && r.month === currentMonth);
    const lastMonthDate = new Date(currentYear, currentMonth - 2, 1);
    const lastRecord = records.find(r => r.year === lastMonthDate.getFullYear() && r.month === lastMonthDate.getMonth() + 1);

    const pnl = currentRecord
      ? { income: Number(currentRecord.total_revenue), expense: Number(currentRecord.total_expense), profit: Number(currentRecord.net_profit) }
      : { income: 0, expense: 0, profit: 0 };
    const lastPnl = lastRecord
      ? { income: Number(lastRecord.total_revenue), expense: Number(lastRecord.total_expense), profit: Number(lastRecord.net_profit) }
      : { income: 0, expense: 0, profit: 0 };

    // 2. 退款退货率（基于 after_sales_total + returns_total 占收入比）
    const currentAfterSale = currentRecord ? Number(currentRecord.after_sales_total) + Number(currentRecord.returns_total) : 0;
    const lastAfterSale = lastRecord ? Number(lastRecord.after_sales_total) + Number(lastRecord.returns_total) : 0;
    const refundRate = pnl.income > 0 ? (currentAfterSale / pnl.income * 100) : 0;
    const lastRefundRate = lastPnl.income > 0 ? (lastAfterSale / lastPnl.income * 100) : 0;
    const refundRateChange = lastRefundRate > 0 ? ((refundRate - lastRefundRate) / lastRefundRate * 100) : 0;

    // 3. 利润趋势（近6个月，去掉可能的第7个月）
    const profitTrend = records.slice(-6).map(r => ({
      month: `${r.year}-${String(r.month).padStart(2, '0')}`,
      profit: Number(r.net_profit),
    }));

    // 4. 成本预警摘要
    const costChangePercent = lastAfterSale > 0 ? ((currentAfterSale - lastAfterSale) / lastAfterSale * 100) : 0;
    const budgetLimit = 10000;
    const isOverBudget = currentAfterSale > budgetLimit;

    return NextResponse.json({
      pnl,
      lastPnl,
      refund: {
        rate: Math.round(refundRate * 100) / 100,
        amount: currentAfterSale,
        change: Math.round(refundRateChange * 100) / 100,
        hasData: hasAnyData && (pnl.income > 0 || currentAfterSale > 0),
      },
      profitTrend,
      costAlert: {
        currentAfterSaleCost: currentAfterSale,
        change: Math.round(costChangePercent * 100) / 100,
        isOverBudget,
        budgetLimit,
        hasData: hasAnyData && (currentAfterSale > 0 || lastAfterSale > 0),
      },
      hasData: hasAnyData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
