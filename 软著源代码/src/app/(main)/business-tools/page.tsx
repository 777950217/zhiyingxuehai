'use client';

import { useState, useEffect, useCallback, memo, useMemo, type FC } from 'react';
import { PageHint } from '@/components/page-hint';
import { OnboardingGuide } from '@/components/onboarding-guide';
import {
  Settings,
  Calculator,
  TrendingUp,
  Save,
  AlertTriangle,
  CheckCircle,
  Minus,
  RefreshCw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Receipt,
  BarChart3,
  ArrowRight,
  Download,
  Upload,
  Users,
  MessageSquare,
  FileText,
  RotateCcw,
  Target,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

/* ── Types ── */
interface PublicCosts {
  rent: string;
  salary: string;
  utilities: string;
  afterSales: string;
  returns: string;
  monthlyOrders: string;
}

interface PricingInputs {
  purchaseCost: string;
  shippingCost: string;
  packagingCost: string;
  platformRate: string;
  adCost: string;
  profitRate: string;
}

interface PnlInputs {
  totalRevenue: string;
  purchaseTotal: string;
  adTotal: string;
  shippingPackTotal: string;
  salaryTotal: string;
  rentTotal: string;
  utilitiesTotal: string;
  afterSalesTotal: string;
  returnsTotal: string;
  platformFeeTotal: string;
  adROI: string;
}



interface CashFlowRecord {
  id: string;
  date: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  note: string;
  createdBy: string;
}

const STORAGE_KEY = 'business-tools-public-costs';
const CASH_FLOW_KEY = 'business-tools-cash-flow';
const PNL_MODE_KEY = 'business-tools-pnl-mode';


const defaultCosts: PublicCosts = {
  rent: '', salary: '', utilities: '', afterSales: '', returns: '', monthlyOrders: '',
};
const defaultPricing: PricingInputs = {
  purchaseCost: '', shippingCost: '', packagingCost: '', platformRate: '', adCost: '', profitRate: '',
};
const defaultPnl: PnlInputs = {
  totalRevenue: '', purchaseTotal: '', adTotal: '', shippingPackTotal: '',
  salaryTotal: '', rentTotal: '', utilitiesTotal: '', afterSalesTotal: '', returnsTotal: '',
  platformFeeTotal: '', adROI: '',
};

/* ── Preset Platforms ── */
const PRESET_PLATFORMS = [
  { name: '抖音', rate: 2, rateMax: 5, note: '基础2%，部分类�?%' },
  { name: '淘宝', rate: 0.6, rateMax: 5, note: 'C�?.6%，天�?%+' },
  { name: '天猫', rate: 5, rateMax: 5, note: '5%居多，需加软件服务年�? },
  { name: '拼多�?, rate: 0.6, rateMax: 3, note: '基础0.6%，部分类�?%-3%' },
  { name: '京东', rate: 1, rateMax: 8, note: '1%-8%，自�?POP不同' },
  { name: '快手', rate: 2, rateMax: 5, note: '类似抖音，视品类而定' },
  { name: '视频�?, rate: 1, rateMax: 5, note: '微信生态，视品类而定' },
  { name: '小红�?, rate: 5, rateMax: 5, note: '基础5%' },
  { name: '自营/私域', rate: 0, rateMax: 0, note: '无平台扣�? },
];

const num = (v: string) => parseFloat(v) || 0;
const fmt = (v: number) => v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── Cash Flow Categories ── */
const EXPENSE_CATEGORIES = [
  '售后赔付', '物流费用', '平台扣点', '退�?, '补偿赠品',
  '人工成本', '仓储费用', '包装费用', '进货成本', '投流推广',
  '租金水电', '其他支出',
];
const INCOME_CATEGORIES = [
  '销售收�?, '平台补贴', '其他收入',
];
const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

/* ── Promo Plan Types ── */
/* Category �?PnL field mapping for auto-summary */
type PnlField = keyof PnlInputs;
const CATEGORY_PNL_MAP: Record<string, { field: PnlField; type: 'income' | 'expense' }> = {
  '店铺主营回款': { field: 'totalRevenue', type: 'income' },
  '供应商返�?: { field: 'totalRevenue', type: 'income' },
  '备用金入�?: { field: 'totalRevenue', type: 'income' },
  '其他零星收入': { field: 'totalRevenue', type: 'income' },
  '进货成本': { field: 'purchaseTotal', type: 'expense' },
  '投流推广': { field: 'adTotal', type: 'expense' },
  '快递物�?: { field: 'shippingPackTotal', type: 'expense' },
  '人员工资': { field: 'salaryTotal', type: 'expense' },
  '租金水电': { field: 'rentTotal', type: 'expense' },
  '售后理赔': { field: 'afterSalesTotal', type: 'expense' },
  '退货亏�?: { field: 'returnsTotal', type: 'expense' },
  '平台费用': { field: 'platformFeeTotal', type: 'expense' },
};

/* ── InputField ── */
const InputField: FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  readOnly?: boolean;
  highlighted?: boolean;
  refHint?: string;
}> = memo(function InputField({ label, value, onChange, prefix, suffix, placeholder, readOnly, highlighted, refHint }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-slate-300">{label}</label>
      <div className="flex items-center gap-0">
        {prefix && (
          <span className={`border border-r-0 border-[#0d2a42] rounded-l-lg px-3 py-2 text-slate-400 text-sm ${highlighted ? 'bg-sky-900/50' : 'bg-[#1a3a5c]'}`}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '0'}
          readOnly={readOnly}
          className={`flex-1 border border-[#0d2a42] text-white px-3 py-2 text-sm outline-none focus:border-sky-400 transition-colors ${highlighted ? 'bg-sky-900/30' : 'bg-[#0F2B46]'} ${readOnly ? 'opacity-70 cursor-not-allowed' : ''} ${prefix ? '' : 'rounded-l-lg'} ${suffix ? '' : 'rounded-r-lg'}`}
        />
        {suffix && (
          <span className={`border border-l-0 border-[#0d2a42] rounded-r-lg px-3 py-2 text-slate-400 text-sm ${highlighted ? 'bg-sky-900/50' : 'bg-[#1a3a5c]'}`}>
            {suffix}
          </span>
        )}
      </div>
      {refHint && <div className="text-xs text-gray-400 mt-0.5">💡 行业参考：{refHint}</div>}
    </div>
  );
});

/* ── Platform Select Helper ── */
const PlatformSelect: FC<{
  value: string;
  onChange: (name: string, rate: number, note?: string) => void;
  label?: string;
}> = memo(function PlatformSelect({ value, onChange, label }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm text-slate-300">{label}</label>}
      <select
        value={value}
        onChange={(e) => {
          const selected = PRESET_PLATFORMS.find(p => p.name === e.target.value);
          if (selected) {
            onChange(selected.name, selected.rate, selected.note);
          } else if (e.target.value === '__custom__') {
            onChange('自定�?, 0, '手动输入扣点比例');
          }
        }}
        className="w-full bg-[#0F2B46] border border-[#0d2a42] text-white rounded-lg px-3 py-2.5 text-base focus:border-sky-400 focus:outline-none"
      >
        <option value="">选择经营平台（自动填入扣点）</option>
        {PRESET_PLATFORMS.map(p => (
          <option key={p.name} value={p.name}>
            {p.name}（{p.rate}{p.rateMax > p.rate ? `~${p.rateMax}` : ''}%）{p.note ? `�?${p.note}` : ''}
          </option>
        ))}
        <option value="__custom__">其他平台（手动输入）</option>
      </select>
    </div>
  );
});

/* ── Tab 1: 公共成本设置 ── */
const TabPublicCosts: FC<{
  costs: PublicCosts;
  setCosts: React.Dispatch<React.SetStateAction<PublicCosts>>;
  syncing1: boolean;
  onSync: () => void;
  onSave: () => void;
}> = memo(function TabPublicCosts({ costs, setCosts, syncing1, onSync, onSave }) {
  const monthlyOrders = num(costs.monthlyOrders);
  const totalFixedCosts = num(costs.rent) + num(costs.salary) + num(costs.utilities) + num(costs.afterSales) + num(costs.returns);
  const perOrderFixed = monthlyOrders > 0 ? totalFixedCosts / monthlyOrders : 0;

  const updateCost = useCallback(<K extends keyof PublicCosts>(key: K, value: PublicCosts[K]) => {
    setCosts(prev => ({ ...prev, [key]: value }));
  }, [setCosts]);

  return (
    <div className="space-y-6">
      <div className="bg-[#0F2B46]/80 rounded-xl p-6 border border-[#1a3a5c] space-y-4">
        <h2 className="text-lg font-semibold text-white">每月固定成本</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="每月店铺租金" value={costs.rent} onChange={(v) => updateCost('rent', v)} prefix="¥" />
          <InputField label="每月全员人工总工�? value={costs.salary} onChange={(v) => updateCost('salary', v)} prefix="¥" refHint="客服人均月成本：4000-6000�? />
          <InputField label="每月水电+物业+网络杂费" value={costs.utilities} onChange={(v) => updateCost('utilities', v)} prefix="¥" />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <InputField label="每月售后预估总成本（补发/理赔/维修�? value={costs.afterSales} onChange={(v) => updateCost('afterSales', v)} prefix="¥" refHint="售后赔付均单�?0-200�? />
            </div>
            <button onClick={onSync} disabled={syncing1} className="h-10 flex items-center gap-1 px-3 text-xs text-sky-400 hover:text-sky-300 border border-sky-400/30 rounded-lg hover:bg-sky-400/10 transition disabled:opacity-50 whitespace-nowrap">
              <RefreshCw className={`w-3 h-3 ${syncing1 ? 'animate-spin' : ''}`} />{syncing1 ? '同步�? : '同步实际'}
            </button>
          </div>
          <InputField label="每月退货预估亏�? value={costs.returns} onChange={(v) => updateCost('returns', v)} prefix="¥" refHint="退货运费均单：30-80�? />
          <InputField label="预估每月订单�? value={costs.monthlyOrders} onChange={(v) => updateCost('monthlyOrders', v)} suffix="�? />
        </div>
      </div>

      {/* Result */}
      <div className="bg-[#0F2B46]/80 rounded-xl p-6 border border-[#1a3a5c]">
        <p className="text-slate-300 text-sm mb-2">每单固定分摊成本</p>
        {monthlyOrders > 0 ? (
          <>
            <p className="text-3xl font-bold text-sky-400">¥{fmt(perOrderFixed)}</p>
            <p className="text-slate-500 text-xs mt-2">
              = (¥{fmt(num(costs.rent))} + ¥{fmt(num(costs.salary))} + ¥{fmt(num(costs.utilities))} + ¥{fmt(num(costs.afterSales))} + ¥{fmt(num(costs.returns))}) ÷ {fmt(monthlyOrders)}�?
            </p>
          </>
        ) : (
          <p className="text-slate-500 text-sm">请填写预估每月订单量后自动计�?/p>
        )}
      </div>

      <button
        onClick={onSave}
        className="flex items-center gap-2 px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <Save className="w-4 h-4" />
        保存设置
      </button>
    </div>
  );
});

/* ── Tab 2: 商品定价计算�?── */
const TabPricingCalc: FC<{
  pricing: PricingInputs;
  setPricing: React.Dispatch<React.SetStateAction<PricingInputs>>;
  perOrderFixed: number;
  selectedPlatform: string;
  setSelectedPlatform: (name: string) => void;
  platformNote: string;
  setPlatformNote: (note: string) => void;
  platformAutoFilled: boolean;
  setPlatformAutoFilled: (v: boolean) => void;
}> = memo(function TabPricingCalc({ pricing, setPricing, perOrderFixed, selectedPlatform, setSelectedPlatform, platformNote, setPlatformNote, platformAutoFilled, setPlatformAutoFilled }) {
  const variableCost = num(pricing.purchaseCost) + num(pricing.shippingCost) + num(pricing.packagingCost) + num(pricing.adCost);
  const fullCost = variableCost + perOrderFixed;
  const platformPct = num(pricing.platformRate) / 100;
  const breakEvenPrice = platformPct < 1 && fullCost > 0 ? fullCost / (1 - platformPct) : 0;
  const profitPct = num(pricing.profitRate) / 100;
  const suggestedPrice = breakEvenPrice > 0 ? breakEvenPrice * (1 + profitPct) : 0;
  const netProfit = suggestedPrice > 0 ? suggestedPrice - fullCost - (suggestedPrice * platformPct) : 0;

  const updatePricing = useCallback(<K extends keyof PricingInputs>(key: K, value: PricingInputs[K]) => {
    setPricing(prev => ({ ...prev, [key]: value }));
  }, [setPricing]);

  return (
    <div className="space-y-6">
      <PageHint>算出合理售价——进�?快�?投流+扣点+分摊，每单赚多少一目了然�?/PageHint>
      {perOrderFixed === 0 && (
        <div className="flex items-center gap-2 bg-amber-900/30 border border-amber-700/50 rounded-lg px-4 py-3 text-amber-300 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          请先完成公共成本设置（Tab 1），否则每单固定分摊�?¥0 计算
        </div>
      )}
      {perOrderFixed > 0 && (
        <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-700/50 rounded-lg px-4 py-3 text-emerald-300 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          已从公共成本设置拉取，每单固定分�?¥{fmt(perOrderFixed)}
        </div>
      )}

      <div className="bg-[#0F2B46]/80 rounded-xl p-6 border border-[#1a3a5c] space-y-4">
        <h2 className="text-lg font-semibold text-white">单品成本与定�?/h2>
        {/* Platform selector */}
        <PlatformSelect
          value={selectedPlatform}
          onChange={(name, rate) => {
            setSelectedPlatform(name);
            setPricing(prev => ({ ...prev, platformRate: String(rate) }));
            setPlatformNote(PRESET_PLATFORMS.find(p => p.name === name)?.note || '');
            setPlatformAutoFilled(name !== '其他');
          }}
          label="经营平台（选择后自动填入扣点比例）"
        />
        {platformNote && (
          <p className="text-sm text-sky-300 mt-1">💡 {platformNote}</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="单品进货成本" value={pricing.purchaseCost} onChange={(v) => updatePricing('purchaseCost', v)} prefix="¥" />
          <InputField label="单件快递运�? value={pricing.shippingCost} onChange={(v) => updatePricing('shippingCost', v)} prefix="¥" />
          <InputField label="单件包装/耗材成本" value={pricing.packagingCost} onChange={(v) => updatePricing('packagingCost', v)} prefix="¥" />
          <InputField label="平台类目扣点" value={pricing.platformRate} onChange={(v) => { updatePricing('platformRate', v); setPlatformAutoFilled(false); }} suffix="%" highlighted={platformAutoFilled} />
          <InputField label="单件推广投流分摊�? value={pricing.adCost} onChange={(v) => updatePricing('adCost', v)} prefix="¥" />
          <InputField label="期望利润�? value={pricing.profitRate} onChange={(v) => updatePricing('profitRate', v)} suffix="%" />
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0F2B46]/80 rounded-xl p-5 border border-[#1a3a5c]">
          <p className="text-slate-400 text-xs mb-1">单品可变成本</p>
          <p className="text-xl font-bold text-white">¥{fmt(variableCost)}</p>
          <p className="text-slate-600 text-xs mt-1">进货+快�?包装+投流</p>
        </div>
        <div className="bg-[#0F2B46]/80 rounded-xl p-5 border border-[#1a3a5c]">
          <p className="text-slate-400 text-xs mb-1">单品完整总成�?/p>
          <p className="text-xl font-bold text-white">¥{fmt(fullCost)}</p>
          <p className="text-slate-600 text-xs mt-1">可变成本+每单固定分摊 ¥{fmt(perOrderFixed)}</p>
        </div>
        <div className="bg-[#0F2B46]/80 rounded-xl p-5 border border-red-800/40">
          <p className="text-slate-400 text-xs mb-1">保本售价（最低售价）</p>
          <p className="text-2xl font-bold text-red-400">¥{fmt(breakEvenPrice)}</p>
          <p className="text-slate-600 text-xs mt-1">低于此价即亏�?/p>
        </div>
        <div className="bg-[#0F2B46]/80 rounded-xl p-5 border border-emerald-800/40">
          <p className="text-slate-400 text-xs mb-1">建议日常售价</p>
          <p className="text-2xl font-bold text-emerald-400">¥{fmt(suggestedPrice)}</p>
          <p className="text-slate-600 text-xs mt-1">含{pricing.profitRate || '0'}%期望利润�?/p>
        </div>
      </div>

      <div className="bg-[#0F2B46]/80 rounded-xl p-6 border border-sky-800/40">
        <p className="text-slate-300 text-sm mb-1">单品纯利�?/p>
        <p className="text-3xl font-bold text-sky-400">¥{fmt(netProfit)}</p>
        <p className="text-slate-600 text-xs mt-2">
          = 建议售价 ¥{fmt(suggestedPrice)} - 完整成本 ¥{fmt(fullCost)} - 平台扣点 ¥{fmt(suggestedPrice * platformPct)}
        </p>
      </div>
    </div>
  );
});

/* ── Sub-tab: 出纳收支登记 ── */
const SubTabCashFlow: FC<{
  records: CashFlowRecord[];
  setRecords: React.Dispatch<React.SetStateAction<CashFlowRecord[]>>;
  pnlMonth: string;
  onSwitchToSummary: () => void;
}> = memo(function SubTabCashFlow({ records, setRecords, pnlMonth, onSwitchToSummary }) {
  const { profile, authFetch: authFetchCtx } = useAuth();
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cfMode, setCfMode] = useState<'per-entry' | 'manual-total'>('per-entry');
  const [manualIncome, setManualIncome] = useState('');
  const [manualExpense, setManualExpense] = useState('');
  const [savingManual, setSavingManual] = useState(false);
  const [syncingToSupabase, setSyncingToSupabase] = useState(false);

  const companyId = profile?.companyId || '';

  const monthRecords = useMemo(() =>
    records.filter(r => r.date.startsWith(pnlMonth)).sort((a, b) => b.date.localeCompare(a.date)),
    [records, pnlMonth]
  );

  const monthIncome = useMemo(() => monthRecords.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0), [monthRecords]);
  const monthExpense = useMemo(() => monthRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0), [monthRecords]);

  const isIncome = INCOME_CATEGORIES.includes(category);
  const canSubmit = category && parseFloat(amount) > 0;

  /* ── Supabase: save record ── */
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    const record: CashFlowRecord = {
      id: editingId || `cf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date,
      category,
      amount: parseFloat(amount),
      type: isIncome ? 'income' : 'expense',
      note,
      createdBy: profile?.displayName || '',
    };
    setRecords(prev => {
      const next = editingId ? prev.map(r => r.id === editingId ? record : r) : [...prev, record];
      localStorage.setItem(CASH_FLOW_KEY, JSON.stringify(next));
      return next;
    });
    // Also save to Supabase
    if (companyId) {
      try {
        await fetch('/api/cash-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add-record',
            companyId,
            record: {
              category,
              amount: parseFloat(amount),
              type: isIncome ? 'income' : 'expense',
              recordDate: date,
              note: note || undefined,
              createdBy: profile?.displayName || undefined,
            },
          }),
        });
      } catch { toast.error('云端同步失败，数据已暂存本地'); }
    }
    setCategory('');
    setAmount('');
    setNote('');
    setEditingId(null);
    toast.success(editingId ? '已更�? : '已登�?);
  }, [canSubmit, category, amount, date, note, isIncome, editingId, profile?.displayName, setRecords, companyId]);

  /* ── Supabase: delete record ── */
  const handleDelete = useCallback(async (id: string) => {
    setRecords(prev => {
      const next = prev.filter(r => r.id !== id);
      localStorage.setItem(CASH_FLOW_KEY, JSON.stringify(next));
      return next;
    });
    if (companyId) {
      try {
        await fetch('/api/cash-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete-record', companyId, recordId: id }),
        });
      } catch { toast.error('云端同步失败，数据已暂存本地'); }
    }
    toast.success('已删�?);
  }, [setRecords, companyId]);

  const handleEdit = useCallback((r: CashFlowRecord) => {
    setEditingId(r.id);
    setCategory(r.category);
    setAmount(String(r.amount));
    setDate(r.date);
    setNote(r.note);
    setShowMore(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setCategory('');
    setAmount('');
    setNote('');
    setDate(new Date().toISOString().slice(0, 10));
  }, []);

  /* ── Supabase: save manual totals ── */
  const handleSaveManualTotal = useCallback(async () => {
    if (!companyId) return;
    setSavingManual(true);
    try {
      const res = await fetch('/api/cash-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-monthly-total',
          companyId,
          monthlyTotal: {
            yearMonth: pnlMonth,
            incomeTotal: parseFloat(manualIncome) || 0,
            expenseTotal: parseFloat(manualExpense) || 0,
          },
        }),
      });
      if (res.ok) {
        toast.success('总额已保�?);
      }
    } catch { toast.error('云端保存失败，数据已暂存本地'); }
    setSavingManual(false);
  }, [companyId, pnlMonth, manualIncome, manualExpense]);

  /* ── Load manual totals from Supabase on mount ── */
  useEffect(() => {
    if (!companyId) return;
    fetch(`/api/cash-flow?companyId=${companyId}&yearMonth=${pnlMonth}`)
      .then(r => r.json())
      .then(data => {
        if (data.totals && data.totals.length > 0) {
          const t = data.totals[0];
          setManualIncome(String(t.income_total));
          setManualExpense(String(t.expense_total));
        }
      })
      .catch(() => { toast.error('云端数据加载失败，使用本地缓�?); });
  }, [companyId, pnlMonth]);

  /* ── Sync localStorage records to Supabase ── */
  const handleSyncToSupabase = useCallback(async () => {
    if (!companyId || records.length === 0) return;
    setSyncingToSupabase(true);
    try {
      for (const r of records) {
        await fetch('/api/cash-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add-record',
            companyId,
            record: {
              category: r.category,
              amount: r.amount,
              type: r.type,
              recordDate: r.date,
              note: r.note || undefined,
              createdBy: r.createdBy || undefined,
            },
          }),
        });
      }
      toast.success('已同步到云端');
    } catch { toast.error('同步失败'); }
    setSyncingToSupabase(false);
  }, [companyId, records]);

  return (
    <div className="space-y-6">
      <PageHint text="记流水、算总账——每笔收支记下来，月度盈亏自动汇总�? />

      {/* ── 双模式切�?── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-[#0F2B46] rounded-lg p-0.5 border border-[#1a3a5c]">
          <button onClick={() => setCfMode('per-entry')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${cfMode === 'per-entry' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'}`}>
            逐笔录入
          </button>
          <button onClick={() => setCfMode('manual-total')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${cfMode === 'manual-total' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'}`}>
            手动填总额
          </button>
        </div>
        <span className="text-xs text-slate-500">
          当前模式：{cfMode === 'per-entry' ? '逐笔录入' : '手动填总额'}
        </span>
      </div>

      {cfMode === 'per-entry' ? (
        <>
          {/* Quick entry card */}
          <div className="bg-[#0F2B46]/80 rounded-xl p-6 border border-[#1a3a5c] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-sky-400" />
                {editingId ? '编辑收支' : '极简录入'}
              </h2>
              {editingId && (
                <button onClick={handleCancelEdit} className="text-xs text-slate-400 hover:text-white transition-colors">
                  取消编辑
                </button>
              )}
            </div>

            {/* Required fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-slate-300">收支分类 <span className="text-red-400">*</span></label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0F2B46] border border-[#0d2a42] text-white rounded-lg px-3 py-2 text-sm focus:border-sky-400 focus:outline-none">
                  <option value="">选择分类</option>
                  <optgroup label="── 支出�?──">
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="── 收入�?──">
                    {INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-slate-300">金额 <span className="text-red-400">*</span></label>
                <div className="flex items-center">
                  <span className="bg-[#1a3a5c] border border-r-0 border-[#0d2a42] rounded-l-lg px-3 py-2 text-slate-400 text-sm">¥</span>
                  <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="0" min="0" step="0.01"
                    className="flex-1 bg-[#0F2B46] border border-[#0d2a42] text-white px-3 py-2 text-sm rounded-r-lg focus:border-sky-400 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* More fields toggle */}
            <button onClick={() => setShowMore(v => !v)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-sky-400 transition-colors">
              {showMore ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showMore ? '收起可选字�? : '更多字段（日�?备注�?}
            </button>

            {showMore && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#1a3a5c]/50">
                <div className="space-y-1.5">
                  <label className="text-sm text-slate-300">日期</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#0F2B46] border border-[#0d2a42] text-white rounded-lg px-3 py-2 text-sm focus:border-sky-400 focus:outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-slate-300">备注</label>
                  <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="可�?
                    className="w-full bg-[#0F2B46] border border-[#0d2a42] text-white rounded-lg px-3 py-2 text-sm focus:border-sky-400 focus:outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-slate-300">登记�?/label>
                  <input type="text" value={profile?.displayName || ''} readOnly
                    className="w-full bg-[#0F2B46] border border-[#0d2a42] text-slate-400 rounded-lg px-3 py-2 text-sm cursor-not-allowed opacity-70" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button onClick={handleSubmit} disabled={!canSubmit}
                className="flex items-center gap-2 px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Plus className="w-4 h-4" />
                {editingId ? '更新' : '一键保�?}
              </button>
              {companyId && records.length > 0 && (
                <button onClick={handleSyncToSupabase} disabled={syncingToSupabase}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-sky-400 transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-3 h-3 ${syncingToSupabase ? 'animate-spin' : ''}`} />
                  {syncingToSupabase ? '同步�?..' : '同步到云�?}
                </button>
              )}
            </div>
          </div>

          {/* Monthly summary bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#0F2B46]/80 rounded-xl p-4 border border-[#1a3a5c] text-center">
              <p className="text-xs text-slate-400 mb-1">本月收入</p>
              <p className="text-xl font-bold text-emerald-400">¥{fmt(monthIncome)}</p>
            </div>
            <div className="bg-[#0F2B46]/80 rounded-xl p-4 border border-[#1a3a5c] text-center">
              <p className="text-xs text-slate-400 mb-1">本月支出</p>
              <p className="text-xl font-bold text-red-400">¥{fmt(monthExpense)}</p>
            </div>
            <div className="bg-[#0F2B46]/80 rounded-xl p-4 border border-[#1a3a5c] text-center">
              <p className="text-xs text-slate-400 mb-1">本月净�?/p>
              <p className={`text-xl font-bold ${monthIncome - monthExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ¥{fmt(Math.abs(monthIncome - monthExpense))}
              </p>
            </div>
          </div>

          {/* Records list */}
          <div className="bg-[#0F2B46]/80 rounded-xl border border-[#1a3a5c]">
            <div className="px-6 py-4 border-b border-[#1a3a5c] flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-300">本月流水记录</h3>
              <span className="text-xs text-slate-500">{monthRecords.length}�?/span>
            </div>
            {monthRecords.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Receipt className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm">本月暂无流水</p>
                <p className="text-slate-500 text-xs mt-1">在上方快速录入每笔收�?/p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50 max-h-96 overflow-y-auto">
                {monthRecords.map(r => (
                  <div key={r.id} className="px-6 py-3 flex items-center gap-4 hover:bg-[#1a3a5c]/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white">{r.category}</span>
                        <span className="text-xs text-slate-500">{r.date}</span>
                      </div>
                      {r.note && <p className="text-xs text-slate-500 mt-0.5 truncate">{r.note}</p>}
                    </div>
                    <span className={`text-sm font-medium whitespace-nowrap ${r.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {r.type === 'income' ? '+' : '-'}¥{fmt(r.amount)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(r)} className="p-1 text-slate-500 hover:text-sky-400 transition-colors" title="编辑">
                        <Receipt className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="p-1 text-slate-500 hover:text-red-400 transition-colors" title="删除">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ── 手动填总额模式 ── */
        <div className="bg-[#0F2B46]/80 rounded-xl p-6 border border-[#1a3a5c] space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-sky-400" />
            手动填写月度总额
          </h2>
          <p className="text-xs text-slate-400">直接填写当月收入和支出总额，数据进入月度盈亏核算，不生成流水记录�?/p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300">收入总额</label>
              <div className="flex items-center">
                <span className="bg-[#1a3a5c] border border-r-0 border-[#0d2a42] rounded-l-lg px-3 py-2 text-emerald-400 text-sm">¥</span>
                <input type="number" inputMode="decimal" value={manualIncome} onChange={(e) => setManualIncome(e.target.value)}
                  placeholder="0" min="0" step="0.01"
                  className="flex-1 bg-[#0F2B46] border border-[#0d2a42] text-white px-3 py-2 text-sm rounded-r-lg focus:border-sky-400 focus:outline-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300">支出总额</label>
              <div className="flex items-center">
                <span className="bg-[#1a3a5c] border border-r-0 border-[#0d2a42] rounded-l-lg px-3 py-2 text-red-400 text-sm">¥</span>
                <input type="number" inputMode="decimal" value={manualExpense} onChange={(e) => setManualExpense(e.target.value)}
                  placeholder="0" min="0" step="0.01"
                  className="flex-1 bg-[#0F2B46] border border-[#0d2a42] text-white px-3 py-2 text-sm rounded-r-lg focus:border-sky-400 focus:outline-none" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleSaveManualTotal} disabled={savingManual}
              className="flex items-center gap-2 px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Save className="w-4 h-4" />
              {savingManual ? '保存�?..' : '保存总额'}
            </button>
            <span className="text-xs text-slate-500">月份：{pnlMonth}</span>
          </div>
        </div>
      )}

      {/* Go to summary */}
      <button onClick={onSwitchToSummary}
        className="flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 transition-colors">
        <BarChart3 className="w-4 h-4" />
        查看月度盈亏汇�?
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
});

/* ── Sub-tab: 月度盈亏汇�?── */
interface SubTabPnlSummaryProps {
  pnl: PnlInputs;
  setPnl: React.Dispatch<React.SetStateAction<PnlInputs>>;
  pnlMonth: string;
  setPnlMonth: React.Dispatch<React.SetStateAction<string>>;
  syncing3: boolean;
  onSync: () => void;
  onPullFromCosts: () => void;
  pnlMode: 'manual' | 'cashflow';
  setPnlMode: (m: 'manual' | 'cashflow') => void;
  cashFlowRecords: CashFlowRecord[];
  onSwitchToCashFlow: () => void;
  selectedPlatform: string;
  setSelectedPlatform: (name: string) => void;
  platformMonthlySales: string;
  setPlatformMonthlySales: (v: string) => void;
  pnlPlatformNote: string;
  setPnlPlatformNote: (v: string) => void;
  onSavePnl: () => void;
  isEnterprise: boolean;
  userRole?: string;
}

const SubTabPnlSummary: FC<SubTabPnlSummaryProps> = memo(function SubTabPnlSummary({
  pnl, setPnl, pnlMonth, setPnlMonth, syncing3, onSync, onPullFromCosts,
  pnlMode, setPnlMode, cashFlowRecords, onSwitchToCashFlow,
  selectedPlatform, setSelectedPlatform, platformMonthlySales, setPlatformMonthlySales,
  pnlPlatformNote, setPnlPlatformNote,
  onSavePnl, isEnterprise, userRole,
}) {
  const { authFetch } = useAuth();
  const hasCashFlow = cashFlowRecords.some(r => r.date.startsWith(pnlMonth));

  // Compute auto-summary from cash flow records
  const autoPnl = useMemo(() => {
    const monthRecords = cashFlowRecords.filter(r => r.date.startsWith(pnlMonth));
    const result: Record<string, number> = {
      totalRevenue: 0, purchaseTotal: 0, adTotal: 0, shippingPackTotal: 0,
      salaryTotal: 0, rentTotal: 0, utilitiesTotal: 0, afterSalesTotal: 0, returnsTotal: 0,
      platformFeeTotal: 0,
    };
    for (const r of monthRecords) {
      const mapping = CATEGORY_PNL_MAP[r.category];
      if (mapping) {
        result[mapping.field] = (result[mapping.field] || 0) + r.amount;
      } else {
        // Unmapped categories: expense→其�? income→收�?
        if (r.type === 'income') {
          result.totalRevenue += r.amount;
        }
        // Unmapped expense categories are silently ignored from PnL
      }
    }
    return result;
  }, [cashFlowRecords, pnlMonth]);

  // Effective PnL values based on mode
  const effectivePnl = useMemo(() => {
    if (pnlMode === 'cashflow') {
      return {
        totalRevenue: String(Math.round(autoPnl.totalRevenue)),
        purchaseTotal: String(Math.round(autoPnl.purchaseTotal)),
        adTotal: String(Math.round(autoPnl.adTotal)),
        shippingPackTotal: String(Math.round(autoPnl.shippingPackTotal)),
        salaryTotal: String(Math.round(autoPnl.salaryTotal)),
        rentTotal: String(Math.round(autoPnl.rentTotal)),
        utilitiesTotal: String(Math.round(autoPnl.utilitiesTotal)),
        afterSalesTotal: String(Math.round(autoPnl.afterSalesTotal)),
        returnsTotal: String(Math.round(autoPnl.returnsTotal)),
        platformFeeTotal: String(Math.round(autoPnl.platformFeeTotal)),
        adROI: pnl.adROI,
      };
    }
    return pnl;
  }, [pnlMode, autoPnl, pnl]);

  const totalExpense =
    num(effectivePnl.purchaseTotal) + num(effectivePnl.adTotal) + num(effectivePnl.shippingPackTotal) +
    num(effectivePnl.salaryTotal) + num(effectivePnl.rentTotal) + num(effectivePnl.utilitiesTotal) +
    num(effectivePnl.afterSalesTotal) + num(effectivePnl.returnsTotal) + num(effectivePnl.platformFeeTotal);
  const totalRevenue = num(effectivePnl.totalRevenue);
  const netPnl = totalRevenue - totalExpense;
  const pnlRate = totalRevenue > 0 ? (netPnl / totalRevenue) * 100 : 0;
  const adROI = num(effectivePnl.adROI);
  const adReturn = num(effectivePnl.adTotal) * adROI;

  const pnlItems = useMemo(() => [
    { label: '进货成本', value: num(effectivePnl.purchaseTotal) },
    { label: '广告投流', value: num(effectivePnl.adTotal) },
    { label: '快�?包装', value: num(effectivePnl.shippingPackTotal) },
    { label: '人工工资', value: num(effectivePnl.salaryTotal) },
    { label: '店铺租金', value: num(effectivePnl.rentTotal) },
    { label: '水电物业', value: num(effectivePnl.utilitiesTotal) },
    { label: '售后理赔', value: num(effectivePnl.afterSalesTotal) },
    { label: '退货亏�?, value: num(effectivePnl.returnsTotal) },
    { label: '平台扣点', value: num(effectivePnl.platformFeeTotal) },
  ], [effectivePnl]);

  const updatePnl = useCallback(<K extends keyof PnlInputs>(key: K, value: PnlInputs[K]) => {
    if (pnlMode === 'cashflow') return; // read-only in cashflow mode
    setPnl(prev => ({ ...prev, [key]: value }));
  }, [setPnl, pnlMode]);

  // Auto-calculate platform fee when platform or monthly sales change (manual mode only)
  const currentPlatformRate = useMemo(() => {
    const p = PRESET_PLATFORMS.find(pp => pp.name === selectedPlatform);
    return p ? p.rate : 0;
  }, [selectedPlatform]);

  useEffect(() => {
    if (pnlMode !== 'manual' || !selectedPlatform) return;
    const sales = num(platformMonthlySales);
    if (sales > 0) {
      const fee = Math.round(sales * currentPlatformRate / 100);
      setPnl(prev => ({ ...prev, platformFeeTotal: String(fee) }));
    }
  }, [selectedPlatform, platformMonthlySales, currentPlatformRate, pnlMode, setPnl]);

  /* ── 经营洞察逻辑 ── */
  const canSeeInsights = userRole === 'admin' || userRole === 'enterprise_admin' || userRole === 'enterprise_manager';

  // 获取上月数据
  const [prevMonthData, setPrevMonthData] = useState<{ totalRevenue: number; totalExpense: number; netProfit: number } | null>(null);
  const [insightsCollapsed, setInsightsCollapsed] = useState(false);

  useEffect(() => {
    if (!canSeeInsights) return;
    const fetchPrevMonth = async () => {
      try {
        if (!pnlMonth) return;
        const [y, m] = pnlMonth.split('-').map(Number);
        let py = y, pm = m - 1;
        if (pm === 0) { py -= 1; pm = 12; }
        const prevMonthStr = `${py}-${String(pm).padStart(2, '0')}`;
        const companyId = localStorage.getItem('current_company_id');
        const res = await authFetch(`/api/business-records?companyId=${companyId}&year=${py}&month=${pm}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            const r = json.data[0];
            setPrevMonthData({
              totalRevenue: r.total_revenue || 0,
              totalExpense: r.total_expense || 0,
              netProfit: r.net_profit || 0,
            });
          } else {
            setPrevMonthData(null);
          }
        }
      } catch { setPrevMonthData(null); }
    };
    fetchPrevMonth();
  }, [pnlMonth, canSeeInsights]);

  // 生成洞察
  const insights = useMemo(() => {
    if (!canSeeInsights || totalRevenue === 0) return [];
    const result: { level: 'red' | 'yellow' | 'green'; icon: React.ReactNode; text: string }[] = [];

    // 1. 收入环比下降>10%
    if (prevMonthData && prevMonthData.totalRevenue > 0) {
      const revChange = ((totalRevenue - prevMonthData.totalRevenue) / prevMonthData.totalRevenue) * 100;
      if (revChange < -10) {
        result.push({
          level: 'red',
          icon: <TrendingUp className="w-4 h-4" />,
          text: `收入环比下降${Math.abs(revChange).toFixed(1)}%，建议检查是否进入淡季或促销力度不足`,
        });
      } else if (revChange > 10) {
        result.push({
          level: 'green',
          icon: <TrendingUp className="w-4 h-4" />,
          text: `收入环比增长${revChange.toFixed(1)}%，经营态势良好`,
        });
      }
    }

    // 2. 成本占比>70%
    const costRatio = totalRevenue > 0 ? (totalExpense / totalRevenue) * 100 : 0;
    if (costRatio > 70) {
      result.push({
        level: 'red',
        icon: <AlertTriangle className="w-4 h-4" />,
        text: `成本占比${costRatio.toFixed(1)}%，高于健康线70%，建议重点优化售后赔付和物流成本`,
      });
    }

    // 3. 利润�?15%
    if (pnlRate < 15 && pnlRate >= 0) {
      result.push({
        level: 'yellow',
        icon: <AlertTriangle className="w-4 h-4" />,
        text: `利润�?{pnlRate.toFixed(1)}%，低于行业健康�?5%，建议查看成本预警模块排查异常`,
      });
    }

    // 4. 售后赔付占成�?30%
    const afterSalesTotal = num(effectivePnl.afterSalesTotal);
    const afterSalesRatio = totalExpense > 0 ? (afterSalesTotal / totalExpense) * 100 : 0;
    if (afterSalesRatio > 30) {
      result.push({
        level: 'red',
        icon: <AlertTriangle className="w-4 h-4" />,
        text: `售后赔付占成�?{afterSalesRatio.toFixed(1)}%，是主要成本来源，建议加强质检减少误判`,
      });
    }

    // 5. 连续2月亏�?
    if (prevMonthData && prevMonthData.netProfit < 0 && netPnl < 0) {
      result.push({
        level: 'red',
        icon: <AlertTriangle className="w-4 h-4" />,
        text: `连续2月亏损，建议立即复盘SOP和人员效率`,
      });
    }

    // 如果一切正�?
    if (result.length === 0 && netPnl > 0) {
      result.push({
        level: 'green',
        icon: <CheckCircle className="w-4 h-4" />,
        text: `本月经营健康，净利润�?{pnlRate.toFixed(1)}%，继续保持`,
      });
    }

    return result;
  }, [canSeeInsights, totalRevenue, totalExpense, netPnl, pnlRate, effectivePnl, prevMonthData]);

  const levelColors = {
    red: { bg: 'bg-red-900/20', border: 'border-red-700/40', text: 'text-red-400', icon: 'text-red-400' },
    yellow: { bg: 'bg-amber-900/20', border: 'border-amber-700/40', text: 'text-amber-400', icon: 'text-amber-400' },
    green: { bg: 'bg-emerald-900/20', border: 'border-emerald-700/40', text: 'text-emerald-400', icon: 'text-emerald-400' },
  };

  return (
    <div className="space-y-6">
      <PageHint text="每月赚了还是亏了——收入减支出，真实利润清清楚楚�? />

      {/* 经营洞察卡片 */}
      {canSeeInsights && insights.length > 0 && (
        <div className={`rounded-xl border ${insightsCollapsed ? 'border-[#1a3a5c]' : 'border-[#1a3a5c] bg-[#0F2B46]/60'}`}>
          <button
            onClick={() => setInsightsCollapsed(!insightsCollapsed)}
            className="w-full flex items-center justify-between px-5 py-3.5"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-semibold text-white">经营洞察</span>
              <span className="text-xs text-slate-400">基于当月数据自动生成</span>
            </div>
            {insightsCollapsed ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {!insightsCollapsed && (
            <div className="px-5 pb-4 space-y-2">
              {insights.map((insight, i) => {
                const colors = levelColors[insight.level];
                return (
                  <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-lg ${colors.bg} border ${colors.border}`}>
                    <span className={`mt-0.5 ${colors.icon}`}>{insight.icon}</span>
                    <p className={`text-sm ${colors.text} leading-relaxed`}>{insight.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Month selector + Mode toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-300">核算月份</label>
          <input type="month" value={pnlMonth} onChange={(e) => setPnlMonth(e.target.value)}
            className="bg-[#0F2B46] border border-[#0d2a42] text-white rounded-lg px-3 py-1.5 text-sm focus:border-sky-400 focus:outline-none" />
        </div>
        <div className="flex items-center gap-1 bg-[#0F2B46] rounded-lg p-0.5 border border-[#1a3a5c]">
          <button onClick={() => setPnlMode('cashflow')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${pnlMode === 'cashflow' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'}`}>
            流水汇�?
          </button>
          <button onClick={() => setPnlMode('manual')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${pnlMode === 'manual' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'}`}>
            手动填总额
          </button>
        </div>
        <span className="text-xs text-slate-500">
          当前模式：{pnlMode === 'cashflow' ? '流水汇�? : '手动填总额'}
        </span>
      </div>

      {/* Empty month tip */}
      {!hasCashFlow && pnlMode === 'cashflow' && (
        <div className="flex items-center gap-3 bg-sky-900/20 border border-sky-700/30 rounded-lg px-4 py-3 text-sm">
          <span className="text-sky-300">📊 本月尚未录入流水，可</span>
          <button onClick={onSwitchToCashFlow} className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
            极简录入1�?
          </button>
          <span className="text-sky-300/70">，或直接</span>
          <button onClick={() => setPnlMode('manual')} className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
            填写总额
          </button>
        </div>
      )}

      {/* Revenue */}
      <div className="bg-[#0F2B46]/80 rounded-xl p-6 border border-[#1a3a5c] space-y-4">
        <h2 className="text-lg font-semibold text-white">月度收入</h2>
        <InputField label="月度总销售额" value={effectivePnl.totalRevenue} onChange={(v) => updatePnl('totalRevenue', v)} prefix="¥" readOnly={pnlMode === 'cashflow'} />
      </div>

      {/* Expenses */}
      <div className="bg-[#0F2B46]/80 rounded-xl p-6 border border-[#1a3a5c] space-y-4">
        <h2 className="text-lg font-semibold text-white">月度实际支出</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="月度总进货成�? value={effectivePnl.purchaseTotal} onChange={(v) => updatePnl('purchaseTotal', v)} prefix="¥" readOnly={pnlMode === 'cashflow'} />
          <InputField label="月度实际广告投流�? value={effectivePnl.adTotal} onChange={(v) => updatePnl('adTotal', v)} prefix="¥" readOnly={pnlMode === 'cashflow'} />
          <InputField label="月度实际快�?包装总成�? value={effectivePnl.shippingPackTotal} onChange={(v) => updatePnl('shippingPackTotal', v)} prefix="¥" readOnly={pnlMode === 'cashflow'} />
          <InputField label="月度实际人工工资" value={effectivePnl.salaryTotal} onChange={(v) => updatePnl('salaryTotal', v)} prefix="¥" readOnly={pnlMode === 'cashflow'} />
          <InputField label="月度实际租金" value={effectivePnl.rentTotal} onChange={(v) => updatePnl('rentTotal', v)} prefix="¥" readOnly={pnlMode === 'cashflow'} />
          <InputField label="水电物业杂项" value={effectivePnl.utilitiesTotal} onChange={(v) => updatePnl('utilitiesTotal', v)} prefix="¥" readOnly={pnlMode === 'cashflow'} />
          <div className="flex items-end gap-2">
            <div className="flex-1"><InputField label="实际售后理赔支出" value={effectivePnl.afterSalesTotal} onChange={(v) => updatePnl('afterSalesTotal', v)} prefix="¥" readOnly={pnlMode === 'cashflow'} /></div>
            {pnlMode === 'manual' && (
              <>
                <button onClick={onSync} disabled={syncing3} className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors pb-2 whitespace-nowrap disabled:opacity-50">
                  <RefreshCw className={`h-3 w-3 ${syncing3 ? 'animate-spin' : ''}`} />
                  {syncing3 ? '同步�? : '同步实际'}
                </button>
                <button onClick={onPullFromCosts} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors pb-2 whitespace-nowrap">
                  <ArrowRight className="h-3 w-3 rotate-180" />
                  从公共成本拉�?
                </button>
              </>
            )}
          </div>
          <InputField label="实际退货亏�? value={effectivePnl.returnsTotal} onChange={(v) => updatePnl('returnsTotal', v)} prefix="¥" readOnly={pnlMode === 'cashflow'} />
          <InputField label="平台扣点费用" value={effectivePnl.platformFeeTotal} onChange={(v) => updatePnl('platformFeeTotal', v)} prefix="¥" readOnly={pnlMode === 'cashflow'} />
        </div>
        {/* Platform auto-calc section (manual mode) */}
        {pnlMode === 'manual' && (
          <div className="mt-4 pt-4 border-t border-[#1a3a5c]/50 space-y-3">
            <p className="text-xs text-slate-400">快速计算：选择经营平台 + 填入月销售额，自动算出平台扣点费�?/p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <PlatformSelect
                value={selectedPlatform}
                onChange={(name, rate, note) => {
                  setSelectedPlatform(name);
                  setPnlPlatformNote(note || '');
                }}
              />
              {pnlPlatformNote && (
                <p className="text-xs text-sky-400/70 mt-1">{pnlPlatformNote}</p>
              )}
              <InputField label="该平台月度销售额" value={platformMonthlySales} onChange={setPlatformMonthlySales} prefix="¥" />
              <div className="space-y-1.5">
                <label className="text-sm text-slate-300">自动算出扣点</label>
                <div className="bg-[#0a1f33] border border-[#0d2a42] rounded-lg px-3 py-2 text-sm">
                  <span className="text-amber-400 font-semibold">
                    {selectedPlatform && num(platformMonthlySales) > 0
                      ? `¥${fmt(num(platformMonthlySales) * currentPlatformRate / 100)}`
                      : '�?}
                  </span>
                  {selectedPlatform && num(platformMonthlySales) > 0 && (
                    <span className="text-slate-500 text-xs ml-2">({currentPlatformRate}%)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="pt-2">
          <InputField label="广告实际ROI投产比（选填，如3.5表示�?�?.5�? value={effectivePnl.adROI} onChange={(v) => updatePnl('adROI', v)} suffix="�? readOnly={pnlMode === 'cashflow'} />
        </div>
      </div>

      {/* PnL Result */}
      <div className={`rounded-xl p-6 border ${
        netPnl > 0 ? 'bg-emerald-900/20 border-emerald-700/40' :
        netPnl < 0 ? 'bg-red-900/20 border-red-700/40' :
        'bg-[#0F2B46]/80 border-[#1a3a5c]'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          {netPnl > 0 ? (
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          ) : netPnl < 0 ? (
            <AlertTriangle className="w-6 h-6 text-red-400" />
          ) : (
            <Minus className="w-6 h-6 text-yellow-400" />
          )}
          <span className={`text-sm font-medium ${
            netPnl > 0 ? 'text-emerald-400' : netPnl < 0 ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {netPnl > 0 ? '盈利' : netPnl < 0 ? '亏损' : '持平'}
          </span>
        </div>
        <p className="text-slate-300 text-sm mb-1">月度净利润</p>
        <p className={`text-4xl font-bold ${
          netPnl > 0 ? 'text-emerald-400' : netPnl < 0 ? 'text-red-400' : 'text-yellow-400'
        }`}>
          ¥{fmt(Math.abs(netPnl))}
        </p>
        <div className="flex items-center gap-4 mt-3">
          <span className="text-slate-400 text-sm">净利润�?/span>
          <span className={`text-lg font-semibold ${
            pnlRate > 0 ? 'text-emerald-400' : pnlRate < 0 ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {pnlRate.toFixed(1)}%
          </span>
        </div>
        {adROI > 0 && (
          <div className="mt-3 pt-3 border-t border-[#1a3a5c]/50">
            <span className="text-slate-400 text-sm">广告投入产出�?/span>
            <span className="text-sky-400 font-semibold ml-2">¥{fmt(adReturn)}</span>
            <span className="text-slate-500 text-xs ml-2">（投流¥{fmt(num(effectivePnl.adTotal))} × {adROI}倍ROI�?/span>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button onClick={onSavePnl}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-[#0F2B46] hover:bg-[#1a3a5c] text-white transition-colors">
          <Save className="w-4 h-4" />
          保存月度数据
          {isEnterprise && <span className="text-xs text-sky-200 ml-1">(同步云端)</span>}
        </button>
      </div>

      {/* Expense Breakdown */}
      {totalExpense > 0 && (
        <div className="bg-[#0F2B46]/80 rounded-xl p-6 border border-[#1a3a5c]">
          <h3 className="text-sm font-medium text-slate-300 mb-4">支出明细占比</h3>
          <div className="space-y-3">
            {pnlItems.map((item) => {
              const pct = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="text-slate-300">¥{fmt(item.value)} <span className="text-slate-500">({pct.toFixed(1)}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-[#1a3a5c] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500/70 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-[#1a3a5c] flex justify-between text-sm font-medium">
            <span className="text-slate-300">月度总支�?/span>
            <span className="text-white">¥{fmt(totalExpense)}</span>
          </div>
        </div>
      )}
    </div>
  );
});

/* ── Main Page ── */
export default function BusinessToolsPage() {
  const { profile, authFetch: authFetchCtx } = useAuth();
  const isPersonal = profile?.role === 'personal_user' || profile?.role === 'staff';

  const [tab, setTab] = useState(0);
  const [subTab, setSubTab] = useState(0); // 0=出纳收支, 1=月度盈亏
  const [costs, setCosts] = useState<PublicCosts>(defaultCosts);
  const [pricing, setPricing] = useState<PricingInputs>(defaultPricing);
  const [pnl, setPnl] = useState<PnlInputs>(defaultPnl);
  const [syncing1, setSyncing1] = useState(false);
  const [syncing3, setSyncing3] = useState(false);
  const [pnlMonth, setPnlMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [pnlMode, setPnlMode] = useState<'manual' | 'cashflow'>(() => {
    if (typeof window === 'undefined') return 'manual';
    return (localStorage.getItem(PNL_MODE_KEY) as 'manual' | 'cashflow') || 'manual';
  });
  const [cashFlowRecords, setCashFlowRecords] = useState<CashFlowRecord[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [platformNote, setPlatformNote] = useState('');
  const [platformAutoFilled, setPlatformAutoFilled] = useState(false);
  const [platformMonthlySales, setPlatformMonthlySales] = useState('');
  const [pnlPlatformNote, setPnlPlatformNote] = useState('');

  /* ── Auth fetch helper ── */
  const authFetch = authFetchCtx;

  /* ── Load data: Supabase优先，降级localStorage ── */
  useEffect(() => {
    // 先从localStorage即时加载
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCosts(JSON.parse(saved));
    } catch { /* ignore */ }
    try {
      const saved = localStorage.getItem(CASH_FLOW_KEY);
      if (saved) setCashFlowRecords(JSON.parse(saved));
    } catch { /* ignore */ }
    // 再从Supabase加载覆盖（优先）
    const loadFromSupabase = async () => {
      if (!authFetch || !profile?.companyId) return;
      try {
        const [yearStr, monthStr] = pnlMonth.split('-');
        const res = await authFetch(`/api/business-records?companyId=${profile.companyId}&year=${yearStr}&month=${parseInt(monthStr)}`);
        if (res.ok) {
          const result = await res.json();
          const records = (result.data || []) as Record<string, unknown>[];
          if (records.length > 0) {
            const r = records[0]; // 取最新月�?
            const cloudCosts: PublicCosts = {
              ...costs,
              rent: String(r.fixed_rent || costs.rent),
              salary: String(r.fixed_salary || costs.salary),
              utilities: String(r.fixed_utilities || costs.utilities),
              afterSales: String(r.fixed_after_sales || costs.afterSales),
              returns: String(r.fixed_returns || costs.returns),
              monthlyOrders: String(r.monthly_orders || costs.monthlyOrders),
            };
            setCosts(cloudCosts);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudCosts));
          }
        }
      } catch { /* ignore, localStorage already loaded */ }
    };
    loadFromSupabase();
  }, []);

  /* ── Persist pnl mode ── */
  useEffect(() => {
    localStorage.setItem(PNL_MODE_KEY, pnlMode);
  }, [pnlMode]);

  const handleSyncAfterSales = useCallback(async (target: 'tab1' | 'tab3') => {
    const setter = target === 'tab1' ? setSyncing1 : setSyncing3;
    setter(true);
    try {
      const companyId = typeof window !== 'undefined' ? localStorage.getItem('current_company_id') : null;
      const month = target === 'tab3' ? pnlMonth : new Date().toISOString().slice(0, 7);
      const res = await authFetch(`/api/cost-records?companyId=${companyId}&month=${month}`);
      const json = await res.json();
      if (json.records && Array.isArray(json.records)) {
        const total = json.records.reduce((sum: number, r: { total_cost: number | string }) => sum + parseFloat(String(r.total_cost)), 0);
        if (target === 'tab1') {
          setCosts(prev => ({ ...prev, afterSales: String(Math.round(total)) }));
        } else {
          setPnl(prev => ({ ...prev, afterSalesTotal: String(Math.round(total)) }));
        }
        toast.success(`已同�?{month}售后成本: ¥${Math.round(total)}`);
      } else {
        toast.error('同步失败，请稍后重试');
      }
    } catch {
      toast.error('同步失败，请检查网�?);
    } finally {
      setter(false);
    }
  }, [authFetch, pnlMonth]);

  /* ── Pull costs from Tab1 to Tab3 PnL ── */
  const handlePullFromCosts = useCallback(() => {
    setPnl(prev => ({
      ...prev,
      salaryTotal: costs.salary || prev.salaryTotal,
      rentTotal: costs.rent || prev.rentTotal,
      utilitiesTotal: costs.utilities || prev.utilitiesTotal,
      afterSalesTotal: costs.afterSales || prev.afterSalesTotal,
      returnsTotal: costs.returns || prev.returnsTotal,
    }));
    toast.success('已从公共成本设置拉取数据');
  }, [costs, setPnl]);

  /* ── Sync to Supabase (flagship only) ── */
  const isEnterprise = profile?.companyPlan === 'enterprise' || profile?.role === 'admin';

  const syncToSupabase = useCallback(async (pnlData: PnlInputs, costsData: PublicCosts, month: string) => {
    try {
      const companyId = profile?.companyId || (typeof window !== 'undefined' ? localStorage.getItem('current_company_id') : null);
      if (!companyId) return;
      const [yearStr, monthStr] = month.split('-');
      const purchaseTotal = num(pnlData.purchaseTotal);
      const adTotal = num(pnlData.adTotal);
      const shippingPackTotal = num(pnlData.shippingPackTotal);
      const salaryTotal = num(pnlData.salaryTotal);
      const rentTotal = num(pnlData.rentTotal);
      const utilitiesTotal = num(pnlData.utilitiesTotal);
      const afterSalesTotal = num(pnlData.afterSalesTotal);
      const returnsTotal = num(pnlData.returnsTotal);
      const platformFeeTotal = num(pnlData.platformFeeTotal);
      const totalRevenue = num(pnlData.totalRevenue);
      const totalExpense = purchaseTotal + adTotal + shippingPackTotal + salaryTotal + rentTotal + utilitiesTotal + afterSalesTotal + returnsTotal + platformFeeTotal;
      const netProfit = totalRevenue - totalExpense;

      await authFetch('/api/business-records', {
        method: 'POST',
        body: JSON.stringify({
          company_id: companyId,
          year: Number(yearStr),
          month: Number(monthStr),
          total_revenue: totalRevenue,
          purchase_total: purchaseTotal,
          ad_total: adTotal,
          shipping_pack_total: shippingPackTotal,
          salary_total: salaryTotal,
          rent_total: rentTotal,
          utilities_total: utilitiesTotal,
          after_sales_total: afterSalesTotal,
          returns_total: returnsTotal,
          platform_fee_total: platformFeeTotal,
          total_expense: totalExpense,
          net_profit: netProfit,
          ad_roi: num(pnlData.adROI),
          fixed_rent: num(costsData.rent),
          fixed_salary: num(costsData.salary),
          fixed_utilities: num(costsData.utilities),
          fixed_after_sales: num(costsData.afterSales),
          fixed_returns: num(costsData.returns),
          monthly_orders: num(costsData.monthlyOrders),
        }),
      });
    } catch {
      // 静默失败，不影响本地保存
    }
  }, [authFetch, profile?.companyId]);

  const saveCosts = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(costs));
      toast.success('公共成本设置已保�?);
      // 旗舰版同步到Supabase
      syncToSupabase(pnl, costs, pnlMonth);
    } catch {
      toast.error('保存失败');
    }
  }, [costs, pnl, pnlMonth, syncToSupabase]);

  const savePnlData = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(costs));
      // 旗舰版同步到Supabase
      syncToSupabase(pnl, costs, pnlMonth);
      toast.success('月度盈亏数据已保�?);
    } catch {
      toast.error('保存失败');
    }
  }, [costs, pnl, pnlMonth, syncToSupabase]);

  const monthlyOrders = num(costs.monthlyOrders);
  const totalFixedCosts = num(costs.rent) + num(costs.salary) + num(costs.utilities) + num(costs.afterSales) + num(costs.returns);
  const perOrderFixed = monthlyOrders > 0 ? totalFixedCosts / monthlyOrders : 0;

  /* ── CSV Export ── */
  const handleExport = useCallback(() => {
    let csv = '';
    let filename = '';

    if (tab === 0) {
      csv = '项目,金额\n';
      csv += `每月店铺租金,${costs.rent || 0}\n`;
      csv += `每月全员人工总工�?${costs.salary || 0}\n`;
      csv += `每月水电物业网络杂费,${costs.utilities || 0}\n`;
      csv += `每月售后预估总成�?${costs.afterSales || 0}\n`;
      csv += `每月退货预估亏�?${costs.returns || 0}\n`;
      csv += `预估每月订单�?${costs.monthlyOrders || 0}\n`;
      filename = `公共成本_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (tab === 2 && subTab === 0) {
      csv = '日期,分类,类型,金额,备注\n';
      for (const r of cashFlowRecords) {
        csv += `${r.date},${r.category},${r.type === 'income' ? '收入' : '支出'},${r.amount},${r.note || ''}\n`;
      }
      filename = `出纳流水_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (tab === 2 && subTab === 1) {
      csv = '项目,金额\n';
      csv += `核算月份,${pnlMonth}\n`;
      csv += `月度总销售额,${pnl.totalRevenue}\n`;
      csv += `月度总进货成�?${pnl.purchaseTotal}\n`;
      csv += `月度实际广告投流�?${pnl.adTotal}\n`;
      csv += `月度快递包装总成�?${pnl.shippingPackTotal}\n`;
      csv += `月度实际人工工资,${pnl.salaryTotal}\n`;
      csv += `月度实际租金,${pnl.rentTotal}\n`;
      csv += `水电物业杂项,${pnl.utilitiesTotal}\n`;
      csv += `实际售后理赔支出,${pnl.afterSalesTotal}\n`;
      csv += `实际退货亏�?${pnl.returnsTotal}\n`;
      csv += `平台扣点费用,${pnl.platformFeeTotal}\n`;
      csv += `广告ROI,${pnl.adROI}\n`;
      filename = `月度盈亏_${pnlMonth}.csv`;
    }

    if (csv) {
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('导出成功');
    }
  }, [tab, subTab, costs, cashFlowRecords, pnl, pnlMonth]);

  /* ── CSV Import (出纳流水) ── */
  const fileInputRef = useCallback((input: HTMLInputElement | null) => {
    if (input) {
      (window as unknown as Record<string, unknown>).__importRef = input;
    }
  }, []);

  const handleImport = useCallback(() => {
    if (tab !== 2 || subTab !== 0) {
      toast.error('仅支持在出纳收支登记页面导入');
      return;
    }
    const ref = (window as unknown as Record<string, unknown>).__importRef as HTMLInputElement | null;
    if (ref) ref.click();
  }, [tab, subTab]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          toast.error('CSV文件内容为空');
          return;
        }

        const imported: CashFlowRecord[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          if (cols.length < 4) continue;

          const date = cols[0]?.trim();
          const category = cols[1]?.trim();
          const typeStr = cols[2]?.trim();
          const amount = parseFloat(cols[3]?.trim());
          const note = cols.slice(4).join(',').trim();

          if (!date || !category || isNaN(amount)) continue;

          const type: 'income' | 'expense' = typeStr === '收入' ? 'income' : 'expense';
          imported.push({
            id: `import-${Date.now()}-${i}`,
            date,
            category,
            amount,
            type,
            note,
            createdBy: 'import',
          });
        }

        if (imported.length === 0) {
          toast.error('未解析到有效流水记录');
          return;
        }

        const merged = [...cashFlowRecords, ...imported];
        setCashFlowRecords(merged);
        localStorage.setItem(CASH_FLOW_KEY, JSON.stringify(merged));
        toast.success(`成功导入 ${imported.length} 条流水记录`);
      } catch {
        toast.error('CSV解析失败，请检查文件格�?);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [cashFlowRecords]);

  const tabs = useMemo(() => [
    { label: '公共成本设置', icon: <Settings className="w-4 h-4" /> },
    { label: '商品定价计算�?, icon: <Calculator className="w-4 h-4" /> },
    { label: '月度盈亏核算', icon: <TrendingUp className="w-4 h-4" /> },
  ], []);

  const pnlSubTabs = useMemo(() => [
    { label: '出纳收支登记', icon: <Receipt className="w-4 h-4" /> },
    { label: '月度盈亏汇�?, icon: <BarChart3 className="w-4 h-4" /> },
  ], []);



  return (
    <div className="min-h-screen bg-[#0a1f33] p-4 md:p-8">
      <OnboardingGuide
        guideKey="business-tools-guide"
        steps={[
          { title: '录入团队月固定成�?, description: '在公共成本设置中添加客服人均月成本等固定支出' },
          { title: '录入退�?赔付均单成本', description: '添加退货运费均单、售后赔付均单等变动成本' },
          { title: '保存后即可使用定价计算器', description: '成本数据会自动同步到定价计算器和盈亏核算' },
        ]}
      />
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">经营工具�?/h1>
            <p className="text-slate-400 text-sm mt-1">算清每一笔账，让经营有据可依</p>
            <div className="mt-2"><PageHint>算清每一笔账——成本、定价、盈亏、出纳，老板自己心里有数�?/PageHint></div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#0F2B46] hover:bg-[#1a3a5c] border border-[#0d2a42] rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              导出
            </button>
            <button
              onClick={handleImport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#0F2B46] hover:bg-[#1a3a5c] border border-[#0d2a42] rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              导入
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#1a3a5c] pb-0">
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === i
                  ? 'border-sky-400 text-sky-400 bg-sky-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {tab === 0 && (
          <TabPublicCosts
            costs={costs}
            setCosts={setCosts}
            syncing1={syncing1}
            onSync={() => handleSyncAfterSales('tab1')}
            onSave={saveCosts}
          />
        )}
        {tab === 1 && (
          <TabPricingCalc
            pricing={pricing}
            setPricing={setPricing}
            perOrderFixed={perOrderFixed}
            selectedPlatform={selectedPlatform}
            setSelectedPlatform={setSelectedPlatform}
            platformNote={platformNote}
            setPlatformNote={setPlatformNote}
            platformAutoFilled={platformAutoFilled}
            setPlatformAutoFilled={setPlatformAutoFilled}
          />
        )}
        {tab === 2 && (
          <div className="space-y-4">
            {/* Sub-tabs for PnL */}
            <div className="flex gap-1 bg-[#0F2B46]/50 rounded-lg p-1 border border-[#1a3a5c]/50">
              {pnlSubTabs.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setSubTab(i)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md transition-colors flex-1 justify-center ${
                    subTab === i
                      ? 'bg-[#1a3a5c] text-sky-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a3a5c]/50'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {subTab === 0 && (
              <SubTabCashFlow
                records={cashFlowRecords}
                setRecords={setCashFlowRecords}
                pnlMonth={pnlMonth}
                onSwitchToSummary={() => setSubTab(1)}
              />
            )}
            {subTab === 1 && (
              <SubTabPnlSummary
                pnl={pnl}
                setPnl={setPnl}
                pnlMonth={pnlMonth}
                setPnlMonth={setPnlMonth}
                syncing3={syncing3}
                onSync={() => handleSyncAfterSales('tab3')}
                onPullFromCosts={handlePullFromCosts}
                pnlMode={pnlMode}
                setPnlMode={setPnlMode}
                cashFlowRecords={cashFlowRecords}
                onSwitchToCashFlow={() => setSubTab(0)}
                selectedPlatform={selectedPlatform}
                setSelectedPlatform={setSelectedPlatform}
                platformMonthlySales={platformMonthlySales}
                setPlatformMonthlySales={setPlatformMonthlySales}
                pnlPlatformNote={pnlPlatformNote}
                setPnlPlatformNote={setPnlPlatformNote}
                onSavePnl={savePnlData}
                isEnterprise={isEnterprise}
                userRole={profile?.role}
              />
            )}
          </div>
        )}

      </div>
    </div>
  );
}
