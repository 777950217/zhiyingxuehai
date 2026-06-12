'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface CostItem {
  id: string;
  cost_type: string;
  amount: number;
  description: string;
}

const costItems = [
  { key: 'commission', label: '佣金', unit: '元', isRatio: false },
  { key: 'platform_payout', label: '平台抽成', unit: '元', isRatio: false },
  { key: 'shipping_fee', label: '运费', unit: '元', isRatio: false },
  { key: 'insurance_fee', label: '运费险', unit: '元', isRatio: false },
  { key: 'damage_cost', label: '运损', unit: '元', isRatio: true, benchmark: 0.028, benchmarkLabel: '2.8%' },
  { key: 'install_fee', label: '安装费', unit: '元', isRatio: false },
  { key: 'repair_fee', label: '维修扣费', unit: '元', isRatio: false, benchmark: 180, benchmarkLabel: '¥180/次' },
  { key: 'parts_fee_sold', label: '配件-售出', unit: '元', isRatio: false },
  { key: 'parts_fee_gift', label: '配件-赠品', unit: '元', isRatio: true, benchmark: 0.12, benchmarkLabel: '12%' },
  { key: 'parts_fee_warranty', label: '配件-质保', unit: '元', isRatio: false },
  { key: 'after_sales_fee', label: '售后费', unit: '元', isRatio: true, benchmark: 0.045, benchmarkLabel: '4.5%' },
  { key: 'warranty_shipping', label: '质保运费', unit: '元', isRatio: false },
  { key: 'ad_spend', label: '广告费', unit: '元', isRatio: false },
  { key: 'warehouse_fee', label: '仓储费', unit: '元', isRatio: false },
  { key: 'refund_amount', label: '退款额', unit: '元', isRatio: false },
];

