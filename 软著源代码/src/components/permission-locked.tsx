'use client';

import { Lock, Home, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, ReactNode } from 'react';
import { ConsultDialog } from '@/components/consult-dialog';
import { useAuth } from '@/lib/auth-context';

interface PermissionLockedProps {
  title?: string;
  description?: string;
  path?: string;
  children?: ReactNode;
}

export function PermissionLocked({ title, description, path, children }: PermissionLockedProps) {
  const { profile } = useAuth();
  const [consultOpen, setConsultOpen] = useState(false);
  const [trialActive, setTrialActive] = useState(false);

  useEffect(() => {
    if (path) {
      const activePath = sessionStorage.getItem('efficiency_trial_active');
      setTrialActive(activePath === path || activePath === window.location.pathname);
    }
  }, [path]);

  // Check if current user's role actually locks this path
  const isActuallyLocked = (() => {
    const role = profile?.role;
    if (!role || !path) return false; // No role or no path = not locked
    if (role === 'admin') return false;

    // enterprise_admin: only locks specific paths
    if (role === 'enterprise_admin') {
      if (['/admin', '/consultant'].includes(path)) return true;
      if (['/ai-checkup/speech', '/ai-checkup/sop', '/ai-checkup/case'].includes(path)) return true;
      return false;
    }

    // personal_user
    if (role === 'personal_user') {
      const PERSONAL_LOCKED = [
        '/rules', '/kpi', '/work-orders', '/customer-records', '/cost-alert', '/admin', '/consultant',
        '/quality', '/scheduling', '/weekly-review', '/management-tools',
      ];
      return PERSONAL_LOCKED.includes(path);
    }

    // efficiency_user
    if (role === 'efficiency_user') {
      if (trialActive) return false;
      const EFFICIENCY_LOCKED = [
        '/courses', '/ai-checkup/quality', '/ai-checkup/plan',
        '/weekly-review', '/management-tools', '/learning-path',
      ];
      return EFFICIENCY_LOCKED.includes(path);
    }

    // enterprise_manager (not trial expired)
    if (role === 'enterprise_manager') {
      const MANAGER_LOCKED = ['/admin', '/consultant'];
      return MANAGER_LOCKED.includes(path);
    }

    // staff
    if (role === 'staff') {
      const STAFF_LOCKED = [
        '/rules', '/kpi', '/kpi-assessment', '/work-orders', '/customer-records', '/cost-alert',
        '/admin', '/consultant', '/learning-path',
        '/weekly-review', '/management-tools', '/product-knowledge',
      ];
      return STAFF_LOCKED.includes(path);
    }

    return false;
  })();

  // If user has permission (not actually locked), render children directly
  if (!isActuallyLocked && children) {
    return <>{children}</>;
  }

  // If trial is active for this path, render children without lock
  if (trialActive && children) {
    return <>{children}</>;
  }

  // If children provided but no trial active, still lock
  const displayTitle = title || '您暂时没有权限访问此页面';
  const displayDesc = description || '此功能为管理版专属权限，开通即可解锁全套管理课程和深度AI诊断工具�?;

  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-gray-50 animate-fade-in-up">
      <div className="text-center max-w-md px-6">
        <div className="w-20 h-20 rounded-full bg-sky-50 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-sky-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {displayTitle}
        </h2>
        <p className="text-sm text-gray-500 mb-8">{displayDesc}</p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-950 active:scale-95 text-white text-sm font-medium transition-all duration-200"
          >
            <Home className="w-4 h-4" />
            返回首页
          </Link>
          <button
            onClick={() => setConsultOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-blue-800 text-blue-800 hover:bg-blue-800 hover:text-white active:scale-95 text-sm font-medium transition-all duration-200"
          >
            <MessageCircle className="w-4 h-4" />
            咨询开�?
          </button>
        </div>
        <ConsultDialog open={consultOpen} onOpenChange={setConsultOpen} title="咨询开�? />
      </div>
    </div>
  );
}
