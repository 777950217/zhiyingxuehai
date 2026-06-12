import { authGuard } from '@/lib/auth/authGuard';
import { getSupabaseServer } from '@/lib/supabase/server';

interface Refund {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  within_7_days: boolean;
  no_workorder: boolean;
  no_data_import: boolean;
  no_ai_usage: boolean;
  reason: string;
}

interface RefundEligibility {
  cond1: boolean;
  cond2: boolean;
  cond3: boolean;
  cond4: boolean;
  allMet: boolean;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'bg-gray-100 text-gray-600' },
  approved: { label: '已批准', color: 'bg-green-100 text-green-600' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-600' },
  processing: { label: '退款中', color: 'bg-[#D4A574] text-white' },
};

const conditionLabels = [
  { key: 'cond1', label: '7天内未使用', sql: "SELECT last_active_at FROM users WHERE id = 'user_id'" },
  { key: 'cond2', label: '未创建工单', sql: "SELECT id FROM work_orders WHERE user_id = 'user_id' AND created_at >= '7天前'" },
  { key: 'cond3', label: '未导入数据', sql: "SELECT id FROM financeImportLog WHERE user_id = 'user_id' AND created_at >= '7天前'" },
  { key: 'cond4', label: '未使用AI', sql: "SELECT id FROM ai_usage_log WHERE user_id = 'user_id' AND created_at >= '7天前'" },
];

async function checkRefundEligibility(userId: string, supabase: any): Promise<RefundEligibility> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  let cond1 = false;
  try {
    const { data: user } = await supabase.from('users')
      .select('last_active_at').eq('id', userId).single();
    cond1 = !user?.last_active_at || new Date(user.last_active_at) < sevenDaysAgo;
  } catch { cond1 = true; }
  
  let cond2 = false;
  try {
    const { data } = await supabase.from('work_orders')
      .select('id').eq('user_id', userId).gte('created_at', sevenDaysAgo.toISOString());
    cond2 = !data || data.length === 0;
  } catch { cond2 = true; }
  
  let cond3 = false;
  try {
    const { data } = await supabase.from('financeImportLog')
      .select('id').eq('user_id', userId).gte('created_at', sevenDaysAgo.toISOString());
    cond3 = !data || data.length === 0;
  } catch { cond3 = true; }
  
  let cond4 = false;
  try {
    const { data } = await supabase.from('ai_usage_log')
      .select('id').eq('user_id', userId).gte('created_at', sevenDaysAgo.toISOString());
    cond4 = !data || data.length === 0;
  } catch { cond4 = true; }
  
  return { cond1, cond2, cond3, cond4, allMet: cond1 && cond2 && cond3 && cond4 };
}

