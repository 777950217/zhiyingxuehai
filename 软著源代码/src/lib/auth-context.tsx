'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'enterprise_admin' | 'enterprise_manager' | 'staff' | 'personal_user' | 'efficiency_user';

export type CompanyPlan = 'basic' | 'pro' | 'enterprise';

export interface UserProfile {
  id: string;
  email: string;
  companyId: string;
  companyName: string;
  userType: 'small' | 'manager' | 'premium';
  role: UserRole;
  displayName: string;
  remainingCredits: number;
  /** Company's subscription plan: pro=专业�? flagship=旗舰�? basic=个人�?默认 */
  companyPlan: CompanyPlan;
  planEnd: string | null;
  trialEndAt: string | null;
  industry: string | null;
  teamSize: string | null;
  industryProfileCompleted: boolean;
  gender: string;
  bio: string;
  createdAt: string;
  /** Account expiration time */
  expiresAt: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  /** Whether the account has expired (expires_at < now) */
  accountExpired: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  supabase: SupabaseClient | null;
  /** Check if current user has access to a feature */
  hasAccess: (feature: string) => boolean;
  /** Whether the current user is enterprise staff/manager (no billing/contact UI) */
  isEnterpriseStaff: () => boolean;
  /** Authenticated fetch �?auto-injects Authorization Bearer token from current session */
  authFetch: (input: string | URL | globalThis.Request, init?: RequestInit) => Promise<Response>;
  /** Update profile state directly (e.g. after editing in settings) */
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  accountExpired: false,
  signOut: async () => {},
  refreshProfile: async () => {},
  supabase: null,
  hasAccess: () => false,
  isEnterpriseStaff: () => false,
  authFetch: async (_input: string | URL | globalThis.Request, _init?: RequestInit) => new Response(),
  setProfile: () => {},
});

/**
 * Feature access map by role.
 * 三版本角色体�?
 *   admin           = 超级管理�? 全部功能
 *   enterprise_admin = 旗舰版老板, 全部功能含顾问后�?
 *   enterprise_manager = 专业版主�?旗舰版班组长, 管理类全开(受plan-limits数量限制)
 *   staff            = 企业客服, 工作�?AI+培训+知识+工单(只读自己)
 *   personal_user    = 个人�? 学习/AI/知识类功�?
 */
