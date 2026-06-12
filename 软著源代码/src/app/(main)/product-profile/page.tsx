'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Package, CheckCircle2, AlertCircle, Loader2, Save, Sparkles } from 'lucide-react';

/* ============ Constants ============ */
const CATEGORIES = ['智能马桶', '普通马�?, '花洒', '浴室�?, '其他'];
const PRICE_RANGES = [
  { value: 'economy', label: '经济�?¥100-500', icon: '💰' },
  { value: 'mid', label: '中端 ¥500-2000', icon: '💎' },
  { value: 'high', label: '高端 ¥2000+', icon: '👑' },
];
const PLATFORMS = ['淘宝', '京东', '拼多�?, '抖音', '快手', '小红�?, '其他'];
const TEAM_SIZES = [
  { value: 1, label: '1�? },
  { value: 2, label: '2�? },
  { value: 3, label: '3-5�? },
  { value: 6, label: '5�?' },
];
const DAILY_CONSULT = ['50以下', '50-100', '100-200', '200+'];
const PAIN_POINTS = ['差评处理', '退换货纠纷', '安装投诉', '物流催单', '价格�?, '客服效率', '新人培训', '售后成本'];
const SUPPLY_TYPES = [
  { value: 'factory', label: '自有工厂', icon: '🏭' },
  { value: 'oem', label: '贴牌代工', icon: '📦' },
  { value: 'dealer', label: '经销代理', icon: '🤝' },
];
const RETURN_POLICIES = [
  { value: '7days', label: '7天无理由' },
  { value: '15days', label: '15天无理由' },
  { value: '30days', label: '30天无理由' },
  { value: 'none', label: '不支持无理由' },
];

interface ProfileData {
  brand_name: string;
  categories: string[];
  price_range: string;
  platforms: string[];
  team_size: number;
  daily_consultations: string;
  pain_points: string[];
  supply_type: string;
  install_service: boolean;
  return_policy: string;
  profile_completed: boolean;
}

const DEFAULT_PROFILE: ProfileData = {
  brand_name: '',
  categories: [],
  price_range: '',
  platforms: [],
  team_size: 0,
  daily_consultations: '',
  pain_points: [],
  supply_type: '',
  install_service: false,
  return_policy: '',
  profile_completed: false,
};

/* ============ Multi-Select Tag Component ============ */
function MultiSelect({ options, selected, onChange, max }: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  max?: number;
}) {
  const toggle = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else if (!max || selected.length < max) {
      onChange([...selected, item]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        const isDisabled = !isSelected && max !== undefined && selected.length >= max;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            disabled={isDisabled}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              isSelected
                ? 'bg-blue-900 text-white shadow-sm'
                : isDisabled
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-gray-100 text-gray-600 hover:bg-sky-50 hover:text-blue-900'
            }`}
          >
            {opt}
          </button>
        );
      })}
      {max && (
        <span className="text-xs text-gray-400 self-center ml-1">
          最多选{max}项（已选{selected.length}�?
        </span>
      )}
    </div>
  );
}

/* ============ Single Select Card ============ */
function SingleSelect<T extends string | number>({ options, selected, onChange, labelFn }: {
  options: { value: T; label: string; icon?: string }[];
  selected: T;
  onChange: (v: T) => void;
  labelFn?: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
              isSelected
                ? 'border-sky-400 bg-sky-50 text-blue-950 shadow-sm'
                : 'border-gray-200 bg-white text-gray-600 hover:border-sky-100 hover:bg-sky-50/50'
            }`}
          >
            {opt.icon && <span className="mr-1">{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ============ Main Page ============ */
export default function ProductProfilePage() {
  const { profile, authFetch } = useAuth();
  const companyId = profile?.companyId ?? '';
  const [form, setForm] = useState<ProfileData>(DEFAULT_PROFILE);
  const [original, setOriginal] = useState<ProfileData>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    fetchProfile();
  }, [companyId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/product-profile?companyId=${companyId}`);
      const json = await res.json();
      if (json.data) {
        const d = json.data;
        const loaded: ProfileData = {
          brand_name: d.brand_name ?? '',
          categories: typeof d.categories === 'string' ? JSON.parse(d.categories || '[]') : (d.categories || []),
          price_range: d.price_range ?? '',
          platforms: typeof d.platforms === 'string' ? JSON.parse(d.platforms || '[]') : (d.platforms || []),
          team_size: d.team_size ?? 0,
          daily_consultations: d.daily_consultations ?? '',
          pain_points: typeof d.pain_points === 'string' ? JSON.parse(d.pain_points || '[]') : (d.pain_points || []),
          supply_type: d.supply_type ?? '',
          install_service: d.install_service ?? false,
          return_policy: d.return_policy ?? '',
          profile_completed: d.profile_completed ?? false,
        };
        setForm(loaded);
        setOriginal(loaded);
      }
    } catch {
      setError('加载档案失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!companyId) return;
    if (!form.brand_name.trim()) { setError('请填写品牌名�?); return; }
    if (form.categories.length === 0) { setError('请至少选择一个主营品�?); return; }
    if (!form.price_range) { setError('请选择价格�?); return; }

    setSaving(true);
    setError('');
    try {
      const res = await authFetch('/api/product-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          brand_name: form.brand_name,
          categories: JSON.stringify(form.categories),
          price_range: form.price_range,
          platforms: JSON.stringify(form.platforms),
          team_size: form.team_size,
          daily_consultations: form.daily_consultations,
          pain_points: JSON.stringify(form.pain_points),
          supply_type: form.supply_type,
          install_service: form.install_service,
          return_policy: form.return_policy,
          profile_completed: true,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setForm((prev) => ({ ...prev, profile_completed: true }));
      setOriginal((prev) => ({ ...prev, profile_completed: true }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const isEdited = JSON.stringify(form) !== JSON.stringify(original);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    );
  }

  const isNew = !form.profile_completed;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-slate-50 rounded-2xl p-6 border border-sky-50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-900 flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {isNew ? '完善你的产品档案，让AI更懂�? : '产品档案'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isNew
                ? '填写一次，AI问题解决器将根据你的档案个性化推荐话术和方�?
                : '已完善档案，AI已根据你的产品信息优化推�?}
            </p>
          </div>
        </div>
        {saved && (
          <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2 text-sm">
            <Sparkles className="w-4 h-4" />
            AI已根据你的档案优化话术推�?
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Section 1: Basic Info */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center font-bold">1</span>
          基本信息
        </h2>
        <div className="space-y-5">
          {/* Brand Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              品牌名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.brand_name}
              onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
              placeholder="输入你的品牌或店铺名�?
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
            />
          </div>
          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              主营品类 <span className="text-red-500">*</span>
            </label>
            <MultiSelect
              options={CATEGORIES}
              selected={form.categories}
              onChange={(v) => setForm({ ...form, categories: v })}
            />
          </div>
          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              价格�?<span className="text-red-500">*</span>
            </label>
            <SingleSelect
              options={PRICE_RANGES}
              selected={form.price_range}
              onChange={(v) => setForm({ ...form, price_range: v })}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Business Info */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center font-bold">2</span>
          经营信息
        </h2>
        <div className="space-y-5">
          {/* Platforms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">销售平�?/label>
            <MultiSelect options={PLATFORMS} selected={form.platforms} onChange={(v) => setForm({ ...form, platforms: v })} />
          </div>
          {/* Team Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">团队规模</label>
            <SingleSelect
              options={TEAM_SIZES}
              selected={form.team_size}
              onChange={(v) => setForm({ ...form, team_size: v })}
            />
            {form.team_size <= 2 && form.team_size > 0 && (
              <p className="text-xs text-blue-900 mt-1.5 bg-sky-50 px-2 py-1 rounded">
                👤 1人团�?�?个人版（AI学习助手模式�?
              </p>
            )}
            {form.team_size >= 3 && (
              <p className="text-xs text-blue-600 mt-1.5 bg-blue-50 px-2 py-1 rounded">
                👥 3�?团队 �?专业版（团队管理模式�?
              </p>
            )}
          </div>
          {/* Daily Consultations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">日均咨询�?/label>
            <SingleSelect
              options={DAILY_CONSULT.map((d) => ({ value: d, label: d }))}
              selected={form.daily_consultations}
              onChange={(v) => setForm({ ...form, daily_consultations: v })}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Pain Points */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center font-bold">3</span>
          最头疼的问�?
        </h2>
        <MultiSelect
          options={PAIN_POINTS}
          selected={form.pain_points}
          onChange={(v) => setForm({ ...form, pain_points: v })}
          max={3}
        />
        {form.pain_points.length > 0 && (
          <div className="mt-3 bg-sky-50 rounded-lg px-3 py-2 text-sm text-blue-950">
            💡 AI将优先针对这些问题优化话术推�?
          </div>
        )}
      </div>

      {/* Section 4: Product Details (Optional) */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gray-400 text-white text-xs flex items-center justify-center font-bold">4</span>
          产品特点
          <span className="text-xs text-gray-400 font-normal">（选填�?/span>
        </h2>
        <div className="space-y-5">
          {/* Supply Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">供应链类�?/label>
            <SingleSelect
              options={SUPPLY_TYPES}
              selected={form.supply_type}
              onChange={(v) => setForm({ ...form, supply_type: v })}
            />
          </div>
          {/* Install Service */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">是否提供安装服务</label>
            <button
              type="button"
              onClick={() => setForm({ ...form, install_service: !form.install_service })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                form.install_service ? 'bg-blue-900' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.install_service ? 'left-6' : 'left-0.5'
                }`}
              />
            </button>
          </div>
          {/* Return Policy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">退换货政策</label>
            <SingleSelect
              options={RETURN_POLICIES}
              selected={form.return_policy}
              onChange={(v) => setForm({ ...form, return_policy: v })}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="sticky bottom-4 z-10">
        <Button
          onClick={handleSave}
          disabled={saving || (!isEdited && form.profile_completed)}
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-sky-400 to-blue-800 hover:from-blue-900 hover:to-blue-950 text-white shadow-lg rounded-xl"
        >
          {saving ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" />保存�?..</>
          ) : form.profile_completed && !isEdited ? (
            <><CheckCircle2 className="w-5 h-5 mr-2" />档案已保�?/>
          ) : (
            <><Save className="w-5 h-5 mr-2" />{isNew ? '保存档案' : '保存修改'}</>
          )}
        </Button>
        {isEdited && form.profile_completed && (
          <p className="text-center text-xs text-blue-900 mt-1.5">有未保存的修�?/p>
        )}
      </div>
    </div>
  );
}
