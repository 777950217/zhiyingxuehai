'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight } from 'lucide-react';

export interface GuideStep {
  title: string;
  description: string;
  targetSelector?: string;
}

interface OnboardingGuideProps {
  /** Unique key for localStorage tracking */
  guideKey: string;
  steps: GuideStep[];
  onComplete?: () => void;
}

export function OnboardingGuide({ guideKey, steps, onComplete }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(`guide_seen_${guideKey}`);
    if (!seen) {
      // Delay to let the page render
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [guideKey]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps.length]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(`guide_seen_${guideKey}`, '1');
    setVisible(false);
    onComplete?.();
  }, [guideKey, onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(`guide_seen_${guideKey}`, '1');
    setVisible(false);
  }, [guideKey]);

  if (!visible) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={handleSkip} />
      
      {/* Guide bubble */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
        <div className="relative bg-white rounded-2xl shadow-2xl border border-blue-100 p-6 max-w-sm w-[340px]">
          {/* Arrow pointing up */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white rotate-45 border-l border-t border-blue-100" />
          
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-3">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep ? 'w-6 bg-blue-600' : i < currentStep ? 'w-4 bg-blue-300' : 'w-4 bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                {currentStep + 1}
              </span>
              <h3 className="text-base font-bold text-gray-900">{step.title}</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed pl-8">{step.description}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pl-8">
            <button
              onClick={handleSkip}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              跳过引导
            </button>
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {currentStep < steps.length - 1 ? '下一步' : '开始使用'}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Convenience wrapper that auto-detects the current page and shows the matching guide.
 */
export function OnboardingGuideCard() {
  const [page, setPage] = useState<string>('');

  useEffect(() => {
    setPage(window.location.pathname);
  }, []);

  const guideConfigs: Record<string, { key: string; steps: GuideStep[] }> = {
    '/kpi': {
      key: 'kpi',
      steps: [
        { title: '设置4个核心指标', description: '选择响应时长、满意度、转化率、赔付率作为核心考核指标' },
        { title: '填入目标值（参考行业参考值）', description: '参考输入框下方的行业参考值，填写适合您团队的目标' },
        { title: '保存并通知团队', description: '保存配置后，团队成员将收到KPI目标更新通知' },
      ],
    },
    '/teams': {
      key: 'teams-scheduling',
      steps: [
        { title: '创建班次（早/中/晚）', description: '根据业务量设置不同时段的班次安排' },
        { title: '给员工排班', description: '将团队成员分配到对应班次' },
        { title: '发布排班表', description: '确认排班后发布，团队即可查看' },
      ],
    },
    '/business-tools': {
      key: 'business-tools-cost',
      steps: [
        { title: '录入团队月固定成本', description: '填写客服人均月成本等固定支出' },
        { title: '录入退货/赔付均单成本', description: '填写退货运费和售后赔付的平均金额' },
        { title: '保存后即可使用定价计算器', description: '成本数据保存后，定价计算器会自动引用' },
      ],
    },
    '/approval': {
      key: 'approval',
      steps: [
        { title: '设置主管审批阈值', description: '建议设置300-500元，低于此金额主管可直接审批' },
        { title: '设置老板审批阈值', description: '建议设置1000-2000元，超过此金额需要老板审批+备注' },
        { title: '保存后审批规则自动生效', description: '配置完成后，所有赔付记录将按规则自动走审批流程' },
      ],
    },
  };

  const config = guideConfigs[page];
  if (!config) return null;

  return <OnboardingGuide guideKey={config.key} steps={config.steps} />;
}