import { authGuard } from '@/lib/auth/authGuard';
import { getSupabaseServer } from '@/lib/supabase/server';

interface Payable {
  id: string;
  supplier_name: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'overdue' | 'paid';
  invoice_no: string;
  payment_method: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '待付', color: 'bg-gray-100 text-gray-600' },
  overdue: { label: '逾期', color: 'bg-red-100 text-red-600' },
  paid: { label: '已结', color: 'bg-green-100 text-green-600' },
};

const paymentMethodConfig: Record<string, string> = {
  bank: '银行转账',
  alipay: '支付宝',
  wechat: '微信',
  cash: '现金',
  other: '其他',
};

export default async function PayablesPage() {
  await authGuard('finance_view');
  
  const supabase = getSupabaseServer();
  const { data, error } = await supabase.from('payables').select('*').order('due_date', { ascending: true });

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">获取数据失败: {error.message}</p>
        </div>
      </div>
    );
  }

  const payables = data || [];
  const pendingTotal = payables.filter(item => item.status !== 'paid').reduce((sum, item) => sum + item.amount, 0);
  const overdueTotal = payables.filter(item => item.status === 'overdue').reduce((sum, item) => sum + item.amount, 0);

  const formatDaysUntilDue = (dueDate: string) => {
    const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue < 0 ? `逾期 ${Math.abs(daysUntilDue)} 天` : daysUntilDue === 0 ? '今日到期' : `${daysUntilDue} 天后到期`;
  };

  const formatPaymentMethod = (method: string | null) => {
    return method ? paymentMethodConfig[method] || method : '-';
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <nav className="text-sm text-gray-500 mb-2">
              <span className="hover:text-[#0F2A4A] cursor-pointer">财务中心</span>
              <span className="mx-2">/</span>
              <span className="text-[#0F2A4A] font-medium">应付账款</span>
            </nav>
            <h1 className="text-2xl font-bold text-[#0F2A4A]">应付账款</h1>
          </div>
          <button
            onClick={() => {
              const headers = ['供应商名称', '金额', '到期日期', '状态', '发票号', '付款方式'];
              const csvContent = [
                headers.join(','),
                ...payables.map(item => [
                  item.supplier_name, item.amount, item.due_date, statusConfig[item.status].label, item.invoice_no, formatPaymentMethod(item.payment_method)
                ].join(','))
              ].join('\n');
              const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `应付账款_${new Date().toLocaleDateString('zh-CN')}.csv`;
              link.click();
            }}
            className="px-4 py-2 bg-[#0F2A4A] text-white rounded-lg hover:bg-opacity-90 transition"
          >
            导出 CSV
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">待付总额</p>
            <p className="text-xl font-bold text-[#0F2A4A]">¥{pendingTotal.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">逾期总额</p>
            <p className="text-xl font-bold text-red-600">¥{overdueTotal.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0F2A4A] text-white">
              <tr>
                <th className="px-4 py-3 text-left font-medium">供应商名称</th>
                <th className="px-4 py-3 text-right font-medium">金额</th>
                <th className="px-4 py-3 text-center font-medium">账期</th>
                <th className="px-4 py-3 text-center font-medium">状态</th>
                <th className="px-4 py-3 text-center font-medium">付款方式</th>
                <th className="px-4 py-3 text-right font-medium">发票号</th>
              </tr>
            </thead>
            <tbody>
              {payables.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                payables.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-[#0F2A4A]">{item.supplier_name}</td>
                    <td className="px-4 py-3 text-right text-lg font-semibold">¥{item.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-500">{formatDaysUntilDue(item.due_date)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusConfig[item.status].color}`}>
                        {statusConfig[item.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{formatPaymentMethod(item.payment_method)}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">{item.invoice_no}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
