'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronRight, ChevronLeft, Building2, Package, Gem, Users, Sparkles, Loader2 } from 'lucide-react';

const INDUSTRY_OPTIONS = [
  '卫浴', '服装', '美妆', '食品', '3C数码', '家居', '母婴', '其他',
];

const TEAM_SIZE_OPTIONS = [
  '1�?, '2-5�?, '6-10�?, '11-20�?, '20人以�?,
];

const STEPS = [
  { icon: Building2, title: '选择行业', desc: '告诉我们你所在的行业' },
  { icon: Package, title: '主营产品', desc: '你主要卖什么产�? },
  { icon: Gem, title: '产品材质', desc: '你的产品主要用什么材�? },
  { icon: Users, title: '团队规模', desc: '客服团队有多少人' },
  { icon: Sparkles, title: '生成档案', desc: 'AI为你定制行业方案' },
];

export default function OnboardingIndustryPage() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [mainProduct, setMainProduct] = useState('');
  const [material, setMaterial] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 如果用户已完成行业档案，跳转首页
  useEffect(() => {
    if (profile?.industryProfileCompleted) {
      router.replace('/');
    }
  }, [profile, router]);

  const getIndustry = () => industry === '其他' ? customIndustry : industry;

  const canNext = () => {
    if (step === 0) return industry !== '' && (industry !== '其他' || customIndustry.trim() !== '');
    if (step === 1) return mainProduct.trim() !== '';
    if (step === 2) return material.trim() !== '';
    if (step === 3) return teamSize !== '';
    return true;
  };

  const handleSubmit = async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/industry-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          industry: getIndustry(),
          mainProduct: mainProduct.trim(),
          material: material.trim(),
          teamSize,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '提交失败');
      }

      // 刷新profile以获取最新的industryProfileCompleted状�?
      await refreshProfile();
      router.replace('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '提交失败，请重试');
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* 顶部标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            定制你的行业档案
          </h1>
          <p className="text-lg text-blue-200">
            4 步完成，AI 为你生成专属行业方案
          </p>
        </div>

        {/* 步骤指示�?*/}
        <div className="flex items-center justify-center gap-1 mb-8">
          {STEPS.map((s, i) => {
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={i} className="flex items-center gap-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold transition-all ${
                    isActive
                      ? 'bg-sky-400 text-blue-950 scale-110'
                      : isDone
                      ? 'bg-sky-400/30 text-sky-400'
                      : 'bg-white/10 text-white/40'
                  }`}
                >
                  {isDone ? '�? : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-6 h-0.5 ${
                      isDone ? 'bg-sky-400/50' : 'bg-white/10'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* 主卡�?*/}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* 步骤标题 */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-50 mb-3">
              {(() => {
                const Icon = STEPS[step].icon;
                return <Icon className="w-7 h-7 text-blue-800" />;
              })()}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {STEPS[step].title}
            </h2>
            <p className="text-base text-gray-500 mt-1">{STEPS[step].desc}</p>
          </div>

          {/* 步骤0：选择行业 */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {INDUSTRY_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setIndustry(opt)}
                    className={`p-4 rounded-xl text-lg font-medium transition-all border-2 ${
                      industry === opt
                        ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-md'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {industry === '其他' && (
                <Input
                  placeholder="请输入你的行�?
                  value={customIndustry}
                  onChange={(e) => setCustomIndustry(e.target.value)}
                  className="text-lg h-12 mt-3"
                />
              )}
            </div>
          )}

          {/* 步骤1：主营产�?*/}
          {step === 1 && (
            <div className="space-y-4">
              <Input
                placeholder="例如：智能马桶、花洒、浴室柜"
                value={mainProduct}
                onChange={(e) => setMainProduct(e.target.value)}
                className="text-lg h-14 px-5"
                autoFocus
              />
              <p className="text-sm text-gray-400">
                可以填写多个产品，用逗号分隔
              </p>
            </div>
          )}

          {/* 步骤2：产品材�?*/}
          {step === 2 && (
            <div className="space-y-4">
              <Input
                placeholder="例如：陶�?亚克�?不锈�?实木/板材"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="text-lg h-14 px-5"
                autoFocus
              />
              <p className="text-sm text-gray-400">
                可以填写多种材质，用斜杠或逗号分隔
              </p>
            </div>
          )}

          {/* 步骤3：团队规�?*/}
          {step === 3 && (
            <div className="space-y-3">
              {TEAM_SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setTeamSize(opt)}
                  className={`w-full p-4 rounded-xl text-lg font-medium transition-all border-2 text-left ${
                    teamSize === opt
                      ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-md'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* 步骤4：确认生�?*/}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-base">行业</span>
                  <span className="font-semibold text-lg text-gray-900">{getIndustry()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-base">主营产品</span>
                  <span className="font-semibold text-lg text-gray-900">{mainProduct}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-base">产品材质</span>
                  <span className="font-semibold text-lg text-gray-900">{material}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-base">团队规模</span>
                  <span className="font-semibold text-lg text-gray-900">{teamSize}</span>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-800 text-base">
                  <Sparkles className="w-5 h-5 inline mr-1" />
                  AI 将根据以上信息，为你生成行业专属档案，包含客诉类型、售后场景、成本痛点、话术方向和管理挑战�?
                </p>
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-base">
              {error}
            </div>
          )}

          {/* 底部按钮 */}
          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <Button
                variant="outline"
                size="lg"
                onClick={handleBack}
                className="text-base gap-1"
                disabled={loading}
              >
                <ChevronLeft className="w-4 h-4" />
                上一�?
              </Button>
            ) : (
              <div />
            )}

            <Button
              size="lg"
              onClick={handleNext}
              disabled={!canNext() || loading}
              className="text-base gap-1 bg-blue-700 hover:bg-blue-800 min-w-[140px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成�?..
                </>
              ) : step === 4 ? (
                <>
                  生成我的行业档案
                  <Sparkles className="w-4 h-4" />
                </>
              ) : (
                <>
                  下一�?
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 跳过提示 */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => router.replace('/')}
            className="text-blue-300 hover:text-blue-200 text-base underline underline-offset-4"
          >
            暂时跳过，稍后再�?
          </button>
        </div>
      </div>
    </div>
  );
}