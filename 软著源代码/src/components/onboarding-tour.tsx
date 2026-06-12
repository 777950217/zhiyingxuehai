'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth-context';
import { X, ChevronRight, Sparkles, Bot, BarChart3, LayoutDashboard } from 'lucide-react';

const STORAGE_KEY = 'onboarding_completed';

interface StepConfig {
  title: string;
  content: string;
  buttonLabel: string;
  icon: React.ReactNode;
}

function getStep2ByRole(role: UserRole): StepConfig {
  switch (role) {
    case 'staff':
      return {
        title: '核心功能',
        content: '试试AI助手，遇到客户问�?秒出话术',
        buttonLabel: '去试�?,
        icon: <Bot className="w-10 h-10 text-sky-400" />,
      };
    case 'admin':
    case 'enterprise_admin':
      return {
        title: '核心功能',
        content: '顾问后台，掌握所有客户动�?,
        buttonLabel: '去看�?,
        icon: <LayoutDashboard className="w-10 h-10 text-sky-400" />,
      };
    default:
      // enterprise_manager
      return {
        title: '核心功能',
        content: '质检打分、工单管理、成本预警，一目了�?,
        buttonLabel: '去看�?,
        icon: <BarChart3 className="w-10 h-10 text-sky-400" />,
      };
  }
}

function getStep1Button(role: UserRole): string {
  switch (role) {
    case 'staff': return '开始学�?;
    case 'admin':
    case 'enterprise_admin': return '开始配�?;
    default: return '开始管�?;
  }
}

function getStep2Href(role: UserRole): string {
  switch (role) {
    case 'staff': return '/practice';
    case 'admin':
    case 'enterprise_admin': return '/';
    default: return '/kpi';
  }
}

export default function OnboardingTour() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (loading || !profile) return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      setVisible(true);
    }
  }, [loading, profile]);

  const close = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }, []);

  const role = (profile?.role ?? 'personal_user') as UserRole;

  const handleNext = useCallback(() => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Step 3完成：personal_user跳转AI急救�?预填prompt，其他角色关闭弹�?
      if (role === 'personal_user') {
        const ppRaw = typeof window !== 'undefined' ? localStorage.getItem('personal_product_profile') : null;
        let prefilledPrompt = '帮我生成客服话术';
        try {
          if (ppRaw) {
            const pp = JSON.parse(ppRaw);
            if (pp.category) prefilledPrompt = `帮我生成${pp.category}行业的客服话术`;
          }
        } catch {}
        close();
        router.push(`/ai-assistant?prefill=${encodeURIComponent(prefilledPrompt)}`);
      } else {
        close();
      }
    }
  }, [step, close, router, role]);

  const handleStep2Action = useCallback(() => {
    const href = getStep2Href(profile!.role);
    close();
    router.push(href);
  }, [profile, close, router]);

  if (!visible || !profile) return null;

  const totalSteps = 3;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={close} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="跳过引导"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-blue-800 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        <div className="px-8 pt-8 pb-6">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sky-50 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-sky-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                欢迎来到职盈学海 👋
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                我是你的AI客服助手�?步带你上�?
              </p>
              <button
                onClick={handleNext}
                className="w-full py-2.5 rounded-xl bg-blue-900 text-white font-medium text-sm hover:bg-blue-900 active:scale-[0.98] transition-all"
              >
                {getStep1Button(role)}
              </button>
            </div>
          )}

          {/* Step 2: Core feature by role */}
          {step === 2 && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sky-50 flex items-center justify-center">
                {getStep2ByRole(role).icon}
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {getStep2ByRole(role).title}
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                {getStep2ByRole(role).content}
              </p>
              <button
                onClick={handleStep2Action}
                className="w-full py-2.5 rounded-xl bg-blue-900 text-white font-medium text-sm hover:bg-blue-900 active:scale-[0.98] transition-all"
              >
                {getStep2ByRole(role).buttonLabel}
              </button>
            </div>
          )}

          {/* Step 3: Ready */}
          {step === 3 && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-50 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                准备好了�?
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                遇到问题随时问AI助手，我们一直在
              </p>
              <button
                onClick={handleNext}
                className="w-full py-2.5 rounded-xl bg-blue-900 text-white font-medium text-sm hover:bg-blue-900 active:scale-[0.98] transition-all"
              >
                开始使�?
              </button>
            </div>
          )}
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 pb-6">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i + 1 === step
                  ? 'w-6 bg-blue-900'
                  : i + 1 < step
                    ? 'w-1.5 bg-blue-900'
                    : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
