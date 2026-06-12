'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Briefcase, X, ArrowRight } from 'lucide-react';

/**
 * 首页行业档案引导横幅
 * 当用户未完成行业档案时，显示引导横幅
 */
export function IndustryProfileBanner() {
  const { profile } = useAuth();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  // 企业版不需要行业档案（已有行业专属版本）
  const proRoles = ['enterprise_manager', 'enterprise_admin'];
  if (!profile || profile.industryProfileCompleted || dismissed || proRoles.includes(profile.role)) {
    return null;
  }

  return (
    <div className="relative bg-gradient-to-r from-blue-700 to-blue-600 rounded-xl p-5 text-white shadow-lg">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors"
        aria-label="关闭"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
          <Briefcase className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold mb-0.5">
            定制你的行业档案
          </h3>
          <p className="text-blue-100 text-sm">
            告诉我们你的行业和产品，AI 将为你生成专属行业方案，让回答更精准
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => { router.push('/onboarding-industry'); }}
          className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-base gap-1 flex-shrink-0"
        >
          立即定制
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
