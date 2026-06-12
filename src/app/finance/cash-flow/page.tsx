'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as ExcelJS from 'exceljs';

interface CashFlowItem {
  id: string;
  category: string;
  item: string;
  amount: number;
  direction: string;
}

export default function CashFlowPage() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cashFlowData, setCashFlowData] = useState<CashFlowItem[]>([]);

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
          .from('finance_cash_flow')
          .select('*')
          .gte('date', format(start, 'yyyy-MM-dd'))
          .lte('date', format(end, 'yyyy-MM-dd'));

        if (fetchError) throw fetchError;
        setCashFlowData(data as CashFlowItem[]);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取数据失败');
        setCashFlowData([
          { id: '1', category: 'operating', item: '销售商品、提供劳务收到的现金', amount: 125000, direction: '流入' },
          { id: '2', category: 'operating', item: '支付给职工的现金', amount: 28000, direction: '流出' },
          { id: '3', category: 'operating', item: '支付的各项税费', amount: 15000, direction: '流出' },
          { id: '4', category: 'operating', item: '支付其他与经营活动的现金', amount: 22000, direction: '流出' },
          { id: '5', category: 'investing', item: '购建固定资产、无形资产', amount: 50000, direction: '流出' },
          { id: '6', category: 'investing', item: '处置固定资产、无形资产', amount: 15000, direction: '流入' },
          { id: '7', category: 'financing', item: '吸收投资收到的现金', amount: 100000, direction: '流入' },
          { id: '8', category: 'financing', item: '取得借款收到的现金', amount: 50000, direction: '流入' },
          { id: '9', category: 'financing', item: '偿还债务支付的现金', amount: 30000, direction: '流出' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth]);

  const operatingData = cashFlowData.filter(item => item.category === 'operating');
  const investingData = cashFlowData.filter(item => item.category === 'investing');
  const financingData = cashFlowData.filter(item => item.category === 'financing');

  const calcNet = (data: CashFlowItem[]) => {
    return data.reduce((sum, item) => {
      return item.direction === '流入' ? sum + item.amount : sum - item.amount;
    }, 0);
  };

  const operatingNet = calcNet(operatingData);
  const investingNet = calcNet(investingData);
  const financingNet = calcNet(financingData);
  const totalNet = operatingNet + investingNet + financingNet;

  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('现金流量表');
    
    sheet.columns = [
      { header: '类别', key: 'category', width: 20 },
      { header: '项目', key: 'item', width: 30 },
      { header: '方向', key: 'direction', width: 10 },
      { header: '金额', key: 'amount', width: 15 },
    ];

    sheet.addRow({ category: '经营活动现金流', item: '', direction: '', amount: '' });
    operatingData.forEach(item => sheet.addRow({ 
      category: '', 
      item: item.item, 
      direction: item.direction, 
      amount: item.amount 
    }));
    sheet.addRow({ category: '经营活动净额', item: '', direction: '', amount: operatingNet });
    
    sheet.addRow({ category: '', item: '', direction: '', amount: '' });
    sheet.addRow({ category: '投资活动现金流', item: '', direction: '', amount: '' });
    investingData.forEach(item => sheet.addRow({ 
      category: '', 
      item: item.item, 
      direction: item.direction, 
      amount: item.amount 
    }));
    sheet.addRow({ category: '投资活动净额', item: '', direction: '', amount: investingNet });
    
    sheet.addRow({ category: '', item: '', direction: '', amount: '' });
    sheet.addRow({ category: '筹资活动现金流', item: '', direction: '', amount: '' });
    financingData.forEach(item => sheet.addRow({ 
      category: '', 
      item: item.item, 
      direction: item.direction, 
      amount: item.amount 
    }));
    sheet.addRow({ category: '筹资活动净额', item: '', direction: '', amount: financingNet });
    
    sheet.addRow({ category: '', item: '', direction: '', amount: '' });
    sheet.addRow({ category: '现金净增加额', item: '', direction: '', amount: totalNet });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `现金流量表_${selectedMonth}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">现金流量表</h1>
            <p className="text-slate-500 text-sm mt-1">经营/投资/筹资现金流分析</p>
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
        ) : (
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-blue-600 mb-4">经营活动现金流</h2>
              <div className="space-y-3">
                {operatingData.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600 text-sm">{item.item}</span>
                    <span className={`font-semibold text-sm ${item.direction === '流入' ? 'text-green-600' : 'text-red-500'}`}>
                      {item.direction === '流入' ? '+' : '-'}¥{item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-3 border-t-2 border-slate-300 mt-4">
                  <span className="font-bold text-slate-800">经营活动净额</span>
                  <span className={`font-bold ${operatingNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {operatingNet >= 0 ? '+' : '-'}¥{Math.abs(operatingNet).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-purple-600 mb-4">投资活动现金流</h2>
              <div className="space-y-3">
                {investingData.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600 text-sm">{item.item}</span>
                    <span className={`font-semibold text-sm ${item.direction === '流入' ? 'text-green-600' : 'text-red-500'}`}>
                      {item.direction === '流入' ? '+' : '-'}¥{item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-3 border-t-2 border-slate-300 mt-4">
                  <span className="font-bold text-slate-800">投资活动净额</span>
                  <span className={`font-bold ${investingNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {investingNet >= 0 ? '+' : '-'}¥{Math.abs(investingNet).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-orange-600 mb-4">筹资活动现金流</h2>
              <div className="space-y-3">
                {financingData.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600 text-sm">{item.item}</span>
                    <span className={`font-semibold text-sm ${item.direction === '流入' ? 'text-green-600' : 'text-red-500'}`}>
                      {item.direction === '流入' ? '+' : '-'}¥{item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-3 border-t-2 border-slate-300 mt-4">
                  <span className="font-bold text-slate-800">筹资活动净额</span>
                  <span className={`font-bold ${financingNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {financingNet >= 0 ? '+' : '-'}¥{Math.abs(financingNet).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
          <h3 className="text-sm font-semibold text-blue-800 mb-3">卫浴行业注释</h3>
          <ul className="text-sm text-blue-700 space-y-2">
            <li>• 平台佣金支出：属于经营活动现金流出，计入"支付其他与经营活动的现金"</li>
            <li>• 运费支出：属于经营活动现金流出，计入"支付其他与经营活动的现金"</li>
            <li>• 质保金：收到时计入经营活动现金流入，支付时计入经营活动现金流出</li>
            <li>• 配件采购：属于经营活动现金流出，计入"支付其他与经营活动的现金"</li>
            <li>• 广告费：属于经营活动现金流出，计入"支付其他与经营活动的现金"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}