'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import KnowledgeExtractionContent from './knowledge-extraction/page';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users, CreditCard, FileText, BarChart3, Search, Tag,
  CheckCircle, XCircle, Plus, Eye, Ban, RefreshCw,
  ChevronDown, AlertTriangle, TrendingUp, DollarSign, UserCheck,
  BookOpen, Crown, Ticket, UserPlus, Calendar, Phone,
  Download, Wallet, Clock, Snowflake, Flame, Settings,
  LayoutDashboard, UserCog, Receipt, Gift, BookMarked, Zap,
  Copy, Check, Trash2, MessageSquare,
} from 'lucide-react';

type TabId = 'dashboard' | 'customers' | 'codes' | 'finance' | 'knowledge' | 'feedback';

interface UserRecord {
  id: string;
  email: string;
  display_name: string;
  role: string;
  user_type: string;
  company_id: string;
  company_name: string;
  company_plan: string;
  plan_end: string | null;
  status: string;
  last_login_at: string | null;
  created_at: string;
  phone?: string;
}

interface RedemptionCodeRecord {
  id: string;
  code: string;
  plan_type: string;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  status: string;
  created_at: string;
  created_by: string | null;
  expires_at: string | null;
  used_by_email?: string;
}

interface FinanceRecord {
  id: string;
  customer_name: string;
  customer_phone: string;
  plan: string;
  amount: number;
  payment_method: string;
  start_date: string | null;
  end_date: string | null;
  account_status: string;
  remark: string;
  created_at: string;
}

interface DashboardData {
  versionDistribution: { personal: number; efficiency: number; pro: number; flagship: number; total: number };
  todayNew: number;
  activeUsers: number;
  expiringCompanies: { id: string; name: string; plan: string; plan_end: string }[];
  completionRate: number;
  dailyNewUsers: Record<string, number>;
  monthlyRevenue: Record<string, number>;
  totalRevenue: number;
}

interface CodeStats {
  total: number;
  used: number;
  unused: number;
  frozen: number;
  usedRecords: RedemptionCodeRecord[];
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: '数据总览', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'customers', label: '客户管理', icon: <UserCog className="w-4 h-4" /> },
  { id: 'codes', label: '兑换码管�?, icon: <Gift className="w-4 h-4" /> },
  { id: 'finance', label: '财务记账', icon: <Receipt className="w-4 h-4" /> },
  { id: 'knowledge', label: '知识萃取', icon: <BookMarked className="w-4 h-4" /> },
  { id: 'feedback', label: '课程反馈', icon: <MessageSquare className="w-4 h-4" /> },
];

const PLAN_LABELS: Record<string, string> = {
  personal_user: '管理�?,
  efficiency_user: '效率�?,
  efficiency: '效率�?,
  enterprise_manager: '专业�?,
  enterprise_admin: '旗舰�?,
  admin: '超级管理�?,
  staff: '员工',
};

const PAYMENT_LABELS: Record<string, string> = {
  wechat: '微信',
  alipay: '支付�?,
  cash: '现金',
  other: '其他',
};