const FEATURE_ACCESS: Record<UserRole, string[]> = {
  admin: [
    // 管理员：全功能访�?
    'dashboard', 'my-workspace', 'companies', 'users', 'agents', 'teams', 'ai-assistant',
    'product-knowledge', 'work-orders', 'customer-records', 'training',
    'membership', 'notifications', 'product-profile', 'admin', 'help',
    'onboarding-industry', 'onboarding-flow', 'consultant', 'templates', 'settings', 'contact', 'reports',
    'practice', 'rules', 'learning-profile', 'cost-alert', 'knowledge-qa', 'business-tools',
    'knowledge-notes', 'learning-path', 'newbie-training',
    'monthly-report', 'rules-and-trends',
    'cockpit', 'cost-baseline', 'profit-funnel', 'approval', 'weekly-report',
    'incentive', 'keyword-monitor', 'self-check',
    'daily-briefing', 'boss-weekly', 'insights', 'roi',
    'kpi-assessment', 'after-sales-guide', 'quality-feedback', 'my-knowledge',
  ],
  enterprise_admin: [
    // 旗舰版老板：全业务功能 + 财务看板（无admin/consultant，那是平台运营后台）
    'dashboard', 'my-workspace', 'companies', 'users', 'agents', 'teams', 'ai-assistant',
    'product-knowledge', 'work-orders', 'customer-records', 'training',
    'membership', 'notifications', 'product-profile', 'help',
    'onboarding-flow', 'templates', 'settings', 'contact', 'reports',
    'practice', 'rules', 'learning-profile', 'cost-alert', 'knowledge-qa', 'business-tools',
    'newbie-training', 'monthly-report', 'learning-path', 'rules-and-trends',
    'cockpit', 'cost-baseline', 'profit-funnel', 'approval', 'weekly-report',
    'incentive', 'keyword-monitor', 'self-check',
    'daily-briefing', 'knowledge-reminder', 'knowledge-notes',
    'team-learning-progress', 'boss-weekly', 'insights', 'roi',
    'kpi-assessment', 'after-sales-guide', 'quality-feedback', 'my-knowledge',
  ],
  enterprise_manager: [
    // 专业版主管：全业务功能（无财务看�?审批/顾问后台�?
    'dashboard', 'my-workspace', 'agents', 'teams', 'ai-assistant',
    'product-knowledge', 'work-orders', 'customer-records', 'training', 'kpi',
    'membership', 'notifications', 'product-profile', 'help',
    'onboarding-flow', 'templates', 'settings', 'contact',
    'practice', 'rules', 'learning-profile', 'cost-alert', 'knowledge-qa', 'reports', 'business-tools',
    'newbie-training', 'monthly-report', 'learning-path', 'rules-and-trends',
    'incentive', 'keyword-monitor', 'self-check',
    'daily-briefing', 'knowledge-notes',
    'team-learning-progress',
    'boss-weekly', 'insights', 'roi',
    'kpi-assessment', 'after-sales-guide', 'quality-feedback', 'my-knowledge',
  ],
  staff: [
    // 客服：个人工作台 + 学习
    'dashboard', 'my-workspace', 'ai-assistant', 'practice', 'training',
    'learning-profile', 'knowledge-qa', 'learning-path',
    'work-orders', 'notifications', 'help', 'settings', 'contact',
    'newbie-training', 'after-sales-guide', 'quality-feedback', 'my-knowledge',
  ],
  personal_user: [
    // 个人版：课程学习 + AI助手 + 自我提升（无管理工具�?
    'dashboard', 'ai-assistant', 'practice',
    'help', 'templates', 'settings', 'contact',
    'learning-profile', 'knowledge-notes', 'knowledge-qa', 'learning-path', 'membership',
    'notifications', 'growth-dashboard', 'management-plan',
    'onboarding-industry', 'product-profile',
    'kpi-assessment', 'after-sales-guide', 'quality-feedback', 'my-knowledge',
  ],
  efficiency_user: [
    // 99效率版：AI急救�?+ 3项AI体检 + 话术练兵�?+ 产品档案 + 模板库（无管理课�?深度诊断/KPI工具�?
    'dashboard', 'ai-assistant', 'practice',
    'help', 'templates', 'settings', 'contact',
    'learning-profile', 'knowledge-notes', 'knowledge-qa', 'membership',
    'notifications', 'growth-dashboard', 'management-plan',
    'onboarding-industry', 'product-profile',
    'kpi-assessment', 'after-sales-guide', 'quality-feedback', 'my-knowledge',
  ],
};