export default function CostControlPage() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [costData, setCostData] = useState<Record<string, number>>({});
  const [revenue, setRevenue] = useState(0);
  const [partsTotal, setPartsTotal] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const [year, month] = selectedMonth.split('-').map(Number);
        const start = startOfMonth(new Date(year, month - 1));
        const end = endOfMonth(new Date(year, month - 1));

        const { data, error: fetchError } = await supabase
          .from('finance_daily')
          .select('*')
          .gte('date', format(start, 'yyyy-MM-dd'))
          .lte('date', format(end, 'yyyy-MM-dd'));

        if (fetchError) throw fetchError;

        const totals: Record<string, number> = {
          commission: 0,
          platform_payout: 0,
          shipping_fee: 0,
          insurance_fee: 0,
          damage_cost: 0,
          install_fee: 0,
          repair_fee: 0,
          parts_fee_sold: 0,
          parts_fee_gift: 0,
          parts_fee_warranty: 0,
          after_sales_fee: 0,
          warranty_shipping: 0,
          ad_spend: 0,
          warehouse_fee: 0,
          refund_amount: 0,
        };

        let totalRevenue = 0;
        let totalParts = 0;

        (data as any[]).forEach(item => {
          totalRevenue += item.revenue || 0;
          totals.commission += item.commission || 0;
          totals.platform_payout += item.platform_payout || 0;
          totals.shipping_fee += item.shipping_fee || 0;
          totals.insurance_fee += item.insurance_fee || 0;
          totals.damage_cost += item.damage_cost || 0;
          totals.install_fee += item.install_fee || 0;
          totals.repair_fee += item.repair_fee || 0;
          totals.parts_fee_sold += item.parts_fee_sold || 0;
          totals.parts_fee_gift += item.parts_fee_gift || 0;
          totals.parts_fee_warranty += item.parts_fee_warranty || 0;
          totals.after_sales_fee += item.after_sales_fee || 0;
          totals.warranty_shipping += item.warranty_shipping || 0;
          totals.ad_spend += item.ad_spend || 0;
          totals.warehouse_fee += item.warehouse_fee || 0;
          totals.refund_amount += item.refund_amount || 0;
        });

        totalParts = totals.parts_fee_sold + totals.parts_fee_gift + totals.parts_fee_warranty;

        setCostData(totals);
        setRevenue(totalRevenue);
        setPartsTotal(totalParts);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取数据失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth]);

  const checkWarning = (item: typeof costItems[0], value: number): { warning: boolean; ratio?: number; exceeded?: number } => {
    if (!item.benchmark) return { warning: false };

    if (item.key === 'damage_cost') {
      const ratio = revenue > 0 ? value / revenue : 0;
      const exceeded = (ratio - item.benchmark) * 100;
      return { warning: ratio > item.benchmark, ratio, exceeded };
    }

    if (item.key === 'parts_fee_gift') {
      const ratio = partsTotal > 0 ? value / partsTotal : 0;
      const exceeded = (ratio - item.benchmark) * 100;
      return { warning: ratio > item.benchmark, ratio, exceeded };
    }

    if (item.key === 'after_sales_fee') {
      const ratio = revenue > 0 ? value / revenue : 0;
      const exceeded = (ratio - item.benchmark) * 100;
      return { warning: ratio > item.benchmark, ratio, exceeded };
    }

    if (item.key === 'repair_fee') {
      return { warning: value > item.benchmark };
    }

    return { warning: false };
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">成本管控</h1>
            <p className="text-slate-500 text-sm mt-1">15项成本科目 + 行业对标线 + 预警监控</p>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-slate-500 text-sm">当期收入</p>
                <p className="text-xl font-bold text-green-600 mt-1">¥{revenue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-slate-500 text-sm">总成本</p>
                <p className="text-xl font-bold text-red-500 mt-1">¥{Object.values(costData).reduce((a, b) => a + b, 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-slate-500 text-sm">运损率</p>
                <p className={`text-xl font-bold mt-1 ${(costData.damage_cost / revenue * 100) > 2.8 ? 'text-red-500' : 'text-green-600'}`}>
                  {(costData.damage_cost / revenue * 100).toFixed(2)}%
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-slate-500 text-sm">售后费率</p>
                <p className={`text-xl font-bold mt-1 ${(costData.after_sales_fee / revenue * 100) > 4.5 ? 'text-red-500' : 'text-green-600'}`}>
                  {(costData.after_sales_fee / revenue * 100).toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">成本科目</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">当期值</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">行业对标</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">实际占比</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {costItems.map((item) => {
                      const value = costData[item.key] || 0;
                      const { warning, ratio, exceeded } = checkWarning(item, value);
                      const actualRatio = item.key === 'damage_cost' || item.key === 'after_sales_fee'
                        ? (ratio || 0) * 100
                        : item.key === 'parts_fee_gift'
                        ? (ratio || 0) * 100
                        : null;

                      return (
                        <tr key={item.key} className={warning ? 'bg-red-50' : 'hover:bg-slate-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {warning && (
                                <svg className="w-5 h-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              )}
                              <span className={`font-medium ${warning ? 'text-red-700' : 'text-slate-800'}`}>{item.label}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className={`font-semibold ${warning ? 'text-red-600' : 'text-slate-800'}`}>
                              ¥{value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-slate-600">
                            {item.benchmarkLabel || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {actualRatio !== null ? (
                              <span className={`font-medium ${warning ? 'text-red-600' : 'text-slate-600'}`}>
                                {actualRatio.toFixed(2)}%
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {warning ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                超预警 {exceeded ? `+${exceeded.toFixed(2)}%` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                正常
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">行业对标参考线说明</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 运损率：参考值 2.8%（占营收比例），超过则预警</li>
                <li>• 配件赠品率：参考值 12%（占配件总额比例），超过则预警</li>
                <li>• 售后费率：参考值 4.5%（占营收比例），超过则预警</li>
                <li>• 维修扣费：参考值 ¥180/次，单次超过则预警</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}