export default function AdminPage() {
  const { profile, authFetch } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [loading, setLoading] = useState(true);

  // Dashboard
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  // Customers
  const [customers, setCustomers] = useState<UserRecord[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'expiring' | 'expired'>('all');
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', displayName: '', phone: '', version: 'enterprise_manager', months: '12' });

  // Codes
  const [redemptionCodes, setRedemptionCodes] = useState<RedemptionCodeRecord[]>([]);
  const [codeStats, setCodeStats] = useState<CodeStats | null>(null);
  const [generateCount, setGenerateCount] = useState(10);
  const [generatePlan, setGeneratePlan] = useState('personal_user');
  const [codeExpireDays, setCodeExpireDays] = useState(365);
  const [codeFilter, setCodeFilter] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Finance
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);
  const [financeMonth, setFinanceMonth] = useState(new Date().toISOString().substring(0, 7));
  const [financeSummary, setFinanceSummary] = useState<Record<string, { income: number; count: number }>>({});
  const [showFinanceForm, setShowFinanceForm] = useState(false);
  const [financeForm, setFinanceForm] = useState({
    customerName: '', customerPhone: '', plan: 'personal_user',
    amount: '', paymentMethod: 'wechat', startDate: '', endDate: '', remark: '',
    accountStatus: 'active' as string,
  });

  // ─── Data loading ───
  const loadDashboard = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin?action=dashboard');
      const data = await res.json();
      setDashboard(data);
    } catch (e) {
      console.error('Dashboard load error:', e);
    }
  }, [authFetch]);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await authFetch(`/api/admin?action=customers&search=${encodeURIComponent(customerSearch)}&filter=${customerFilter}`);
      const data = await res.json();
      setCustomers(data.data || []);
    } catch (e) {
      console.error('Customers load error:', e);
    }
  }, [authFetch, customerSearch, customerFilter]);

  const loadCodes = useCallback(async () => {
    try {
      const [codesRes, statsRes] = await Promise.all([
        authFetch('/api/redemption-codes', { headers: { 'x-admin-id': profile?.id || '' } }),
        authFetch('/api/admin?action=code-stats'),
      ]);
      const codesData = await codesRes.json();
      const statsData = await statsRes.json();
      setRedemptionCodes(codesData.codes || []);
      setCodeStats(statsData);
    } catch (e) {
      console.error('Codes load error:', e);
    }
  }, [authFetch]);

  const loadFinance = useCallback(async () => {
    try {
      const res = await authFetch(`/api/admin?action=finance-records&month=${financeMonth}`);
      const data = await res.json();
      setFinanceRecords(data.data || []);
      setFinanceSummary(data.monthlySummary || {});
    } catch (e) {
      console.error('Finance load error:', e);
    }
  }, [authFetch, financeMonth]);

  // ─── Init ───
  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'admin') {
      router.replace('/');
      return;
    }
    setLoading(false);
    loadDashboard();
  }, [profile, router, loadDashboard]);

  useEffect(() => {
    if (loading) return;
    if (activeTab === 'customers') loadCustomers();
    if (activeTab === 'codes') loadCodes();
    if (activeTab === 'finance') loadFinance();
  }, [activeTab, loading, loadCustomers, loadCodes, loadFinance]);

  // ─── Actions ───
  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.displayName) {
      toast.error('请填写邮箱和姓名');
      return;
    }
    setCreatingUser(true);
    try {
      const res = await authFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.email,
          displayName: newUser.displayName,
          phone: newUser.phone,
          role: newUser.version,
          password: 'Zy@' + Math.random().toString(36).slice(2, 10),
          adminCreate: true,
          months: Number(newUser.months),
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('账号创建成功');
        setShowCreateUser(false);
        setNewUser({ email: '', displayName: '', phone: '', version: 'enterprise_manager', months: '12' });
        loadCustomers();
      }
    } catch {
      toast.error('创建失败');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleGenerateCodes = async () => {
    try {
      const res = await authFetch('/api/redemption-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': profile?.id || '' },
        body: JSON.stringify({ count: generateCount, planType: generatePlan, expiresInDays: codeExpireDays }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`已生�?${data.generated?.length || generateCount} 个兑换码`);
        loadCodes();
      }
    } catch {
      toast.error('生成失败');
    }
  };

  const handleFreezeCode = async (codeId: string) => {
    try {
      await authFetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'freeze-code', codeId }),
      });
      toast.success('已冻�?);
      loadCodes();
    } catch {
      toast.error('操作失败');
    }
  };

  const handleUnfreezeCode = async (codeId: string) => {
    try {
      await authFetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unfreeze-code', codeId }),
      });
      toast.success('已解�?);
      loadCodes();
    } catch {
      toast.error('操作失败');
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    try {
      await authFetch(`/api/redemption-codes/${codeId}`, {
        method: 'DELETE',
        headers: { 'x-admin-id': profile?.id || '' },
      });
      toast.success('已删�?);
      loadCodes();
    } catch {
      toast.error('删除失败');
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('已复�?);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  const filteredCodes = codeFilter === 'all'
    ? redemptionCodes
    : redemptionCodes.filter(c => c.plan_type === codeFilter);

  const handleDisableUser = async (userId: string) => {
    try {
      await authFetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable-user', userId }),
      });
      toast.success('已停�?);
      loadCustomers();
    } catch {
      toast.error('操作失败');
    }
  };

  const handleEnableUser = async (userId: string) => {
    try {
      await authFetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enable-user', userId }),
      });
      toast.success('已启�?);
      loadCustomers();
    } catch {
      toast.error('操作失败');
    }
  };

  const handleRenewUser = async (companyId: string, months: number) => {
    try {
      await authFetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renew-user', companyId, months }),
      });
      toast.success(`已订�?{months}个月`);
      loadCustomers();
    } catch {
      toast.error('订阅失败');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === profile?.id) { toast.error('不能删除自己'); return; }
    setDeleting(true);
    try {
      const res = await authFetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers: { 'x-admin-id': profile?.id || '' } });
      if (!res.ok) throw new Error();
      toast.success('用户已删�?);
      setDeleteTarget(null);
      loadCustomers();
    } catch { toast.error('删除失败'); }
    finally { setDeleting(false); }
  };

  const handleFinanceCreate = async () => {
    if (!financeForm.customerName || !financeForm.amount) {
      toast.error('请填写客户姓名和金额');
      return;
    }
    try {
      await authFetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finance-create', ...financeForm, operatorId: profile?.id }),
      });
      toast.success('记账成功');
      setShowFinanceForm(false);
      setFinanceForm({ customerName: '', customerPhone: '', plan: 'personal_user', amount: '', paymentMethod: 'wechat', startDate: '', endDate: '', remark: '', accountStatus: 'active' });
      loadFinance();
    } catch {
      toast.error('记账失败');
    }
  };

  const handleFinanceDelete = async (recordId: string) => {
    try {
      await authFetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finance-delete', recordId }),
      });
      toast.success('已删�?);
      loadFinance();
    } catch {
      toast.error('删除失败');
    }
  };

  const handleExportFinance = () => {
    const headers = ['客户姓名', '手机', '版本', '金额', '收款方式', '开卡日�?, '到期日期', '账号状�?, '备注', '录入时间'];
    const rows = financeRecords.map(r => [
      r.customer_name, r.customer_phone, PLAN_LABELS[r.plan] || r.plan,
      r.amount, PAYMENT_LABELS[r.payment_method] || r.payment_method,
      r.start_date || '', r.end_date || '', r.account_status, r.remark,
      r.created_at?.substring(0, 10) || '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `财务记录_${financeMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Access control ───
  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">无权访问</p>
      </div>
    );
  }

  if (loading || !dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-blue-800">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>加载数据�?..</span>
        </div>
      </div>
    );
  }

  const isExpiring = (planEnd: string | null) => {
    if (!planEnd) return false;
    const d = new Date(planEnd);
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };

  const isExpired = (planEnd: string | null) => {
    if (!planEnd) return false;
    return new Date(planEnd) < new Date();
  };

  // ─── Render ───
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-blue-950 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6" />
            <h1 className="text-xl font-bold">职盈学海 · 创始人后�?/h1>
          </div>
          <span className="text-sm text-sky-300">{profile?.email}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tab nav */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-3">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════�?板块1：数据总览 ══════════�?*/}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* 版本分布 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">总用�?/p>
                      <p className="text-2xl font-bold text-gray-900">{dashboard.versionDistribution.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">个人�?/p>
                      <p className="text-2xl font-bold text-emerald-700">{dashboard.versionDistribution.personal}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-sky-100 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-sky-700" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">效率�?/p>
                      <p className="text-2xl font-bold text-sky-700">{dashboard.versionDistribution.efficiency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">专业�?/p>
                      <p className="text-2xl font-bold text-blue-700">{dashboard.versionDistribution.pro}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-purple-700" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">旗舰�?/p>
                      <p className="text-2xl font-bold text-purple-700">{dashboard.versionDistribution.flagship}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 核心指标 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-500">今日新增</p>
                      <p className="text-2xl font-bold">{dashboard.todayNew}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">7日活跃用�?/p>
                      <p className="text-2xl font-bold">{dashboard.activeUsers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-500">课程完成�?/p>
                      <p className="text-2xl font-bold">{dashboard.completionRate}%</p>
                    </div>
                  </div>
                  <Progress value={dashboard.completionRate} className="mt-3 h-2" />
                </CardContent>
              </Card>
            </div>

            {/* 7日趋�?*/}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">7日新增用户趋�?/CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3 h-32">
                  {Object.entries(dashboard.dailyNewUsers).map(([date, count]) => {
                    const max = Math.max(...Object.values(dashboard.dailyNewUsers), 1);
                    const height = Math.max(4, (count / max) * 100);
                    return (
                      <div key={date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-semibold text-blue-800">{count}</span>
                        <div className="w-full bg-blue-500 rounded-t" style={{ height: `${height}%`, minHeight: 4 }} />
                        <span className="text-xs text-gray-400">{date.substring(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 收入概览 + 到期预警 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    收入概览
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-emerald-700">
                    ¥{dashboard.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">累计收入</p>
                  {Object.entries(dashboard.monthlyRevenue).slice(-3).map(([m, v]) => (
                    <div key={m} className="flex justify-between text-sm mt-2 border-t pt-2">
                      <span className="text-gray-600">{m}</span>
                      <span className="font-medium">¥{v.toLocaleString()}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    30天内到期预警
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard.expiringCompanies.length === 0 ? (
                    <p className="text-sm text-gray-400">暂无即将到期的账�?/p>
                  ) : (
                    <div className="space-y-2">
                      {dashboard.expiringCompanies.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-100">
                          <div>
                            <p className="text-sm font-medium">{c.name}</p>
                            <p className="text-xs text-gray-500">{PLAN_LABELS[c.plan] || c.plan}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-amber-600 font-medium">
                              {c.plan_end?.substring(0, 10)}
                            </p>
                            <p className="text-xs text-gray-400">
                              剩{Math.ceil((new Date(c.plan_end).getTime() - Date.now()) / 86400000)}�?
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            {/* 数据备份提醒 */}
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">建议每周导出一次数据备�?/p>
                    <p className="text-xs text-amber-700 mt-0.5">定期备份可防止数据丢失，支持按表选择导出</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-amber-300 text-amber-800 hover:bg-amber-100 gap-1 text-xs" onClick={() => router.push('/admin/backup')}>
                  <Download className="w-3.5 h-3.5" /> 去备�?
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ══════════�?板块2：客户管�?══════════�?*/}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            {/* 工具�?*/}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    placeholder="搜索姓名/邮箱/手机"
                    className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64"
                  />
                </div>
                <select
                  value={customerFilter}
                  onChange={e => setCustomerFilter(e.target.value as 'all' | 'expiring' | 'expired')}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="all">全部</option>
                  <option value="expiring">即将到期</option>
                  <option value="expired">已过�?/option>
                </select>
              </div>
              <Button onClick={() => setShowCreateUser(true)} className="bg-blue-900 hover:bg-blue-800 text-white">
                <UserPlus className="w-4 h-4 mr-2" />
                创建账号
              </Button>
            </div>

            {/* 创建账号弹窗 */}
            {showCreateUser && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
                  <h2 className="text-lg font-semibold mb-4">创建专业�?旗舰版账�?/h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">邮箱 *</label>
                      <input value={newUser.email} onChange={e => setNewUser(s => ({ ...s, email: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="user@example.com" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">姓名 *</label>
                      <input value={newUser.displayName} onChange={e => setNewUser(s => ({ ...s, displayName: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="张三" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">手机</label>
                      <input value={newUser.phone} onChange={e => setNewUser(s => ({ ...s, phone: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="13800138000" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">版本</label>
                      <select value={newUser.version} onChange={e => setNewUser(s => ({ ...s, version: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm">
                        <option value="enterprise_manager">专业�?(enterprise_manager)</option>
                        <option value="enterprise_admin">旗舰�?(enterprise_admin)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">有效期（月）</label>
                      <input type="number" value={newUser.months} onChange={e => setNewUser(s => ({ ...s, months: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => setShowCreateUser(false)} className="flex-1">取消</Button>
                    <Button onClick={handleCreateUser} disabled={creatingUser} className="flex-1 bg-blue-900 hover:bg-blue-800 text-white">
                      {creatingUser ? '创建�?..' : '创建并开�?}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 用户列表 */}
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-3 font-medium text-gray-600">姓名</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">邮箱</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">版本</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">企业</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">到期日期</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">状�?/th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-8 text-gray-400">暂无数据</td></tr>
                      ) : customers.map(u => (
                        <tr key={u.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-3 font-medium">{u.display_name || '-'}</td>
                          <td className="py-3 px-3 text-gray-500">{u.email}</td>
                          <td className="py-3 px-3">
                            <Badge variant="outline" className={
                              u.role === 'enterprise_admin' ? 'border-purple-300 text-purple-700' :
                              u.role === 'enterprise_manager' ? 'border-blue-300 text-blue-700' :
                              u.role === 'personal_user' ? 'border-emerald-300 text-emerald-700' :
                              'border-gray-300 text-gray-600'
                            }>
                              {PLAN_LABELS[u.role] || u.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-gray-500">{u.company_name}</td>
                          <td className="py-3 px-3">
                            {u.plan_end ? (
                              <span className={
                                isExpired(u.plan_end) ? 'text-red-500 font-medium' :
                                isExpiring(u.plan_end) ? 'text-amber-500 font-medium' :
                                'text-gray-600'
                              }>
                                {u.plan_end.substring(0, 10)}
                              </span>
                            ) : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={u.status === 'active' ? 'default' : 'secondary'}>
                              {u.status === 'active' ? '正常' : u.status === 'suspended' ? '停用' : u.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex gap-1">
                              {u.status === 'active' ? (
                                <Button size="sm" variant="ghost" onClick={() => handleDisableUser(u.id)} className="text-red-500 hover:text-red-700 h-7 px-2">
                                  停用
                                </Button>
                              ) : (
                                <Button size="sm" variant="ghost" onClick={() => handleEnableUser(u.id)} className="text-green-500 hover:text-green-700 h-7 px-2">
                                  启用
                                </Button>
                              )}
                              {u.company_id && (
                                <Button size="sm" variant="ghost" onClick={() => handleRenewUser(u.company_id, 12)} className="text-blue-500 hover:text-blue-700 h-7 px-2">
                                  订阅12�?
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(u)} className="text-red-500 hover:text-red-700 h-7 px-2">
                                <Trash2 className="w-3.5 h-3.5 mr-0.5" />删除
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ══════════�?板块3：兑换码管理 ══════════�?*/}
        {activeTab === 'codes' && (
          <div className="space-y-6">
            {/* 生成兑换�?*/}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">生成兑换�?/CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">数量</label>
                    <input type="number" value={generateCount} onChange={e => setGenerateCount(Number(e.target.value))}
                      min={1} max={100} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">版本</label>
                    <select value={generatePlan} onChange={e => setGeneratePlan(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="personal_user">管理�?/option>
                      <option value="efficiency">效率�?/option>
                      <option value="enterprise_manager">专业�?/option>
                      <option value="enterprise_admin">旗舰�?/option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">有效天数</label>
                    <input type="number" value={codeExpireDays} onChange={e => setCodeExpireDays(Number(e.target.value))}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => setShowGenerateConfirm(true)} className="bg-blue-900 hover:bg-blue-800 text-white w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      生成
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 库存统计 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-gray-500">总生�?/p>
                  <p className="text-2xl font-bold text-blue-900">{codeStats?.total || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-gray-500">未使�?/p>
                  <p className="text-2xl font-bold text-green-600">{codeStats?.unused || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-gray-500">已使�?/p>
                  <p className="text-2xl font-bold text-gray-500">{codeStats?.used || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-gray-500">已冻�?/p>
                  <p className="text-2xl font-bold text-amber-600">{codeStats?.frozen || 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* 兑换码列�?*/}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">兑换码列�?/CardTitle>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">筛选：</label>
                  <select
                    value={codeFilter}
                    onChange={e => setCodeFilter(e.target.value)}
                    className="border rounded-md px-2 py-1 text-xs"
                  >
                    <option value="all">全部</option>
                    <option value="efficiency">效率�?/option>
                    <option value="personal_user">管理�?/option>
                    <option value="enterprise_manager">专业�?/option>
                    <option value="enterprise_admin">旗舰�?/option>
                  </select>
                  <span className="text-xs text-gray-400">{filteredCodes.length} �?/span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-3 font-medium text-gray-600">兑换�?/th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">版本</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">状�?/th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">使用�?/th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">过期时间</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">创建时间</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCodes.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-8 text-gray-400">暂无兑换�?/td></tr>
                      ) : filteredCodes.map(c => (
                        <tr key={c.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-medium">{c.code}</span>
                              <button
                                onClick={() => handleCopyCode(c.code)}
                                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                                title="复制"
                              >
                                {copiedCode === c.code ? (
                                  <Check className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="outline">{PLAN_LABELS[c.plan_type] || c.plan_type}</Badge>
                          </td>
                          <td className="py-3 px-3">
                            {c.is_used ? (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-500">已使�?/Badge>
                            ) : c.status === 'frozen' ? (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                <Snowflake className="w-3 h-3 mr-1" />冻结
                              </Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-100 text-green-700">可用</Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-gray-500">{c.used_by_email || '-'}</td>
                          <td className="py-3 px-3 text-gray-500">{c.expires_at?.substring(0, 10) || '永久'}</td>
                          <td className="py-3 px-3 text-gray-500">{c.created_at?.substring(0, 10) || '-'}</td>
                          <td className="py-3 px-3">
                            <div className="flex gap-1">
                              {!c.is_used && c.status !== 'frozen' && (
                                <Button size="sm" variant="ghost" onClick={() => handleFreezeCode(c.id)}
                                  className="text-amber-500 hover:text-amber-700 h-7 px-2">
                                  <Snowflake className="w-3 h-3 mr-1" />冻结
                                </Button>
                              )}
                              {c.status === 'frozen' && (
                                <Button size="sm" variant="ghost" onClick={() => handleUnfreezeCode(c.id)}
                                  className="text-green-500 hover:text-green-700 h-7 px-2">
                                  <Flame className="w-3 h-3 mr-1" />解冻
                                </Button>
                              )}
                              {!c.is_used && (
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteCode(c.id)}
                                  className="text-red-500 hover:text-red-700 h-7 px-2">
                                  删除
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 兑换记录 */}
            {codeStats?.usedRecords && codeStats.usedRecords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">兑换记录</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-3 font-medium text-gray-600">兑换�?/th>
                          <th className="text-left py-3 px-3 font-medium text-gray-600">版本</th>
                          <th className="text-left py-3 px-3 font-medium text-gray-600">使用�?/th>
                          <th className="text-left py-3 px-3 font-medium text-gray-600">兑换时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {codeStats.usedRecords.map(c => (
                          <tr key={c.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-3 font-mono">{c.code}</td>
                            <td className="py-3 px-3">{PLAN_LABELS[c.plan_type] || c.plan_type}</td>
                            <td className="py-3 px-3 text-gray-500">{c.used_by_email || '-'}</td>
                            <td className="py-3 px-3 text-gray-500">{c.used_at?.substring(0, 16) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ══════════�?板块4：财务记�?══════════�?*/}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            {/* 工具�?*/}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 items-center">
                <input type="month" value={financeMonth} onChange={e => setFinanceMonth(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm" />
                <span className="text-sm text-gray-500">
                  当月 {financeRecords.length} 条记�?
                </span>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleExportFinance} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  导出CSV
                </Button>
                <Button onClick={() => setShowFinanceForm(true)} className="bg-blue-900 hover:bg-blue-800 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  新增记账
                </Button>
              </div>
            </div>

            {/* 月度汇�?*/}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(financeSummary).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 3).map(([month, info]) => (
                <Card key={month}>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-500">{month}</p>
                    <p className="text-2xl font-bold text-emerald-700">¥{info.income.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">{info.count} �?/p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 新增记账弹窗 */}
            {showFinanceForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                  <h2 className="text-lg font-semibold mb-4">新增财务记录</h2>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">客户姓名 *</label>
                        <input value={financeForm.customerName}
                          onChange={e => setFinanceForm(s => ({ ...s, customerName: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">手机</label>
                        <input value={financeForm.customerPhone}
                          onChange={e => setFinanceForm(s => ({ ...s, customerPhone: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">版本 *</label>
                        <select value={financeForm.plan}
                          onChange={e => setFinanceForm(s => ({ ...s, plan: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm">
                          <option value="personal_user">个人�?(¥980/�?</option>
                          <option value="enterprise_manager">专业�?(¥6800/�?</option>
                          <option value="enterprise_admin">旗舰�?(¥16800/2�?</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">收款金额 *</label>
                        <input type="number" value={financeForm.amount}
                          onChange={e => setFinanceForm(s => ({ ...s, amount: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">收款方式</label>
                        <select value={financeForm.paymentMethod}
                          onChange={e => setFinanceForm(s => ({ ...s, paymentMethod: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm">
                          <option value="wechat">微信</option>
                          <option value="alipay">支付�?/option>
                          <option value="cash">现金</option>
                          <option value="other">其他</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">账号状�?/label>
                        <select value={financeForm.accountStatus || 'active'}
                          onChange={e => setFinanceForm(s => ({ ...s, accountStatus: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm">
                          <option value="active">正常</option>
                          <option value="expired">已过�?/option>
                          <option value="suspended">已停�?/option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">开卡日�?/label>
                        <input type="date" value={financeForm.startDate}
                          onChange={e => setFinanceForm(s => ({ ...s, startDate: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">到期日期</label>
                        <input type="date" value={financeForm.endDate}
                          onChange={e => setFinanceForm(s => ({ ...s, endDate: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">备注</label>
                      <textarea value={financeForm.remark}
                        onChange={e => setFinanceForm(s => ({ ...s, remark: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => setShowFinanceForm(false)} className="flex-1">取消</Button>
                    <Button onClick={handleFinanceCreate} className="flex-1 bg-blue-900 hover:bg-blue-800 text-white">
                      确认记账
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 财务记录�?*/}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">财务记录</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium text-gray-600">客户姓名</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">手机</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">版本</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">金额</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">方式</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">开卡日</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">到期�?/th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">状�?/th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">备注</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financeRecords.length === 0 ? (
                        <tr><td colSpan={10} className="text-center py-8 text-gray-400">暂无记录</td></tr>
                      ) : financeRecords.map(r => (
                        <tr key={r.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2 font-medium">{r.customer_name}</td>
                          <td className="py-3 px-2 text-gray-500">{r.customer_phone || '-'}</td>
                          <td className="py-3 px-2">
                            <Badge variant="outline">{PLAN_LABELS[r.plan] || r.plan}</Badge>
                          </td>
                          <td className="py-3 px-2 font-medium text-emerald-700">¥{Number(r.amount).toLocaleString()}</td>
                          <td className="py-3 px-2 text-gray-500">{PAYMENT_LABELS[r.payment_method] || r.payment_method}</td>
                          <td className="py-3 px-2 text-gray-500">{r.start_date || '-'}</td>
                          <td className="py-3 px-2 text-gray-500">{r.end_date || '-'}</td>
                          <td className="py-3 px-2">
                            <Badge variant={r.account_status === 'active' ? 'default' : 'secondary'}>
                              {r.account_status === 'active' ? '正常' : r.account_status === 'expired' ? '过期' : '停用'}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-gray-400 max-w-24 truncate">{r.remark || '-'}</td>
                          <td className="py-3 px-2">
                            <Button size="sm" variant="ghost" onClick={() => handleFinanceDelete(r.id)}
                              className="text-red-500 hover:text-red-700 h-7 px-2">
                              删除
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ══════════�?板块5：知识萃�?══════════�?*/}
        {activeTab === 'knowledge' && <KnowledgeExtractionContent />}

        {/* ══════════�?板块6：课程反�?══════════�?*/}
        {activeTab === 'feedback' && <LessonFeedbackStats />}

        {/* 删除用户确认弹窗 */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">确认删除用户</h3>
              </div>
              <p className="text-gray-600 mb-2">确定要删除用�?<strong>{deleteTarget.email}</strong> 吗？</p>
              <p className="text-red-600 text-sm mb-4">此操作不可恢复。该用户的所有数据将被永久删除�?/p>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  请输�?<span className="font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded">DELETE</span> 确认删除
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="输入 DELETE"
                  className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 outline-none transition-colors text-base font-mono"
                  autoComplete="off"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteConfirmText(''); }} disabled={deleting}>
                  取消
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={async () => {
                    if (deleteConfirmText !== 'DELETE') {
                      toast.error('请输�?DELETE 确认删除');
                      return;
                    }
                    setDeleting(true);
                    try {
                      const res = await authFetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE', headers: { 'x-admin-id': profile?.id || '' } });
                      const data = await res.json();
                      if (data.error) { alert(data.error); } else {
                        setDeleteTarget(null);
                        setDeleteConfirmText('');
                        loadCustomers();
                      }
                    } catch { alert('删除失败'); }
                    setDeleting(false);
                  }}
                  disabled={deleting || deleteConfirmText !== 'DELETE'}
                >
                  {deleting ? '删除�?..' : '确认删除'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 兑换码批量生成确认弹�?*/}
        {showGenerateConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-bold mb-4">确认生成兑换�?/h3>
              <p className="text-gray-600 mb-2">
                即将生成 <span className="font-bold text-blue-900">{generateCount}</span> �?
                <span className="font-bold text-blue-900">
                  {generatePlan === 'personal_user' ? '管理�? :
                   generatePlan === 'efficiency' ? '效率�? :
                   generatePlan === 'enterprise_manager' ? '专业�? : '旗舰�?}
                </span> 兑换码，有效�?<span className="font-bold text-blue-900">{codeExpireDays}</span> �?
              </p>
              <p className="text-sm text-gray-500 mb-6">此操作不可撤销，请确认数量和版�?/p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowGenerateConfirm(false)} className="flex-1">
                  取消
                </Button>
                <Button onClick={() => { setShowGenerateConfirm(false); handleGenerateCodes(); }} className="flex-1 bg-blue-900 hover:bg-blue-800 text-white">
                  确认生成
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════�?课程反馈统计组件 ══════════�?*/
function LessonFeedbackStats() {
  const [stats, setStats] = useState<Array<{
    lesson_id: string; total: number; understood: number;
    not_understood: number; skipped: number; reasons: Record<string, number>;
    feedbacks: Array<{ user_id: string; reason: string; created_at: string; understood: boolean }>;
  }> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/lesson-feedback/stats')
      .then(r => r.json())
      .then(d => { setStats(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-lg text-gray-400">加载�?..</div>;
  if (!stats?.length) return <div className="p-8 text-center text-gray-400">暂无反馈数据</div>;

  const totalFeedbacks = stats.reduce((s, l) => s + l.total, 0);
  const totalNotUnderstood = stats.reduce((s, l) => s + l.not_understood, 0);
  const overallRate = totalFeedbacks > 0 ? Math.round(((totalFeedbacks - totalNotUnderstood) / totalFeedbacks) * 100) : 0;

  const allReasons: Record<string, number> = {};
  stats.forEach(l => {
    Object.entries(l.reasons || {}).forEach(([k, v]) => { allReasons[k] = (allReasons[k] || 0) + v; });
  });
  const topReasons = Object.entries(allReasons).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <MessageSquare className="w-6 h-6" /> 课程反馈统计
      </h2>

      {/* 总览 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-5 text-center">
          <div className="text-3xl font-bold text-blue-700">{totalFeedbacks}</div>
          <div className="text-base text-gray-600 mt-1">总反馈数</div>
        </div>
        <div className="bg-green-50 rounded-xl p-5 text-center">
          <div className="text-3xl font-bold text-green-700">{overallRate}%</div>
          <div className="text-base text-gray-600 mt-1">理解�?/div>
        </div>
        <div className="bg-red-50 rounded-xl p-5 text-center">
          <div className="text-3xl font-bold text-red-700">{totalNotUnderstood}</div>
          <div className="text-base text-gray-600 mt-1">没看懂人�?/div>
        </div>
      </div>

      {/* 高频问题标签 */}
      {topReasons.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">高频问题标签</h3>
          <div className="flex flex-wrap gap-3">
            {topReasons.map(([reason, count]) => (
              <span key={reason} className="px-4 py-2 bg-red-50 text-red-700 rounded-full text-base font-medium">
                {reason} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 按没看懂占比排序 */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">按没看懂占比排序</h3>
        </div>
        <div className="divide-y">
          {stats.sort((a, b) => (b.not_understood / Math.max(b.total, 1)) - (a.not_understood / Math.max(a.total, 1))).map(lesson => {
            const notRate = lesson.total > 0 ? Math.round((lesson.not_understood / lesson.total) * 100) : 0;
            return (
              <LessonFeedbackDetailRow key={lesson.lesson_id} lesson={lesson} notRate={notRate} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LessonFeedbackDetailRow({ lesson, notRate }: {
  lesson: {
    lesson_id: string; total: number; understood: number;
    not_understood: number; reasons: Record<string, number>;
    feedbacks: Array<{ user_id: string; reason: string; created_at: string; understood: boolean }>;
  };
  notRate: number;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <span className="text-lg font-medium text-gray-800">{lesson.lesson_id}</span>
          <span className="text-base text-gray-500">{lesson.total}条反�?/span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${notRate > 40 ? 'bg-red-500' : notRate > 20 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${notRate}%` }} />
            </div>
            <span className={`text-lg font-bold ${notRate > 40 ? 'text-red-600' : notRate > 20 ? 'text-yellow-600' : 'text-green-600'}`}>
              {notRate}%没看�?
            </span>
          </div>
          <span className="text-gray-400">{expanded ? '�? : '�?}</span>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex gap-6 text-base">
            <span className="text-green-700">�?看懂 {lesson.understood}</span>
            <span className="text-red-700">�?没看�?{lesson.not_understood}</span>
          </div>
          {Object.keys(lesson.reasons || {}).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(lesson.reasons).map(([r, c]) => (
                <span key={r} className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm">{r}({c})</span>
              ))}
            </div>
          )}
          {lesson.feedbacks?.filter(f => !f.understood && f.reason).length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-600">用户反馈原文�?/div>
              {lesson.feedbacks.filter(f => !f.understood && f.reason).map((f, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                  <span className="text-gray-400 mr-2">用户{f.user_id?.slice(0, 6)}...</span>
                  {f.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