/** Route path �?feature mapping */
const ROUTE_FEATURE_MAP: Record<string, string> = {
  '/': 'dashboard',
  '/companies': 'companies',
  '/users': 'users',
  '/agents': 'agents',
  '/teams': 'teams',
  '/ai-assistant': 'ai-assistant',
  '/product-knowledge': 'product-knowledge',
  '/work-orders': 'work-orders',
  '/customer-records': 'customer-records',
  '/training': 'training',
  '/newbie-training': 'newbie-training',
  '/kpi': 'kpi',
  '/kpi-assessment': 'kpi-assessment',
  '/after-sales-guide': 'after-sales-guide',
  '/quality-feedback': 'quality-feedback',
  '/my-knowledge': 'my-knowledge',
  '/membership': 'membership',
  '/subscription': 'membership',
  '/admin': 'admin',
  '/notifications': 'notifications',
  '/product-profile': 'product-profile',
  '/profile': 'product-profile',
  '/onboarding': 'onboarding',
  '/onboarding-industry': 'onboarding-industry',
  '/onboarding-flow': 'onboarding-flow',
  '/consultant': 'consultant',
  '/templates': 'templates',
  '/help': 'help',
  '/practice': 'practice',
  '/knowledge-notes': 'knowledge-notes',
  '/learning-center': 'learning-path',
  '/learning-path': 'learning-path',
  '/rules': 'rules',
  '/learning-profile': 'learning-profile',
  '/cost-alert': 'cost-alert',
  '/knowledge-qa': 'knowledge-qa',
  '/my-workspace': 'my-workspace',
  '/settings': 'settings',
  '/contact': 'contact',
  '/business-tools': 'business-tools',
  '/reports': 'reports',
  '/growth-dashboard': 'growth-dashboard',
  '/data-input': 'learning-path',
  '/ai-reports': 'learning-path',
  '/chat-check': 'learning-path',
  '/cda-analysis': 'learning-path',
  '/change-password': 'settings',
  '/monthly-report': 'monthly-report',
  '/cockpit': 'cockpit',
  '/cost-baseline': 'cost-baseline',
  '/profit-funnel': 'profit-funnel',
  '/approval': 'approval',
  '/weekly-report': 'weekly-report',
  '/incentive': 'incentive',
  '/keyword-monitor': 'keyword-monitor',
  '/self-check': 'self-check',
  '/knowledge-reminder': 'knowledge-reminder',
  '/management-plan': 'management-plan',
  '/dashboard/boss-weekly': 'boss-weekly',
  '/insights': 'insights',
  '/roi-ledger': 'roi',
  '/rules-and-trends': 'rules-and-trends',
  '/cockpit-tutorial': 'cockpit',
  '/team-learning-progress': 'team-learning-progress',
};

export function getFeatureForRoute(pathname: string): string | undefined {
  // Exact match first
  if (ROUTE_FEATURE_MAP[pathname]) return ROUTE_FEATURE_MAP[pathname];
  // Prefix match for sub-routes
  for (const [route, feature] of Object.entries(ROUTE_FEATURE_MAP)) {
    if (route !== '/' && pathname.startsWith(route)) return feature;
  }
  return undefined;
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'admin': return '超级管理�?;
    case 'enterprise_admin': return '旗舰版老板';
    case 'enterprise_manager': return '主管/班组�?;
    case 'personal_user': return '个人版用�?;
    case 'efficiency_user': return '99效率版用�?;
    case 'staff': return '客服';
  }
}

