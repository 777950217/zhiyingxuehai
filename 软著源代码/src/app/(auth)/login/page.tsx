'use client';

import React, { useState, useEffect } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Eye, EyeOff, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { validateEmail, validatePassword } from '@/lib/validate';
import Captcha from '@/components/captcha';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [captchaValid, setCaptchaValid] = useState(false);

  // Password reset mode
  const [resetMode, setResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // Detect password reset callback from Supabase
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('type=recovery')) {
        setResetMode(true);
      }
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    (async () => {
      try {
        const sb = await getSupabaseBrowser();
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
          router.replace('/');
        }
      } catch { /* ignore */ }
    })();
  }, [router]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      setError(pwCheck.error || '密码格式不正�?);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一�?);
      return;
    }
    setResetLoading(true);
    try {
      const sb = await getSupabaseBrowser();
      const { error: updateError } = await sb.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message || '重置失败，请重试');
        return;
      }
      setResetDone(true);
    } catch {
      setError('重置失败，请重试');
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Frontend validation
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setError(emailCheck.error || '邮箱格式不正�?);
      return;
    }
    if (!password || password.length < 1) {
      setError('请输入密�?);
      return;
    }
    if (!captchaValid) {
      setError('请正确输入验证码');
      return;
    }
    if (!agreed) {
      setError('请阅读并同意用户协议和隐私政�?);
      return;
    }

    setLoading(true);

    try {
      const sb = await getSupabaseBrowser();
      const { error: authError } = await sb.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        const msg = authError.message;
        if (msg === 'Invalid login credentials') {
          setError('邮箱或密码错误，请检查后重试');
        } else if (msg.includes('Email not confirmed')) {
          setError('邮箱未验证，请检查邮箱中的验证链�?);
        } else if (msg.includes('rate limit') || msg.includes('too many')) {
          setError('登录尝试过于频繁，请5分钟后再�?);
        } else if (msg.includes('锁定') || msg.includes('locked')) {
          setError('账号已锁定，�?5分钟后重�?);
        } else {
          setError('登录失败: ' + msg);
        }
        return;
      }

      // Small delay to let AuthProvider process the session change
      await new Promise(r => setTimeout(r, 300));

      // Check account expiration
      try {
        const sb = await getSupabaseBrowser();
        const { data: { user: authUser } } = await sb.auth.getUser();
        if (authUser) {
          const { data: profile } = await sb
            .from('users')
            .select('user_type, role, expires_at')
            .eq('id', authUser.id)
            .maybeSingle();
          // Check if account has expired
          if (profile?.expires_at && new Date(profile.expires_at) < new Date()) {
            await sb.auth.signOut();
            setError('账号已过期，请联系管理员订阅');
            setLoading(false);
            return;
          }
          if (profile?.role === 'admin') {
            router.push('/admin');
          } else if (profile?.user_type === 'manager') {
            router.push('/dashboard/boss-weekly');
          } else {
            router.push('/');
          }
        } else {
          router.push('/');
        }
      } catch {
        router.push('/');
      }
      router.refresh();
    } catch (err) {
      console.error('[Login] Error:', err);
      setError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-800 shadow-lg shadow-sky-400/25 mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">职盈学海</h1>
          <p className="text-gray-700 mt-1 text-sm font-medium">客服管理智能平台</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          {resetMode ? (
            resetDone ? (
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">密码重置成功</h2>
                <p className="text-base text-gray-500 mb-6">请使用新密码登录</p>
                <button
                  onClick={() => { setResetMode(false); setResetDone(false); }}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-sky-400 to-blue-800 text-white font-medium hover:from-blue-900 hover:to-blue-950 transition-all"
                >
                  去登�?
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-1">设置新密�?/h2>
                <p className="text-gray-500 text-sm mb-6">请输入你的新密码</p>
                {error && (
                  <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-base font-medium">{error}</div>
                )}
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div>
                    <label className="block text-base font-semibold text-gray-700 mb-2">新密�?/label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="至少6�? required className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-colors text-lg" />
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-gray-700 mb-2">确认新密�?/label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="再次输入新密�? required className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-colors text-lg" />
                  </div>
                  <button type="submit" disabled={resetLoading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25">
                    {resetLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {resetLoading ? '提交�?..' : '重置密码'}
                  </button>
                </form>
              </>
            )
          ) : (
          <>
          <h2 className="text-xl font-bold text-gray-900 mb-1">欢迎回来</h2>
          <p className="text-gray-500 text-sm mb-6">登录你的账号继续使用</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6 animate-fade-in-up">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮�?
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  required
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

                <div className="flex items-center justify-between">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-sky-500 hover:text-sky-600 font-medium"
                  >
                    忘记密码�?
                  </Link>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">验证�?/label>
                  <Captcha onValidate={setCaptchaValid} />
                </div>

                {/* 用户协议/隐私政策勾�?*/}
                <label className="flex items-start gap-2 text-sm text-gray-600 mt-1">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setError(''); }}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-400"
                  />
                  <span>我已阅读并同�?
                    <Link href="/terms" target="_blank" className="text-[#2B7DE9] hover:underline font-medium">《用户协议�?/Link>
                    �?
                    <Link href="/privacy" target="_blank" className="text-[#2B7DE9] hover:underline font-medium">《隐私政策�?/Link>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-sky-400 to-blue-800 text-white font-medium hover:from-blue-900 hover:to-blue-950 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-sky-400/25"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? '登录�?..' : '登录'}
                </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            没有账号�?
            <Link href="/register" className="text-blue-900 hover:text-blue-950 font-medium ml-1">
              注册个人�?
            </Link>
          </div>
          <div className="mt-3 text-center">
            <Link
              href="/intro/personal"
              className="text-sm text-sky-600 hover:text-sky-700 font-medium inline-flex items-center gap-1"
            >
              了解产品方案 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
