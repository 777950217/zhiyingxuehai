'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, getFeatureForRoute } from '@/lib/auth-context';
import AppShell from '@/components/app-shell';
import { AlertTriangle, X, QrCode, Crown, AlertCircle, ArrowRight, Shield, Bell, BookOpen, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { Toaster } from '@/components/ui/sonner';

/* ── Membership expiry banner for enterprise_admin only ── */
function ExpiryBanner() {
  const { profile, authFetch } = useAuth();
  const [show, setShow] = React.useState(false);
  const [daysLeft, setDaysLeft] = React.useState<number | null>(null);
  const [renewOpen, setRenewOpen] = React.useState(false);
  const fetchedRef = useRef(false);

  // Stabilize: only re-run when these primitive values actually change
  const role = profile?.role ?? null;
  const companyId = profile?.companyId ?? null;

  useEffect(() => {
    if (fetchedRef.current) return;
    if (role !== 'enterprise_admin' && role !== 'admin') return;
    if (!companyId) return;

    fetchedRef.current = true;

    authFetch(`/api/daily-data?type=subscription&companyId=${companyId}`)
      .then(res => res.json())
      .then(data => {
        const sub = data.data;
        if (!sub?.plan_end) return;
        const end = new Date(sub.plan_end);
        const now = new Date();
        const diff = Math.ceil((end.getTime() - now.getTime()) / 86400000);
        if (diff <= 15) {
          setDaysLeft(diff);
          setShow(true);
        }
      })
      .catch(() => {});
  }, [role, companyId]);

  // Memoize the rendered output so it never flickers on unrelated re-renders
  const bannerContent = useMemo(() => {
    if (!show || daysLeft === null) return null;
    return (
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm text-blue-900">
          <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0" />
          {daysLeft > 0
            ? daysLeft <= 7
              ? `您的账号将于 ${daysLeft} 天后到期，请尽快联系管理员续订`
              : `您的账号将于 ${daysLeft} 天后到期，建议提前续订`
            : '您的服务已过期，请尽快续�?}
          <button
            onClick={() => setRenewOpen(true)}
            className="ml-1 text-blue-900 hover:text-blue-950 font-medium underline"
          >
            解锁更多服务
          </button>
        </div>
        <button onClick={() => setShow(false)} className="text-sky-400 hover:text-blue-800">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }, [show, daysLeft]);

  if (!bannerContent) return null;

  return (
    <>
      {bannerContent}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-sky-400" /> 解锁更多服务
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
          <div className="space-y-6 mt-2">
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              {[
                { name: '个人�?, desc: '1人·基础功能' },
                { name: '专业�?, desc: '5人·全功能管理' },
                { name: '旗舰�?, desc: '15人·驾驶舱·顾问' },
              ].map((p) => (
                <div key={p.name} className="border rounded-lg p-3 hover:border-sky-400 transition-colors">
                  <div className="font-medium text-gray-800">{p.name}</div>
                  <div className="text-blue-900 font-bold mt-1">{p.desc}</div>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <QrCode className="w-24 h-24 mx-auto text-gray-700" />
              <p className="text-sm text-gray-600 mt-3">扫码添加客服微信完成延期</p>
              <p className="text-xs text-gray-600 mt-1">延期后由管理员后台确认开�?/p>
            </div>
          </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Profile incomplete banner: persistent yellow bar ── */
const BANNER_DISMISSED_KEY = 'profile_banner_dismissed';

function ProfileIncompleteBanner() {
  const { profile, authFetch } = useAuth();
  const [show, setShow] = React.useState(false);
  const pathname = usePathname();
  const fetchedRef = useRef(false);

  // Stabilize primitives
  const companyId = profile?.companyId ?? null;

  useEffect(() => {
    if (fetchedRef.current) return;
    // Skip on onboarding / product-profile pages
    if (pathname === '/onboarding' || pathname === '/product-profile') return;
    if (!companyId) return;
    // If user already dismissed this session, don't show again
    if (typeof window !== 'undefined' && sessionStorage.getItem(BANNER_DISMISSED_KEY)) return;

    fetchedRef.current = true;

    authFetch(`/api/product-profile?companyId=${companyId}`)
      .then(res => res.json())
      .then(data => {
        if (data.data && !data.data.profile_completed) {
          setShow(true);
        }
      })
      .catch(() => {});
  }, [companyId, pathname]);

  // Memoize banner to prevent any re-render flicker
  const bannerContent = useMemo(() => {
    if (!show) return null;
    const handleDismiss = () => {
      setShow(false);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(BANNER_DISMISSED_KEY, '1');
      }
    };
    return (
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm text-blue-900">
          <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
          <span>完善产品档案，让AI更懂你的业务，获得更精准的解决方�?/span>
          <a
            href="/product-profile"
            className="ml-1 text-blue-900 hover:text-blue-950 font-medium underline inline-flex items-center gap-0.5"
          >
            去填�?<ArrowRight className="w-3 h-3" />
          </a>
        </div>
        <button onClick={handleDismiss} className="text-sky-400 hover:text-blue-800">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }, [show]);

  return bannerContent;
}

const MainLayoutInner = React.memo(function MainLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, hasAccess, authFetch, accountExpired, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Stabilize primitives for effect dependencies
  const companyId = profile?.companyId ?? null;
  const role = profile?.role ?? null;

  // Auth guard: redirect to login if not authenticated (except /contact which is public)
  React.useEffect(() => {
    if (!loading && !user && pathname !== '/contact') {
      router.replace('/login');
    }
  }, [loading, user, pathname, router]);

  // Role guard: redirect to home if accessing unauthorized feature
  // efficiency_user: never redirect �?let page components handle locked state themselves
  // (grayscale trial sets sessionStorage 'efficiency_trial_active' to bypass per-page locks)
  React.useEffect(() => {
    if (!loading && user && profile) {
      if (profile.role === 'efficiency_user') return;
      const feature = getFeatureForRoute(pathname);
      if (feature && !hasAccess(feature)) {
        router.replace('/');
      }
    }
  }, [loading, user, profile, pathname, hasAccess, router]);

  // Onboarding guard: redirect ONLY for first login after registration
  // Use sessionStorage to persist across HMR remounts (Turbopack hot-reloads remount components)
  const [profileChecked, setProfileChecked] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('onboarding_profile_checked') === '1';
    }
    return false;
  });
  const onboardingFetchedRef = React.useRef(profileChecked);

  const markProfileChecked = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('onboarding_profile_checked', '1');
    }
    setProfileChecked(true);
  }, []);

  React.useEffect(() => {
    // Once profile is checked, never re-enter this guard �?prevents loops
    if (profileChecked) return;
    if (onboardingFetchedRef.current) {
      markProfileChecked();
      return;
    }

    // Check if this is a first-time user (never visited onboarding)
    if (typeof window !== 'undefined') {
      const visited = sessionStorage.getItem('onboarding_visited');
      if (visited) {
        onboardingFetchedRef.current = true;
        markProfileChecked();
        return;
      }
    }

    if (!loading && user && companyId && pathname !== '/onboarding' && pathname !== '/product-profile' && pathname !== '/onboarding-flow' && pathname !== '/onboarding-industry') {
      onboardingFetchedRef.current = true;

      authFetch(`/api/product-profile?companyId=${companyId}`)
        .then(res => res.json())
        .then(data => {
          if (data.data && !data.data.profile_completed) {
            router.replace('/onboarding');
          }
          markProfileChecked();
        })
        .catch(() => markProfileChecked());
    } else if (!loading && (pathname === '/onboarding' || pathname === '/product-profile' || pathname === '/onboarding-flow' || pathname === '/onboarding-industry' || pathname === '/contact')) {
      onboardingFetchedRef.current = true;
      markProfileChecked();
    } else if (!loading && !user) {
      onboardingFetchedRef.current = true;
      markProfileChecked();
    } else if (!loading && user && !companyId) {
      // User has session but profile hasn't loaded yet �?allow a brief wait,
      // but don't block forever. Set checked after timeout so the page can render.
      const timer = setTimeout(() => {
        onboardingFetchedRef.current = true;
        markProfileChecked();
      }, 3000);
      return () => clearTimeout(timer);
    }
    // If still loading, don't set fetchedRef �?allow retry next render
  }, [loading, user, companyId, pathname, router, profileChecked, markProfileChecked]);

  // New content check on login (must be before early returns to follow Rules of Hooks)
  const [newContentModal, setNewContentModal] = React.useState<{rules: number; trends: number} | null>(null);
  React.useEffect(() => {
    if (!loading && user && profile && role && (role === 'enterprise_manager' || role === 'enterprise_admin')) {
      const sessionKey = `newContentChecked_${profile.id}`;
      if (sessionStorage.getItem(sessionKey)) return;
      const companyId = profile.companyId;
      const roleParam = profile.role;
      const lastViewed = localStorage.getItem(`lastContentViewed_${profile.id}`) || '';
      fetch(`/api/new-content-check?company_id=${companyId}&user_id=${profile.id}&role=${roleParam}&since=${lastViewed}`)
        .then(r => r.json())
        .then(data => {
          if (data.data && (data.data.rules > 0 || data.data.trends > 0)) {
            setNewContentModal({ rules: data.data.rules, trends: data.data.trends });
          }
          sessionStorage.setItem(sessionKey, '1');
        })
        .catch(() => {});
    }
  }, [loading, user, profile, role]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
      </div>
    );
  }

  // Not authenticated (allow /contact for unauthenticated users)
  if (!user && pathname !== '/contact') {
    return null;
  }

  // Account expired �?show full-screen overlay
  if (accountExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">账号已过�?/h1>
          <p className="text-gray-600 mb-6">您的账号使用期限已到，请联系管理员续订以继续使用</p>
          <div className="space-y-3">
            <a
              href="/contact"
              className="block w-full py-2.5 rounded-lg bg-gradient-to-r from-sky-400 to-blue-800 text-white font-medium hover:from-blue-900 hover:to-blue-950 transition-all text-center"
            >
              联系我们
            </a>
            <button
              onClick={() => signOut()}
              className="w-full py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all"
            >
              返回登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for profile check (onboarding guard)
  const onboardingGuardExempt = pathname === '/onboarding' || pathname === '/product-profile' || pathname === '/onboarding-flow';
  if (!profileChecked && !onboardingGuardExempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
      </div>
    );
  }

  // Check access for current route
  // efficiency_user: skip layout-level block �?pages handle their own lock UI
  if (profile?.role !== 'efficiency_user') {
    const feature = getFeatureForRoute(pathname);
    if (feature && !hasAccess(feature)) {
      return (
        <AppShell>
          <div className="flex flex-col items-center justify-center h-96 text-gray-600">
            <p className="text-lg">您没有权限访问此页面</p>
            <button
              onClick={() => router.replace('/')}
              className="mt-4 text-sky-400 hover:text-blue-900 text-sm font-medium"
            >
              返回首页
            </button>
          </div>
        </AppShell>
      );
    }
  }

  // /contact is publicly accessible �?render without AppShell for unauthenticated users
  if (!user && pathname === '/contact') {
    return (
      <div className="flex flex-col min-h-screen">
        {children}
        <Toaster position="top-center" richColors />
        <footer className="shrink-0 bg-blue-950 text-gray-200">
          <div className="max-w-5xl mx-auto px-4 py-6 text-center space-y-3">
            <div className="text-xl font-bold tracking-wide text-white">
              原创自研 · 五度淬判体系
            </div>
            <div className="text-base leading-relaxed">
              五度淬判体系 <span className="mx-1">|</span> 著作权归�?苏飘�?<span className="mx-1">|</span> 未经授权禁止复制、套用、商用改�?
            </div>
            <div className="text-sm text-sky-300/80 leading-relaxed">
              底盘度·扎根度·守线度·造血度·定品度 �?5�?2维度逐层淬判，从能不能跑到值不值得上线
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 pt-2 border-t border-blue-900/60 text-xs text-gray-400 leading-relaxed">
              <Shield className="w-3 h-3 shrink-0" />
              <span>©2026 职盈学海 版权所�?/span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <ExpiryBanner />
      <ProfileIncompleteBanner />
      {/* New content login modal */}
      {newContentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">新内容提�?/h3>
            </div>
            <p className="text-gray-600 mb-4 text-base">
              自您上次登录以来，有以下新内容：
            </p>
            <div className="space-y-3 mb-6">
              {newContentModal.rules > 0 && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <BookOpen className="w-5 h-5 text-yellow-600 shrink-0" />
                  <span className="text-base"><b>{newContentModal.rules}</b> 条新规则解读</span>
                </div>
              )}
              {newContentModal.trends > 0 && role === 'enterprise_admin' && (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600 shrink-0" />
                  <span className="text-base"><b>{newContentModal.trends}</b> 条新行业趋势</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  await fetch('/api/user-read-log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: profile?.id, markAll: true, types: ['rule_update', 'industry_trend'] })
                  });
                  setNewContentModal(null);
                }}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg text-base font-medium hover:bg-gray-200 transition"
              >已知�?/button>
              <button
                onClick={() => { setNewContentModal(null); router.push('/rules-and-trends'); }}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg text-base font-medium hover:bg-blue-700 transition"
              >查看详情</button>
            </div>
          </div>
        </div>
      )}
      <AppShell>{children}</AppShell>
      <Toaster position="top-center" richColors />
      {/* ── Copyright Footer with 五度淬判体系 ── */}
      <footer className="shrink-0 bg-blue-950 text-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center space-y-3">
          {/* Line 1: Brand title */}
          <div className="text-xl font-bold tracking-wide text-white">
            原创自研 · 五度淬判体系
          </div>
          {/* Line 2: Copyright declaration */}
          <div className="text-base leading-relaxed">
            五度淬判体系 <span className="mx-1">|</span> 著作权归�?苏飘�?<span className="mx-1">|</span> 未经授权禁止复制、套用、商用改�?
          </div>
          {/* Line 3: 5�?2维度 tagline */}
          <div className="text-sm text-sky-300/80 leading-relaxed">
            底盘度·扎根度·守线度·造血度·定品度 �?5�?2维度逐层淬判，从能不能跑到值不值得上线
          </div>
          {/* Original legal links */}
          <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 pt-2 border-t border-blue-900/60 text-xs text-gray-400 leading-relaxed">
            <Shield className="w-3 h-3 shrink-0" />
            <span>©2026 职盈学海 版权所�?/span>
            <span className="mx-1">|</span>
            <span>服务主体：苏飘蓉（个人经营者）</span>
            <span className="mx-1">|</span>
            <a href="/terms" target="_blank" className="underline hover:text-gray-300 transition-colors">用户服务协议</a>
            <span className="mx-1">|</span>
            <a href="/privacy" target="_blank" className="underline hover:text-gray-300 transition-colors">隐私政策</a>
            <span className="mx-1">|</span>
            <span>本站服务器部署于中国大陆境内，严格遵守《网络安全法》《个人信息保护法》合法合规运�?/span>
          </div>
        </div>
      </footer>
    </div>
  );
});

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <MainLayoutInner>{children}</MainLayoutInner>;
}
