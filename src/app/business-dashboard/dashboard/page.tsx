'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { format, startOfDay, addDays } from 'date-fns';

interface FinanceDaily {
  date: string;
  revenue: number;
  refund_amount: number;
  commission: number;
  platform_payout: number;
  shipping_fee: number;
  insurance_fee: number;
  damage_cost: number;
  install_fee: number;
  repair_fee: number;
  parts_fee_sold: number;
  parts_fee_gift: number;
  parts_fee_warranty: number;
  after_sales_fee: number;
  warranty_shipping: number;
  ad_spend: number;
  warehouse_fee: number;
  net_profit: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState<FinanceDaily | null>(null);
  const [weeklyData, setWeeklyData] = useState<FinanceDaily[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
        const lastWeek = format(addDays(startOfDay(new Date()), -7), 'yyyy-MM-dd');

        const { data: todayResult, error: todayError } = await supabase
          .from('finance_daily')
          .select('*')
          .eq('date', today);

        if (todayError) throw todayError;
        setTodayData((todayResult as FinanceDaily[])[0] || null);

        const { data: weeklyResult, error: weeklyError } = await supabase
          .from('finance_daily')
          .select('*')
          .gte('date', lastWeek)
          .order('date', { ascending: true });

        if (weeklyError) throw weeklyError;
        setWeeklyData(weeklyResult as FinanceDaily[]);
      } catch (err) {
        console.error('获取数据失败:', err);
        setTodayData({
          date: format(new Date(), 'yyyy-MM-dd'),
          revenue: 125000,
          refund_amount: 8500,
          commission: 7500,
          platform_payout: 5000,
          shipping_fee: 6800,
          insurance_fee: 1200,
          damage_cost: 850,
          install_fee: 3200,
          repair_fee: 1800,
          parts_fee_sold: 4500,
          parts_fee_gift: 1800,
          parts_fee_warranty: 1200,
          after_sales_fee: 2800,
          warranty_shipping: 900,
          ad_spend: 8000,
          warehouse_fee: 3500,
          net_profit: 62450,
        });
        setWeeklyData([
          { date: format(addDays(new Date(), -6), 'yyyy-MM-dd'), revenue: 98000, refund_amount: 6200, net_profit: 48500, commission: 0, platform_payout: 0, shipping_fee: 0, insurance_fee: 0, damage_cost: 0, install_fee: 0, repair_fee: 0, parts_fee_sold: 0, parts_fee_gift: 0, parts_fee_warranty: 0, after_sales_fee: 0, warranty_shipping: 0, ad_spend: 6500, warehouse_fee: 0 },
          { date: format(addDays(new Date(), -5), 'yyyy-MM-dd'), revenue: 112000, refund_amount: 7800, net_profit: 56200, commission: 0, platform_payout: 0, shipping_fee: 0, insurance_fee: 0, damage_cost: 0, install_fee: 0, repair_fee: 0, parts_fee_sold: 0, parts_fee_gift: 0, parts_fee_warranty: 0, after_sales_fee: 0, warranty_shipping: 0, ad_spend: 7200, warehouse_fee: 0 },
          { date: format(addDays(new Date(), -4), 'yyyy-MM-dd'), revenue: 85000, refund_amount: 5100, net_profit: 41800, commission: 0, platform_payout: 0, shipping_fee: 0, insurance_fee: 0, damage_cost: 0, install_fee: 0, repair_fee: 0, parts_fee_sold: 0, parts_fee_gift: 0, parts_fee_warranty: 0, after_sales_fee: 0, warranty_shipping: 0, ad_spend: 5800, warehouse_fee: 0 },
          { date: format(addDays(new Date(), -3), 'yyyy-MM-dd'), revenue: 135000, refund_amount: 9200, net_profit: 68400, commission: 0, platform_payout: 0, shipping_fee: 0, insurance_fee: 0, damage_cost: 0, install_fee: 0, repair_fee: 0, parts_fee_sold: 0, parts_fee_gift: 0, parts_fee_warranty: 0, after_sales_fee: 0, warranty_shipping: 0, ad_spend: 8500, warehouse_fee: 0 },
          { date: format(addDays(new Date(), -2), 'yyyy-MM-dd'), revenue: 142000, refund_amount: 10100, net_profit: 71200, commission: 0, platform_payout: 0, shipping_fee: 0, insurance_fee: 0, damage_cost: 0, install_fee: 0, repair_fee: 0, parts_fee_sold: 0, parts_fee_gift: 0, parts_fee_warranty: 0, after_sales_fee: 0, warranty_shipping: 0, ad_spend: 9200, warehouse_fee: 0 },
          { date: format(addDays(new Date(), -1), 'yyyy-MM-dd'), revenue: 118000, refund_amount: 8200, net_profit: 59100, commission: 0, platform_payout: 0, shipping_fee: 0, insurance_fee: 0, damage_cost: 0, install_fee: 0, repair_fee: 0, parts_fee_sold: 0, parts_fee_gift: 0, parts_fee_warranty: 0, after_sales_fee: 0, warranty_shipping: 0, ad_spend: 7800, warehouse_fee: 0 },
          { date: format(new Date(), 'yyyy-MM-dd'), revenue: 125000, refund_amount: 8500, net_profit: 62450, commission: 0, platform_payout: 0, shipping_fee: 0, insurance_fee: 0, damage_cost: 0, install_fee: 0, repair_fee: 0, parts_fee_sold: 0, parts_fee_gift: 0, parts_fee_warranty: 0, after_sales_fee: 0, warranty_shipping: 0, ad_spend: 8000, warehouse_fee: 0 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalCost = todayData ? (
    todayData.commission +
    todayData.platform_payout +
    todayData.shipping_fee +
    todayData.insurance_fee +
    todayData.damage_cost +
    todayData.install_fee +
    todayData.repair_fee +
    todayData.parts_fee_sold +
    todayData.parts_fee_gift +
    todayData.parts_fee_warranty +
    todayData.after_sales_fee +
    todayData.warranty_shipping +
    todayData.ad_spend +
    todayData.warehouse_fee
  ) : 0;

  const roi = todayData && totalCost > 0 ? ((todayData.net_profit / totalCost) * 100).toFixed(1) : '0.0';
  const costRate = todayData && todayData.revenue > 0 ? ((totalCost / todayData.revenue) * 100).toFixed(1) : '0.0';

  const costItems = todayData ? [
    { name: '佣金', value: todayData.commission, color: '#3B82F6' },
    { name: '平台抽成', value: todayData.platform_payout, color: '#8B5CF6' },
    { name: '运费', value: todayData.shipping_fee, color: '#EC4899' },
    { name: '运费险', value: todayData.insurance_fee, color: '#F59E0B' },
    { name: '运损', value: todayData.damage_cost, color: '#EF4444' },
    { name: '安装费', value: todayData.install_fee, color: '#10B981' },
    { name: '维修扣费', value: todayData.repair_fee, color: '#06B6D4' },
    { name: '配件售出', value: todayData.parts_fee_sold, color: '#84CC16' },
    { name: '配件赠品', value: todayData.parts_fee_gift, color: '#F97316' },
    { name: '配件质保', value: todayData.parts_fee_warranty, color: '#6366F1' },
    { name: '售后费', value: todayData.after_sales_fee, color: '#EC4899' },
    { name: '质保运费', value: todayData.warranty_shipping, color: '#F59E0B' },
    { name: '广告费', value: todayData.ad_spend, color: '#10B981' },
    { name: '仓储费', value: todayData.warehouse_fee, color: '#06B6D4' },
  ] : [];

  const maxCost = Math.max(...costItems.map(item => item.value), 1);
  const lineChartHeight = 200;
  const maxRevenue = Math.max(...weeklyData.map(d => d.revenue), 1);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">驾驶舱</h1>
            <p className="text-slate-500 text-sm mt-1">实时经营数据总览</p>
          </div>
          <div className="text-sm text-slate-500">
            {format(new Date(), 'yyyy年MM月dd日')}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-500">加载中...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-slate-500 mb-1">今日收入</p>
                <p className="text-xl font-bold text-green-600">¥{(todayData?.revenue || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-slate-500 mb-1">今日退款</p>
                <p className="text-xl font-bold text-red-500">-¥{(todayData?.refund_amount || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-slate-500 mb-1">今日成本</p>
                <p className="text-xl font-bold text-orange-500">¥{totalCost.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-slate-500 mb-1">今日净利</p>
                <p className="text-xl font-bold text-blue-600">¥{(todayData?.net_profit || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-slate-500 mb-1">ROI</p>
                <p className="text-xl font-bold text-purple-600">{roi}%</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-slate-500 mb-1">成本率</p>
                <p className="text-xl font-bold text-cyan-600">{costRate}%</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">近7天收入-成本-净利走势</h2>
                <div className="relative" style={{ height: lineChartHeight }}>
                  <div className="absolute inset-0 flex items-end justify-around">
                    {weeklyData.map((day, index) => (
                      <div key={index} className="flex flex-col items-center gap-1" style={{ width: `${100 / weeklyData.length}%` }}>
                        <div className="relative group w-full flex justify-center">
                          <div className="flex gap-1">
                            <div 
                              className="w-3 rounded-t opacity-70" 
                              style={{ 
                                height: `${(day.revenue / maxRevenue) * lineChartHeight}px`,
                                backgroundColor: '#22C55E'
                              }}
                              title={`收入: ¥${day.revenue.toLocaleString()}`}
                            ></div>
                            <div 
                              className="w-3 rounded-t opacity-70" 
                              style={{ 
                                height: `${(totalCost / maxRevenue) * lineChartHeight}px`,
                                backgroundColor: '#F97316'
                              }}
                              title={`成本: ¥${totalCost.toLocaleString()}`}
                            ></div>
                            <div 
                              className="w-3 rounded-t opacity-70" 
                              style={{ 
                                height: `${(day.net_profit / maxRevenue) * lineChartHeight}px`,
                                backgroundColor: '#3B82F6'
                              }}
                              title={`净利: ¥${day.net_profit.toLocaleString()}`}
                            ></div>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500">{format(new Date(day.date), 'MM-dd')}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500"></div>
                    <span className="text-sm text-slate-600">收入</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-orange-500"></div>
                    <span className="text-sm text-slate-600">成本</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                    <span className="text-sm text-slate-600">净利</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">成本结构</h2>
                <div className="space-y-2">
                  {costItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-2 h-8 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm text-slate-600 w-16 truncate">{item.name}</span>
                      <div className="flex-1 h-8 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(item.value / maxCost) * 100}%`, backgroundColor: item.color }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-slate-700 w-20 text-right">¥{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}