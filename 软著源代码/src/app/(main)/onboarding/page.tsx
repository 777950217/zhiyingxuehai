'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Zap, ChevronRight, ChevronLeft, Check, Package, Users, AlertCircle, Sparkles, ArrowRight, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from '@/components/ui/dialog';

/* ── Step indicator ── */
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <React.Fragment key={i}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            i < current ? 'bg-blue-900 text-white' : i === current ? 'bg-sky-100 text-blue-900 ring-2 ring-sky-400' : 'bg-gray-100 text-gray-400'
          }`}>
            {i < current ? <Check className="w-4 h-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`flex-1 h-0.5 rounded transition-all ${
              i < current ? 'bg-blue-900' : 'bg-gray-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── Option card for single select ── */
function OptionCard({ label, icon, selected, onClick }: { label: string; icon?: React.ReactNode; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left w-full ${
        selected ? 'border-sky-400 bg-sky-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      {icon && <span className={selected ? 'text-sky-400' : 'text-gray-400'}>{icon}</span>}
      <span className={`font-medium ${selected ? 'text-blue-950' : 'text-gray-700'}`}>{label}</span>
    </button>
  );
}

/* ── Tag for multi-select ── */
function TagButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
        selected ? 'bg-blue-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

/* ── Data options ── */
const CATEGORIES = ['智能马桶', '普通马�?, '花洒', '浴室�?, '其他'];
const TEAM_SIZES = [
  { label: '1�?(自己�?', value: '1', icon: '👤' },
  { label: '2�?(夫妻�?', value: '2', icon: '👫' },
  { label: '3-5�?, value: '3-5', icon: '👥' },
  { label: '5人以�?, value: '5+', icon: '🏢' },
];
const PLATFORMS = ['淘宝', '京东', '拼多�?, '抖音', '快手', '小红�?, '其他'];
const PRICE_RANGES = [
  { label: '经济�?(100-500�?', value: '100-500' },
  { label: '中端�?(500-2000�?', value: '500-2000' },
  { label: '高端�?(2000元以�?', value: '2000+' },
];
const PAIN_POINTS = ['差评处理', '退换货纠纷', '安装投诉', '物流催单', '价格�?, '客服效率', '新人培训', '售后成本'];

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, refreshProfile, authFetch } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showGuideDialog, setShowGuideDialog] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  // Required fields (3)
  const [categories, setCategories] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [teamSize, setTeamSize] = useState('');

  // Optional fields
  const [brandName, setBrandName] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [painPoints, setPainPoints] = useState<string[]>([]);

  const totalSteps = 4;

  const toggleItem = (arr: string[], item: string, setter: (v: string[]) => void, max?: number) => {
    if (arr.includes(item)) {
      setter(arr.filter(x => x !== item));
    } else if (!max || arr.length < max) {
      setter([...arr, item]);
    }
  };

  const canNext = () => {
    switch (step) {
      case 0: return true;
      case 1: return categories.length > 0;
      case 2: return platforms.length > 0;
      case 3: return teamSize !== '';
      default: return true;
    }
  };

  const handleSave = async () => {
    if (!profile?.companyId) return;
    setSaving(true);
    try {
      const res = await authFetch('/api/product-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: profile.companyId,
          brand_name: brandName || profile.companyName || '',
          categories: categories.join(','),
          price_range: priceRange,
          platforms: platforms.join(','),
          team_size: teamSize === '1' ? 1 : teamSize === '2' ? 2 : teamSize === '3-5' ? 4 : 10,
          pain_points: painPoints.join(','),
          profile_completed: true,
        }),
      });
      if (res.ok) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('onboarding_visited', 'true');
        }
        if (refreshProfile) {
          await refreshProfile();
        }
        setShowGuideDialog(true);
      }
    } catch {
      // ignore
    }
    setSaving(false);
  };

  const handleSkip = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('onboarding_visited', 'true');
    }
    router.replace('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <StepIndicator current={step} total={totalSteps} />

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-800 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">3步帮你配好AI顾问</h1>
              <p className="text-gray-500 mt-2">只需�?0秒，让AI更懂你的业务</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4 text-sky-400" /></div>
                <div className="text-left"><p className="font-medium text-gray-800">个性化诊断</p><p className="text-sm text-gray-500">AI根据你的产品和问题，给出精准方案</p></div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-blue-500" /></div>
                <div className="text-left"><p className="font-medium text-gray-800">专属话术</p><p className="text-sm text-gray-500">根据你的品类和平台，推荐最合适的话术</p></div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0"><Users className="w-4 h-4 text-green-500" /></div>
                <div className="text-left"><p className="font-medium text-gray-800">团队管理</p><p className="text-sm text-gray-500">根据团队规模，推荐最适合的管理方�?/p></div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Category */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">你经营哪些品类？</h2>
              <p className="text-gray-500 text-sm mt-1">可多选，至少�?�?/p>
            </div>
            <div className="flex flex-wrap gap-3">
              {CATEGORIES.map(c => (
                <TagButton key={c} label={c} selected={categories.includes(c)} onClick={() => toggleItem(categories, c, setCategories)} />
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Platform */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">你在哪些平台经营�?/h2>
              <p className="text-gray-500 text-sm mt-1">可多选，至少�?�?/p>
            </div>
            <div className="flex flex-wrap gap-3">
              {PLATFORMS.map(p => (
                <TagButton key={p} label={p} selected={platforms.includes(p)} onClick={() => toggleItem(platforms, p, setPlatforms)} />
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Team size + Optional fields */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">你的团队有多大？</h2>
              <p className="text-gray-500 text-sm mt-1">选择最接近的规�?/p>
            </div>
            <div className="space-y-3">
              {TEAM_SIZES.map(t => (
                <OptionCard key={t.value} label={`${t.icon} ${t.label}`} selected={teamSize === t.value} onClick={() => setTeamSize(t.value)} />
              ))}
            </div>

            {/* Optional fields - collapsible */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowOptional(!showOptional)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-600">让AI更懂你（选填�?/span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showOptional ? 'rotate-180' : ''}`} />
              </button>
              {showOptional && (
                <div className="px-4 pb-4 space-y-6 border-t border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">品牌名称</label>
                    <input
                      value={brandName}
                      onChange={e => setBrandName(e.target.value)}
                      placeholder="如：XX旗舰�?
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">价格�?/label>
                    <div className="space-y-2">
                      {PRICE_RANGES.map(p => (
                        <OptionCard key={p.value} label={p.label} selected={priceRange === p.value} onClick={() => setPriceRange(priceRange === p.value ? '' : p.value)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">核心痛点</label>
                    <div className="flex flex-wrap gap-2">
                      {PAIN_POINTS.map(p => (
                        <TagButton key={p} label={p} selected={painPoints.includes(p)} onClick={() => toggleItem(painPoints, p, setPainPoints, 3)} />
                      ))}
                    </div>
                    {painPoints.length > 0 && (
                      <p className="text-xs text-blue-900 mt-2">已�?{painPoints.length}/3：{painPoints.join('�?)}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 0 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" /> 上一�?
            </button>
          ) : (
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium"
            >
              稍后再说
            </button>
          )}

          {step < totalSteps - 1 ? (
            <button
              onClick={() => canNext() && setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-1 bg-gradient-to-r from-sky-400 to-blue-800 text-white px-6 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一�?<ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving || !canNext()}
              className="flex items-center gap-2 bg-gradient-to-r from-sky-400 to-blue-800 text-white px-8 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              {saving ? (
                <><span className="animate-spin">�?/span> 保存�?..</>
              ) : (
                <><Zap className="w-4 h-4" /> 开始使�?/>
              )}
            </button>
          )}
        </div>

        {/* Last step hint */}
        {step === totalSteps - 1 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            你可以随时在「我的产品档案」中修改这些信息
          </p>
        )}
      </div>

      {/* AI引导弹窗 */}
      <Dialog open={showGuideDialog} onOpenChange={setShowGuideDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-sky-400" />
              档案保存成功�?
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 pt-1">
              AI问题解决器已根据你的产品档案准备就绪，试试看它能帮你解决什么问�?
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
          <div className="bg-gradient-to-br from-sky-50 to-slate-50 border border-sky-100 rounded-xl p-4 my-2">
            <div className="space-y-2.5 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <span className="text-sky-400 mt-0.5">�?/span>
                <span>输入客户问题，AI结合你的产品档案给出个性化方案</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sky-400 mt-0.5">�?/span>
                <span>覆盖退换货、安装、投诉等11类场景判断规�?/span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sky-400 mt-0.5">�?/span>
                <span>提供推荐话术和预防建议，可直接复制使�?/span>
              </div>
            </div>
          </div>
          </DialogBody>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <button
              onClick={() => { setShowGuideDialog(false); router.push('/ai-assistant'); }}
              className="w-full bg-gradient-to-r from-sky-400 to-blue-800 text-white px-6 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md transition-all"
            >
              立即体验AI问题解决�?
            </button>
            <button
              onClick={() => { setShowGuideDialog(false); router.replace('/'); }}
              className="w-full text-gray-500 hover:text-gray-700 px-4 py-2 text-sm font-medium"
            >
              先去首页看看
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
