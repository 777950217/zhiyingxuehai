'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface Receivable {
  id: string;
  customer_name: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'overdue' | 'paid';
  invoice_no: string;
  payment_method: string;
  created_at: string;
}

interface Payable {
  id: string;
  supplier_name: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'overdue' | 'paid';
  invoice_no: string;
  payment_method: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '待收', color: 'bg-gray-100 text-gray-600' },
  overdue: { label: '逾期', color: 'bg-red-100 text-red-600' },
  paid: { label: '已结', color: 'bg-green-100 text-green-600' },
};

const paymentMethods = [
  { value: '', label: '全部' },
  { value: 'bank', label: '银行转账' },
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信' },
  { value: 'cash', label: '现金' },
  { value: 'other', label: '其他' },
];

const formatPaymentMethod = (method: string) => {
  const map: Record<string, string> = {
    bank: '银行转账',
    alipay: '支付宝',
    wechat: '微信',
    cash: '现金',
    other: '其他',
  };
  return map[method] || method || '-';
};

const isOverdue = (dueDate: string) => {
  const due = new Date(dueDate);
  const today = new Date();
  const diffDays = Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 3;
};

export default function ReceivablesPage() {
  const [activeTab, setActiveTab] = useState<'receivable' | 'payable'>('receivable');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  
  const [filters, setFilters] = useState({
    keyword: '',
    paymentMethod: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: receivablesData, error: receivablesError } = await supabase
          .from('receivables')
          .select('*')
          .order('due_date', { ascending: true });

        if (receivablesError) throw receivablesError;
        setReceivables(receivablesData as Receivable[]);

        const { data: payablesData, error: payablesError } = await supabase
          .from('payables')
          .select('*')
          .order('due_date', { ascending: true });

        if (payablesError) throw payablesError;
        setPayables(payablesData as Payable[]);

        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取数据失败');
        setReceivables([
          { id: '1', customer_name: '北京科技有限公司', amount: 15000, due_date: '2026-06-15', status: 'pending', invoice_no: 'INV-2026-001', payment_method: 'bank', created_at: '2026-06-10' },
          { id: '2', customer_name: '上海贸易公司', amount: 28000, due_date: '2026-06-08', status: 'overdue', invoice_no: 'INV-2026-002', payment_method: 'alipay', created_at: '2026-06-01' },
          { id: '3', customer_name: '广州制造厂', amount: 12000, due_date: '2026-06-20', status: 'pending', invoice_no: 'INV-2026-003', payment_method: 'wechat', created_at: '2026-06-11' },
          { id: '4', customer_name: '深圳电子厂', amount: 35000, due_date: '2026-06-05', status: 'overdue', invoice_no: 'INV-2026-004', payment_method: 'cash', created_at: '2026-05-28' },
        ]);
        setPayables([
          { id: '1', supplier_name: '配件供应商A', amount: 8000, due_date: '2026-06-18', status: 'pending', invoice_no: 'PO-2026-001', payment_method: 'bank', created_at: '2026-06-10' },
          { id: '2', supplier_name: '物流服务商B', amount: 5000, due_date: '2026-06-12', status: 'overdue', invoice_no: 'PO-2026-002', payment_method: 'wechat', created_at: '2026-06-05' },
          { id: '3', supplier_name: '原材料厂家C', amount: 22000, due_date: '2026-06-25', status: 'pending', invoice_no: 'PO-2026-003', payment_method: 'alipay', created_at: '2026-06-12' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredReceivables = receivables.filter(item => {
    const matchesKeyword = !filters.keyword || 
      item.customer_name.toLowerCase().includes(filters.keyword.toLowerCase());
    const matchesPayment = !filters.paymentMethod || item.payment_method === filters.paymentMethod;
    const matchesDate = (!filters.startDate || item.due_date >= filters.startDate) &&
      (!filters.endDate || item.due_date <= filters.endDate);
    return matchesKeyword && matchesPayment && matchesDate;
  });

  const filteredPayables = payables.filter(item => {
    const matchesKeyword = !filters.keyword || 
      item.supplier_name.toLowerCase().includes(filters.keyword.toLowerCase());
    const matchesPayment = !filters.paymentMethod || item.payment_method === filters.paymentMethod;
    const matchesDate = (!filters.startDate || item.due_date >= filters.startDate) &&
      (!filters.endDate || item.due_date <= filters.endDate);
    return matchesKeyword && matchesPayment && matchesDate;
  });

  const pendingTotal = (activeTab === 'receivable' ? filteredReceivables : filteredPayables)
    .filter(item => item.status !== 'paid')
    .reduce((sum, item) => sum + item.amount, 0);

  const overdueTotal = (activeTab === 'receivable' ? filteredReceivables : filteredPayables)
    .filter(item => item.status === 'overdue')
    .reduce((sum, item) => sum + item.amount, 0);

  const formatDaysUntilDue = (dueDate: string) => {
    const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue < 0 ? `逾期 ${Math.abs(daysUntilDue)} 天` : daysUntilDue === 0 ? '今日到期' : `${daysUntilDue} 天后到期`;
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">应收应付</h1>
            <p className="text-slate-500 text-sm mt-1">应收账款与应付账款管理</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('receivable')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'receivable'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            应收账款
          </button>
          <button
            onClick={() => setActiveTab('payable')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'payable'
                ? 'bg-green-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            应付账款
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {activeTab === 'receivable' ? '客户名称' : '供应商名称'}
              </label>
              <input
                type="text"
                placeholder={`搜索${activeTab === 'receivable' ? '客户' : '供应商'}...`}
                value={filters.keyword}
                onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="min-w-[150px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">付款方式</label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {paymentMethods.map(method => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[120px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">开始日期</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="min-w-[120px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">结束日期</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-500">{activeTab === 'receivable' ? '待收' : '待付'}总额</p>
            <p className="text-xl font-bold text-slate-800">¥{pendingTotal.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-500">逾期总额</p>
            <p className="text-xl font-bold text-red-600">¥{overdueTotal.toLocaleString()}</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-500">加载中...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    {activeTab === 'receivable' ? '客户名称' : '供应商名称'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">金额</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">到期日期</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">账期</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">付款方式</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">发票号</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(activeTab === 'receivable' ? filteredReceivables : filteredPayables).map((item) => {
                  const isItemOverdue = isOverdue(item.due_date);
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 ${isItemOverdue ? 'bg-red-50' : ''}`}>
                      <td className={`px-6 py-4 font-medium ${isItemOverdue ? 'text-red-700' : 'text-slate-800'}`}>
                        {activeTab === 'receivable' ? (item as Receivable).customer_name : (item as Payable).supplier_name}
                      </td>
                      <td className={`px-6 py-4 text-right text-lg font-semibold ${isItemOverdue ? 'text-red-600' : 'text-slate-800'}`}>
                        ¥{item.amount.toLocaleString()}
                      </td>
                      <td className={`px-6 py-4 text-center ${isItemOverdue ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
                        {item.due_date}
                        {isItemOverdue && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            逾期
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-500">{formatDaysUntilDue(item.due_date)}</td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600">
                        {formatPaymentMethod(item.payment_method)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[item.status].color}`}>
                          {statusConfig[item.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-500">{item.invoice_no}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}