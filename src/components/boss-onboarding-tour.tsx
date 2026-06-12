'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface TourStep {
  title: string;
  content: string;
  illustration?: string; // emoji or icon name
}

const BOSS_TOUR_STEPS: TourStep[] = [
  {
    title: '欢迎使用职盈学海',
    content: '我是你的AI助手橙子。接下来用2分钟带你了解经营看板怎么用。',
    illustration: '👋',
  },
  {
    title: '经营看板是核心',
    content: '这里汇总营收、成本、利润等核心指标。第一次使用请先导入Excel数据，报表才会显示真实数字。',
    illustration: '📊',
  },
  {
    title: '如何导入数据',
    content: '点页面右上角「导入Excel」按钮，选择我们提供的模板文件上传，数据会自动同步到所有报表。',
    illustration: '📥',
  },
  {
    title: '团队管理和培训进度',
    content: '左边导航可以切换：团队管理查看员工状态和行为监控，培训进度查看学习成效。',
    illustration: '👥',
  },
  {
    title: '开始使用',
    content: '引导结束。有问题时点页面右上角「❓帮助」按钮随时查看说明。',
    illustration: '✅',
  },
];

const TOUR_KEY = 'boss_onboarding_done';

export function BossOnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // 只在老板视角显示，且本地没有标记过
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      // 延迟500ms弹出，让页面先渲染
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = (skipAll = false) => {
    if (skipAll || step >= BOSS_TOUR_STEPS.length - 1) {
      localStorage.setItem(TOUR_KEY, '1');
      setOpen(false);
    }
  };

  const handleNext = () => {
    if (step < BOSS_TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    handleClose(true);
  };

  if (!open) return null;

  const current = BOSS_TOUR_STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={handleSkip} />

      {/* 对话框 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 animate-fade-in">
        {/* 关闭按钮 */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 步骤指示点 */}
        <div className="flex justify-center gap-1.5 mb-6">
          {BOSS_TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === step ? 'bg-blue-600' : i < step ? 'bg-blue-300' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* 插图 */}
        <div className="text-center text-5xl mb-4">
          {current.illustration}
        </div>

        {/* 标题 */}
        <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
          {current.title}
        </h2>

        {/* 内容 */}
        <p className="text-slate-600 text-center leading-relaxed mb-8">
          {current.content}
        </p>

        {/* 按钮区 */}
        <div className="flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={handlePrev}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
              上一步
            </button>
          ) : (
            <button
              onClick={handleSkip}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              跳过引导
            </button>
          )}

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            {step < BOSS_TOUR_STEPS.length - 1 ? '下一步' : '开始使用'}
            {step < BOSS_TOUR_STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
            {step === BOSS_TOUR_STEPS.length - 1 && <Check className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// 重置引导（供帮助按钮调用）
export function resetBossTour() {
  localStorage.removeItem(TOUR_KEY);
}