export default async function RefundsPage() {
  await authGuard('finance_refund');
  
  const supabase = getSupabaseServer();
  const { data: refunds, error } = await supabase.from('refunds').select('*').order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">获取数据失败: {error.message}</p>
        </div>
      </div>
    );
  }

  const refundData = refunds || [];
  const eligibilityMap: Record<string, RefundEligibility> = {};
  
  for (const item of refundData) {
    if (item.status === 'pending') {
      eligibilityMap[item.id] = await checkRefundEligibility(item.user_id, supabase);
    }
  }

  const getEligibility = (item: Refund) => {
    const eligibility = eligibilityMap[item.id];
    if (eligibility) {
      return [
        { label: conditionLabels[0].label, value: eligibility.cond1 },
        { label: conditionLabels[1].label, value: eligibility.cond2 },
        { label: conditionLabels[2].label, value: eligibility.cond3 },
        { label: conditionLabels[3].label, value: eligibility.cond4 },
      ];
    }
    return [
      { label: conditionLabels[0].label, value: item.within_7_days },
      { label: conditionLabels[1].label, value: item.no_workorder },
      { label: conditionLabels[2].label, value: item.no_data_import },
      { label: conditionLabels[3].label, value: item.no_ai_usage },
    ];
  };

  const isEligible = (item: Refund) => {
    const eligibility = eligibilityMap[item.id];
    return eligibility?.allMet ?? (item.within_7_days && item.no_workorder && item.no_data_import && item.no_ai_usage);
  };

  const pendingCount = refundData.filter(item => item.status === 'pending').length;
  const eligibleCount = refundData.filter(item => item.status === 'pending' && isEligible(item)).length;

  return (
    <div className="min-h-screen bg-white">
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <nav className="text-sm text-gray-500 mb-2">
              <span className="hover:text-[#0F2A4A] cursor-pointer">财务中心</span>
              <span className="mx-2">/</span>
              <span className="text-[#0F2A4A] font-medium">退款处理</span>
            </nav>
            <h1 className="text-2xl font-bold text-[#0F2A4A]">退款处理</h1>
          </div>
          <button
            onClick={() => {
              const headers = ['用户ID', '用户名称', '金额', '申请时间', '状态', '7天内', '无工单', '无数据导入', '无AI使用', '退款原因'];
              const csvContent = [
                headers.join(','),
                ...refundData.map(item => {
                  const eligibility = eligibilityMap[item.id];
                  return [
                    item.user_id,
                    item.user_name,
                    item.amount,
                    item.created_at,
                    statusConfig[item.status].label,
                    eligibility?.cond1 ?? item.within_7_days ? '是' : '否',
                    eligibility?.cond2 ?? item.no_workorder ? '是' : '否',
                    eligibility?.cond3 ?? item.no_data_import ? '是' : '否',
                    eligibility?.cond4 ?? item.no_ai_usage ? '是' : '否',
                    `"${item.reason}"`
                  ].join(',');
                })
              ].join('\n');
              const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `退款申请_${new Date().toLocaleDateString('zh-CN')}.csv`;
              link.click();
            }}
            className="px-4 py-2 bg-[#0F2A4A] text-white rounded-lg hover:bg-opacity-90 transition"
          >
            导出 CSV
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">待审核申请</p>
            <p className="text-xl font-bold text-[#0F2A4A]">{pendingCount} 笔</p>
          </div>
          <div className="bg-[#D4A574] bg-opacity-10 rounded-lg p-4">
            <p className="text-sm text-gray-500">符合退款条件</p>
            <p className="text-xl font-bold text-[#D4A574]">{eligibleCount} 笔</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-yellow-800 mb-2">退款条件（全部满足）</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            {conditionLabels.map((cond, idx) => (
              <span key={idx} className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                {cond.label}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-800 mb-2">SQL 查询逻辑</h3>
          <div className="space-y-2 text-xs text-blue-700 font-mono">
            {conditionLabels.map((cond, idx) => (
              <div key={idx} className="bg-blue-100 p-2 rounded">
                <span className="font-bold">条件{idx + 1}:</span> {cond.sql}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0F2A4A] text-white">
              <tr>
                <th className="px-4 py-3 text-left font-medium">用户</th>
                <th className="px-4 py-3 text-right font-medium">金额</th>
                <th className="px-4 py-3 text-center font-medium">条件校验</th>
                <th className="px-4 py-3 text-center font-medium">状态</th>
                <th className="px-4 py-3 text-left font-medium">原因</th>
                <th className="px-4 py-3 text-center font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {refundData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                refundData.map((item) => {
                  const eligible = isEligible(item);
                  
                  return (
                    <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#0F2A4A]">{item.user_name}</p>
                        <p className="text-xs text-gray-500">{item.user_id}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-lg font-semibold">¥{item.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {getEligibility(item).map((cond, idx) => (
                            <span
                              key={idx}
                              className={`inline-block px-2 py-0.5 rounded text-xs ${cond.value ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                            >
                              {cond.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusConfig[item.status].color}`}>
                          {statusConfig[item.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-sm text-gray-600 truncate" title={item.reason}>
                          {item.reason}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.status === 'pending' && eligible ? (
                          <form action="/api/refunds/approve" method="POST">
                            <input type="hidden" name="refundId" value={item.id} />
                            <button
                              type="submit"
                              className="px-3 py-1.5 bg-[#D4A574] text-white rounded-lg text-sm hover:bg-opacity-90 transition"
                            >
                              批准退款
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-gray-400">{item.status === 'pending' ? '条件未满足' : '-'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