export function getRoleBadgeStyle(role: UserRole): string {
  switch (role) {
    case 'admin': return 'bg-red-100 text-red-700';
    case 'enterprise_admin': return 'bg-sky-100 text-blue-900';
    case 'enterprise_manager': return 'bg-blue-100 text-blue-700';
    case 'personal_user': return 'bg-green-100 text-green-700';
    case 'efficiency_user': return 'bg-cyan-100 text-cyan-700';
    case 'staff': return 'bg-gray-100 text-gray-600';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountExpired, setAccountExpired] = useState(false);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const initRef = useRef(false);
  const profileLoadRef = useRef(0); // throttle: don't reload within 30s
  const profileCacheRef = useRef<{ data: UserProfile | null; ts: number } | null>(null);
  const loadingDoneRef = useRef(false); // track if initial loading is complete

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      try {
        const sb = await getSupabaseBrowser();
        setSupabase(sb);

        const { data: { session: s } } = await sb.auth.getSession();
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          loadProfile(sb, s.user.id);
        }
        loadingDoneRef.current = true;
        setLoading(false);

        const { data: { subscription } } = sb.auth.onAuthStateChange(
          (_event, s2) => {
            // Shallow compare session to avoid unnecessary re-renders on token refresh
            let sessionChanged = false;
            let userChanged = false;
            setSession(prev => {
              if (prev && s2 && prev.access_token === s2.access_token) return prev;
              sessionChanged = true;
              return s2;
            });
            setUser(prev => {
              const newUser = s2?.user ?? null;
              if (prev && newUser && prev.id === newUser.id) return prev;
              userChanged = true;
              return newUser;
            });
            // Only reload profile if the session or user actually changed
            if (userChanged || sessionChanged) {
              if (s2?.user) {
                loadProfile(sb, s2.user.id);
              } else {
                setProfile(null);
              }
            }
            // Only set loading=false if it's still true (initial load)
            if (!loadingDoneRef.current) {
              loadingDoneRef.current = true;
              setLoading(false);
            }
          }
        );

        return () => { subscription.unsubscribe(); };
      } catch {
        setLoading(false);
      }
    })();
  }, []);

  const loadProfile = useCallback(async (sb: SupabaseClient, userId: string, forceRefresh = false) => {
    // Client-side TTL cache: return cached profile if still fresh (30s)
    const now = Date.now();
    if (!forceRefresh && profileCacheRef.current && (now - profileCacheRef.current.ts < 30000)) {
      // Cache hit �?skip network request entirely
      return;
    }
    // Throttle: don't reload profile within 2 seconds (for rapid onAuthStateChange events)
    if (!forceRefresh && now - profileLoadRef.current < 2000) return;
    profileLoadRef.current = now;

    try {
      const res = await fetch(`/api/auth/profile?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        const newProfile = data.profile;

        // Check account expiration
        if (newProfile?.expiresAt && new Date(newProfile.expiresAt) < new Date()) {
          setAccountExpired(true);
        } else {
          setAccountExpired(false);
        }

        // Update client-side cache
        profileCacheRef.current = { data: newProfile, ts: Date.now() };

        // Shallow-compare to avoid unnecessary re-renders (e.g., token refresh)
        setProfile(prev => {
          if (!prev || !newProfile) return newProfile;
          if (
            prev.id === newProfile.id &&
            prev.role === newProfile.role &&
            prev.companyId === newProfile.companyId &&
            prev.displayName === newProfile.displayName &&
            prev.remainingCredits === newProfile.remainingCredits &&
            prev.companyPlan === newProfile.companyPlan &&
            prev.planEnd === newProfile.planEnd &&
            prev.trialEndAt === newProfile.trialEndAt &&
            prev.industry === newProfile.industry &&
            prev.teamSize === newProfile.teamSize &&
            prev.industryProfileCompleted === newProfile.industryProfileCompleted &&
            prev.gender === newProfile.gender &&
            prev.bio === newProfile.bio &&
            prev.expiresAt === newProfile.expiresAt
          ) {
            return prev; // same data, keep old reference �?no re-render
          }
          return newProfile;
        });
      } else if (res.status === 404) {
        // User not found in users table �?clear profile so layout can handle it
        console.warn('Auth profile not found for user:', userId);
        setProfile(null);
      }
    } catch (err) {
      // Profile load failed �?retry once after 2s, but don't block rendering
      console.warn('Profile load failed, will retry:', err);
      setTimeout(async () => {
        try {
          const retryRes = await fetch(`/api/auth/profile?user_id=${userId}`);
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            setProfile(retryData.profile);
          }
        } catch { /* give up */ }
      }, 2000);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    // Clear all local/session storage so stale state never persists
    if (typeof window !== 'undefined') {
      // Clear app-specific localStorage keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('ai_usage') || key.startsWith('onboarding') || key.startsWith('sb-'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      // Clear all sessionStorage
      sessionStorage.clear();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setAccountExpired(false);
    profileCacheRef.current = null;
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user && supabase) {
      await loadProfile(supabase, user.id, true);
    }
  }, [user, supabase, loadProfile]);

  const hasAccess = useCallback((feature: string): boolean => {
    const currentRole = profile?.role || 'staff';
    const allowed = FEATURE_ACCESS[currentRole];
    if (!allowed) return false;
    return allowed.includes(feature);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role]);

  /** Whether the current user is an enterprise employee (staff or manager) �?no billing UI */
  const isEnterpriseStaff = useCallback((): boolean => {
    return profile?.role === 'staff' || profile?.role === 'enterprise_manager' || profile?.role === 'personal_user' || profile?.role === 'efficiency_user';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role]);

  /** Authenticated fetch �?automatically injects Authorization Bearer token */
  const authFetch = useCallback(async (input: string | URL | globalThis.Request, init?: RequestInit): Promise<Response> => {
    const token = session?.access_token;
    const headers = new Headers(init?.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(input, { ...init, headers });
  }, [session?.access_token]);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, accountExpired, signOut, refreshProfile, supabase, hasAccess, isEnterpriseStaff, authFetch, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
