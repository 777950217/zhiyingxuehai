'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, HelpCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

/* ─── Step config per version ─── */
interface GuideStep {
  title: string;
  description: string;
  /** CSS selector to position the bubble near */
  targetSelector: string;
  /** Where to place the bubble relative to target: above / below / right */
  position: 'above' | 'below' | 'right';
}

const PERSONAL_STEPS: GuideStep[] = [
  {
    title: '课程学习',
    description: '系统内置系统化管理课程，零基础也能快速掌握实操能�?,
    targetSelector: '[data-guide="learning-section"]',
    position: 'above',
  },
  {
    title: '即刻入门',
    description: '3分钟入门，即刻收获实用管理方�?,
    targetSelector: '[data-guide="learning-section"]',
    position: 'above',
  },
  {
    title: '工具辅助练习',
    description: '学完搭配工具实操，知识直接落地使�?,
    targetSelector: '[data-guide="tools-section"]',
    position: 'above',
  },
];

const PRO_STEPS: GuideStep[] = [
  {
    title: 'AI急救�?,
    description: '突发工作难题、沟通卡点，AI实时给出解决方案',
    targetSelector: '[data-guide="ai-assistant"]',
    position: 'above',
  },
  {
    title: '一键发起咨�?,
    description: '输入问题，即刻获取定制化应对话术与方�?,
    targetSelector: '[data-guide="ai-assistant"]',
    position: 'above',
  },
  {
    title: '知识库沉淀',
    description: '海量行业案例存档，随时调取复�?,
    targetSelector: '[data-guide="knowledge-entry"]',
    position: 'right',
  },
];

const STORAGE_KEY = 'first_login_done';

function getSteps(role: string): GuideStep[] {
  // personal_user �?personal path
  // enterprise_manager, enterprise_admin, admin �?pro path
  // staff �?pro path
  if (role === 'personal_user') return PERSONAL_STEPS;
  return PRO_STEPS;
}

export function AhaMomentGuide() {
  const { profile } = useAuth();
  const role = profile?.role || '';
  const steps = getSteps(role);
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  const bubbleRef = useRef<HTMLDivElement>(null);

  /* Check first login on mount */
  useEffect(() => {
    if (!role) return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [role]);

  /* Reposition bubble when step changes */
  useEffect(() => {
    if (!visible) return;
    const step = steps[currentStep];
    if (!step) return;

    const reposition = () => {
      const target = document.querySelector(step.targetSelector);
      if (!target) {
        // Fallback: center of screen
        setBubblePos({ top: window.innerHeight / 2 - 120, left: window.innerWidth / 2 - 170 });
        setArrowStyle({});
        return;
      }
      const rect = target.getBoundingClientRect();
      const bubbleW = 340;
      const bubbleH = 180;
      const gap = 16;
      let top = 0;
      let left = 0;
      let arrow: React.CSSProperties = {};

      switch (step.position) {
        case 'above':
          top = rect.top - bubbleH - gap;
          left = rect.left + rect.width / 2 - bubbleW / 2;
          arrow = { bottom: -6, left: '50%', transform: 'translateX(-50%) rotate(45deg)' };
          break;
        case 'below':
          top = rect.bottom + gap;
          left = rect.left + rect.width / 2 - bubbleW / 2;
          arrow = { top: -6, left: '50%', transform: 'translateX(-50%) rotate(-135deg)' };
          break;
        case 'right':
          top = rect.top + rect.height / 2 - bubbleH / 2;
          left = rect.right + gap;
          arrow = { left: -6, top: '50%', transform: 'translateY(-50%) rotate(-45deg)' };
          break;
      }

      // Clamp to viewport
      left = Math.max(12, Math.min(left, window.innerWidth - bubbleW - 12));
      top = Math.max(12, Math.min(top, window.innerHeight - bubbleH - 12));

      setBubblePos({ top, left });
      setArrowStyle(arrow);
    };

    reposition();
    const onResize = () => reposition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [visible, currentStep, steps]);

  const markDone = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      markDone();
    }
  }, [currentStep, steps.length, markDone]);

  const handleSkip = useCallback(() => {
    markDone();
  }, [markDone]);

  const handleReplay = useCallback(() => {
    setCurrentStep(0);
    setVisible(true);
  }, []);

  const step = steps[currentStep];
  if (!step) return null;

  return (
    <>
      {/* ─── Guide overlay + bubble ─── */}
      {visible && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          {/* Semi-transparent overlay */}
          <div className="absolute inset-0 bg-black/25 pointer-events-auto" onClick={handleSkip} />

          {/* Highlight target element */}
          {(() => {
            const target = document.querySelector(step.targetSelector);
            if (!target) return null;
            const rect = target.getBoundingClientRect();
            return (
              <div
                className="absolute rounded-lg ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent bg-blue-500/5 pointer-events-none transition-all duration-300"
                style={{
                  top: rect.top - 4,
                  left: rect.left - 4,
                  width: rect.width + 8,
                  height: rect.height + 8,
                }}
              />
            );
          })()}

          {/* Bubble */}
          <div
            ref={bubbleRef}
            className="fixed pointer-events-auto z-[101] transition-all duration-300"
            style={{ top: bubblePos.top, left: bubblePos.left }}
          >
            <div className="relative bg-white rounded-2xl shadow-2xl border border-blue-200 p-6 w-[340px]">
              {/* Arrow */}
              <div
                className="absolute w-3 h-3 bg-white border-blue-200"
                style={{
                  ...arrowStyle,
                  borderLeft: '1px solid',
                  borderTop: '1px solid',
                  borderColor: '#bfdbfe',
                }}
              />
              {/* Re-draw arrow cleanly */}
              <style>{`
                .guide-arrow-before { content: ''; position: absolute; width: 12px; height: 12px; background: white; border: 1px solid #bfdbfe; }
              `}</style>

              {/* Close button */}
              <button
                onClick={handleSkip}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Step indicator: 1/3 2/3 3/3 */}
              <div className="flex items-center gap-2 mb-3">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep ? 'w-6 bg-blue-600' : i < currentStep ? 'w-4 bg-blue-300' : 'w-4 bg-gray-200'
                    }`}
                  />
                ))}
                <span className="ml-auto text-xs text-gray-400">
                  {currentStep + 1}/{steps.length}
                </span>
              </div>

              {/* Content */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">
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
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  跳过引导
                </button>
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  {currentStep < steps.length - 1 ? '下一�? : '开始使�?}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Replay floating button ─── */}
      <button
        onClick={handleReplay}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center justify-center group"
        title="新手引导"
      >
        <HelpCircle className="w-6 h-6" />
        <span className="absolute right-full mr-2 whitespace-nowrap bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          新手引导
        </span>
      </button>
    </>
  );
}
