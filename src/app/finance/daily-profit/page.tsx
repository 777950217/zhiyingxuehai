'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface DailyProfit {
  id: string;
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

const costColumns = [
  { key: 'commission', label: '佣金' },
  { key: 'platform_payout', label: '平台抽成' },
  { key: 'shipping_fee', label: '运费' },
  { key: 'insurance_fee', label: '运费险' },
  { key: 'damage_cost', label: '运损' },
  { key: 'install_fee', label: '安装费' },
  { key: 'repair_fee', label: '维修扣费' },
  { key: 'parts_fee_sold', label: '配件-售出' },
  { key: 'parts_fee_gift', label: '配件-赠品' },
  { key: 'parts_fee_warranty', label: '配件-质保' },
  { key: 'after_sales_fee', label: '售后费' },
  { key: 'warranty_shipping', label: '质保运费' },
  { key: 'ad_spend', label: '广告费' },
  { key: 'warehouse_fee', label: '仓储费' },
];

export default function DailyProfitPage() {
  const [data, setData] = useState<DailyProfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const calculateNetProfit = (item: DailyProfit): number => {
    const totalCost = 
      item.commission +
      item.platform_payout +
      item.shipping_fee +
      item.insurance_fee +
      item.damage_cost +
      item.install_fee +
      item.repair_fee +
      item.parts_fee_sold +
      item.parts_fee_gift +
      item.parts_fee_warranty +
      item.after_sales_fee +
      item.warranty_shipping +
      item.ad_spend +
      item.warehouse_fee +
      item.refund_amount;
    return item.revenue - totalCost;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        let query = supabase.from('finance_daily').select('*');

        if (viewMode === 'monthly') {
          const [year, month] = selectedMonth.split('-').map(Number);
          const start = startOfMonth(new Date(year, month - 1));
          const end = endOfMonth(new Date(year, month - 1));
          query = query.gte('date', format(start, 'yyyy-MM-dd')).lte('date', format(end, 'yyyy-MM-dd'));
        } else {
          const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');
          query = query.gte('date', sevenDaysAgo);
        }

        const { data: result, error: fetchError } = await query.order('date', { ascending: false });
        
        if (fetchError) throw fetchError;
        
        const processedData = result.map(item => ({
          ...item,
          net_profit: calculateNetProfit(item as DailyProfit)
        }));
        
        setData(processedData as DailyProfit[]);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取数据失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [viewMode, selectedMonth]);

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalRefund = data.reduce((sum, item) => sum + item.refund_amount, 0);
  const totalNetProfit = data.reduce((sum, item) => sum + item.net_profit, 0);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">每日盈亏</h1>
            <p className="text-slate-500 text-sm mt-1">实时监控企业经营状况</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'daily'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                近7天
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'monthly'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                月度累计
              </button>
            </div>
            {viewMode === 'monthly' && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-slate-500 text-sm">总收入</p>
            <p className="text-2xl font-bold text-green-600 mt-1">¥{totalRevenue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-slate-500 text-sm">总退款</p>
            <p className="text-2xl font-bold text-red-500 mt-1">-¥{totalRefund.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-slate-500 text-sm">净盈利</p>
            <p className={`text-2xl font-bold mt-1 ${totalNetProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {totalNetProfit >= 0 ? '¥' : '-¥'}{Math.abs(totalNetProfit).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-500">加载中...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">日期</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">收入</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">退款</th>
                    {costColumns.map(col => (
                      <th key={col.key} className="px-3 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{col.label}</th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-green-600 uppercase tracking-wider font-bold">净利</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                        {format(new Date(item.date), 'yyyy-MM-dd', { locale: zhCN })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                        ¥{item.revenue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-500">
                        -¥{item.refund_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </td>
                      {costColumns.map(col => (
                        <td key={col.key} className="px-3 py-4 whitespace-nowrap text-sm text-right text-slate-600">
                          -¥{(item as unknown as Record<string, number>)[col.key].toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                        </td>
                      ))}
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${
                        item.net_profit >= 0 ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {item.net_profit >= 0 ? '¥' : '-¥'}{Math.abs(item.net_profit).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td className="px-6 py-4 text-sm text-slate-600">合计</td>
                    <td className="px-6 py-4 text-sm text-right text-green-600">¥{totalRevenue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-sm text-right text-red-500">-¥{totalRefund.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</td>
                    {costColumns.map(col => {
                      const total = data.reduce((sum, item) => sum + (item as unknown as Record<string, number>)[col.key], 0);
                      return (
                        <td key={col.key} className="px-3 py-4 text-sm text-right text-slate-600">
                          -¥{total.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                        </td>
                      );
                    })}
                    <td className={`px-6 py-4 text-sm text-right font-bold ${
                      totalNetProfit >= 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {totalNetProfit >= 0 ? '¥' : '-¥'}{Math.abs(totalNetProfit).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}