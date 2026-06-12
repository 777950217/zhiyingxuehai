'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as ExcelJS from 'exceljs';

interface MonthlyData {
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
}

export default function MonthlyClosePage() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profitData, setProfitData] = useState<MonthlyData[]>([]);

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
        
        setProfitData(data as MonthlyData[]);
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

  const calculateTotals = () => {
    return {
      revenue: profitData.reduce((sum, item) => sum + item.revenue, 0),
      refund_amount: profitData.reduce((sum, item) => sum + item.refund_amount, 0),
      commission: profitData.reduce((sum, item) => sum + item.commission, 0),
      platform_payout: profitData.reduce((sum, item) => sum + item.platform_payout, 0),
      shipping_fee: profitData.reduce((sum, item) => sum + item.shipping_fee, 0),
      insurance_fee: profitData.reduce((sum, item) => sum + item.insurance_fee, 0),
      damage_cost: profitData.reduce((sum, item) => sum + item.damage_cost, 0),
      install_fee: profitData.reduce((sum, item) => sum + item.install_fee, 0),
      repair_fee: profitData.reduce((sum, item) => sum + item.repair_fee, 0),
      parts_fee_sold: profitData.reduce((sum, item) => sum + item.parts_fee_sold, 0),
      parts_fee_gift: profitData.reduce((sum, item) => sum + item.parts_fee_gift, 0),
      parts_fee_warranty: profitData.reduce((sum, item) => sum + item.parts_fee_warranty, 0),
      after_sales_fee: profitData.reduce((sum, item) => sum + item.after_sales_fee, 0),
      warranty_shipping: profitData.reduce((sum, item) => sum + item.warranty_shipping, 0),
      ad_spend: profitData.reduce((sum, item) => sum + item.ad_spend, 0),
      warehouse_fee: profitData.reduce((sum, item) => sum + item.warehouse_fee, 0),
    };
  };

  const totals = calculateTotals();
  const totalCost = 
    totals.commission + totals.platform_payout + totals.shipping_fee + totals.insurance_fee +
    totals.damage_cost + totals.install_fee + totals.repair_fee + totals.parts_fee_sold +
    totals.parts_fee_gift + totals.parts_fee_warranty + totals.after_sales_fee + totals.warranty_shipping +
    totals.ad_spend + totals.warehouse_fee;
  const netProfit = totals.revenue - totals.refund_amount - totalCost;

  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '职盈学海';
    workbook.lastModifiedBy = '系统';
    workbook.created = new Date();
    workbook.modified = new Date();

    const profitSheet = workbook.addWorksheet('利润表');
    const balanceSheet = workbook.addWorksheet('资产负债表');

    profitSheet.columns = [
      { header: '项目', key: 'item', width: 30 },
      { header: '金额', key: 'amount', width: 20 },
    ];

    profitSheet.addRow({ item: '一、营业收入', amount: totals.revenue });
    profitSheet.addRow({ item: '减：退款', amount: -totals.refund_amount });
    profitSheet.addRow({ item: '二、营业成本', amount: 0 });
    profitSheet.addRow({ item: '佣金', amount: -totals.commission });
    profitSheet.addRow({ item: '平台抽成', amount: -totals.platform_payout });
    profitSheet.addRow({ item: '运费', amount: -totals.shipping_fee });
    profitSheet.addRow({ item: '运费险', amount: -totals.insurance_fee });
    profitSheet.addRow({ item: '运损', amount: -totals.damage_cost });
    profitSheet.addRow({ item: '安装费', amount: -totals.install_fee });
    profitSheet.addRow({ item: '维修扣费', amount: -totals.repair_fee });
    profitSheet.addRow({ item: '配件-售出', amount: -totals.parts_fee_sold });
    profitSheet.addRow({ item: '配件-赠品', amount: -totals.parts_fee_gift });
    profitSheet.addRow({ item: '配件-质保', amount: -totals.parts_fee_warranty });
    profitSheet.addRow({ item: '售后费', amount: -totals.after_sales_fee });
    profitSheet.addRow({ item: '质保运费', amount: -totals.warranty_shipping });
    profitSheet.addRow({ item: '广告费', amount: -totals.ad_spend });
    profitSheet.addRow({ item: '仓储费', amount: -totals.warehouse_fee });
    profitSheet.addRow({ item: '', amount: 0 });
    profitSheet.addRow({ item: '三、净利润', amount: netProfit });

    balanceSheet.columns = [
      { header: '项目', key: 'item', width: 30 },
      { header: '金额', key: 'amount', width: 20 },
    ];

    balanceSheet.addRow({ item: '资产', amount: 0 });
    balanceSheet.addRow({ item: '流动资产', amount: totals.revenue });
    balanceSheet.addRow({ item: '其他资产', amount: 0 });
    balanceSheet.addRow({ item: '', amount: 0 });
    balanceSheet.addRow({ item: '资产总计', amount: totals.revenue });
    balanceSheet.addRow({ item: '', amount: 0 });
    balanceSheet.addRow({ item: '负债', amount: 0 });
    balanceSheet.addRow({ item: '应付账款', amount: totalCost });
    balanceSheet.addRow({ item: '', amount: 0 });
    balanceSheet.addRow({ item: '负债总计', amount: totalCost });
    balanceSheet.addRow({ item: '', amount: 0 });
    balanceSheet.addRow({ item: '所有者权益', amount: 0 });
    balanceSheet.addRow({ item: '净利润', amount: netProfit });
    balanceSheet.addRow({ item: '', amount: 0 });
    balanceSheet.addRow({ item: '权益总计', amount: netProfit });
    balanceSheet.addRow({ item: '', amount: 0 });
    balanceSheet.addRow({ item: '负债及权益总计', amount: totalCost + netProfit });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `月度结账报表_${selectedMonth}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">月度结账</h1>
            <p className="text-slate-500 text-sm mt-1">资产负债表 + 利润表</p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              导出 Excel
            </button>
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
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">利润表</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">一、营业收入</span>
                  <span className="font-semibold text-green-600">¥{totals.revenue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">减：退款</span>
                  <span className="font-semibold text-red-500">-¥{totals.refund_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">二、营业成本</span>
                  <span className="font-semibold">-¥{totalCost.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="ml-4 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">佣金</span>
                    <span className="text-slate-600">-¥{totals.commission.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">平台抽成</span>
                    <span className="text-slate-600">-¥{totals.platform_payout.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">运费</span>
                    <span className="text-slate-600">-¥{totals.shipping_fee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">广告费</span>
                    <span className="text-slate-600">-¥{totals.ad_spend.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">其他成本</span>
                    <span className="text-slate-600">-¥{(totalCost - totals.commission - totals.platform_payout - totals.shipping_fee - totals.ad_spend).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3 border-t-2 border-slate-300 mt-4">
                  <span className="text-lg font-bold text-slate-800">三、净利润</span>
                  <span className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {netProfit >= 0 ? '¥' : '-¥'}{Math.abs(netProfit).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">资产负债表</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">资产</span>
                  <span></span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-600 ml-4">流动资产</span>
                  <span className="font-semibold">¥{totals.revenue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 ml-4">其他资产</span>
                  <span className="font-semibold">¥0.00</span>
                </div>
                <div className="flex justify-between items-center py-3 border-t border-slate-200">
                  <span className="font-bold text-slate-800">资产总计</span>
                  <span className="font-bold">¥{totals.revenue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100 mt-4">
                  <span className="font-semibold text-slate-700">负债</span>
                  <span></span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 ml-4">应付账款</span>
                  <span className="font-semibold">¥{totalCost.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-t border-slate-200">
                  <span className="font-bold text-slate-800">负债总计</span>
                  <span className="font-bold">¥{totalCost.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100 mt-4">
                  <span className="font-semibold text-slate-700">所有者权益</span>
                  <span></span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 ml-4">净利润</span>
                  <span className={`font-semibold ${netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {netProfit >= 0 ? '¥' : '-¥'}{Math.abs(netProfit).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-t border-slate-200">
                  <span className="font-bold text-slate-800">权益总计</span>
                  <span className={`font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {netProfit >= 0 ? '¥' : '-¥'}{Math.abs(netProfit).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-t-2 border-slate-300 mt-4">
                  <span className="font-bold text-slate-800">负债及权益总计</span>
                  <span className="font-bold">¥{(totalCost + netProfit).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}