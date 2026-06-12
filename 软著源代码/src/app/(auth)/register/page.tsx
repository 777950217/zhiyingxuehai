'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Zap, Eye, EyeOff, Loader2, ArrowLeft, ArrowRight, Users } from 'lucide-react';
import { validateEmail, validatePassword, validatePhone, validateCode } from '@/lib/validate';
import Captcha from '@/components/captcha';


export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-900" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2
  const [role, setRole] = useState<string>(inviteToken ? 'staff' : 'efficiency_user');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');

  // Invitation state
  const [inviteInfo, setInviteInfo] = useState<{ companyName: string; inviterName: string } | null>(null);
  const [inviteChecked, setInviteChecked] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [redemptionCode, setRedemptionCode] = useState('');
  const [captchaValid, setCaptchaValid] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    (async () => {
      try {
        const sb = await getSupabaseBrowser();
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
          router.replace('/onboarding');
        }
      } catch { /* ignore */ }
    })();
  }, [router]);

  // Validate invitation token
  useEffect(() => {
    if (!inviteToken) { setInviteChecked(true); return; }
    (async () => {
      try {
        const res = await fetch(`/api/invitations/${inviteToken}`);
        const data = await res.json();
        if (res.ok && data.data?.status === 'pending') {
          setInviteInfo({ companyName: data.data.company_name || '企业', inviterName: data.data.inviter_name || '管理�? });
        } else {
          setError(data.error || '邀请链接已失效或已使用');
        }
      } catch {
        setError('邀请链接验证失�?);
      }
      setInviteChecked(true);
    })();
  }, [inviteToken]);

  const validateStep1 = () => {
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) return emailCheck.error || '邮箱格式不正�?;
    if (!password) return '请输入密�?;
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) return pwCheck.error || '密码格式不正�?;
    if (password !== confirmPassword) return '两次密码不一�?;
    return '';
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaValid) { setError('请正确输入验证码'); return; }
    const codeCheck = validateCode(redemptionCode);
    if (!codeCheck.valid) { setError(codeCheck.error || '兑换码格式不正确'); return; }
    if (phone) {
      const phoneCheck = validatePhone(phone);
      if (!phoneCheck.valid) { setError(phoneCheck.error || '手机号格式不正确'); return; }
    }
    setError('');
    setLoading(true);

    try {
      // 1. Register via our API (creates user record with selected role)
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role: role,
          phone,
          inviteToken: inviteToken || undefined,
          redemptionCode: redemptionCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '注册失败');
        return;
      }

      // 2. Sign in with Supabase Auth
      const sb = await getSupabaseBrowser();
      const { error: authError } = await sb.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Registration succeeded but auto-login failed �?that's OK, redirect to login
        setError('');
        setTimeout(() => {
          router.push('/login');
        }, 500);
        return;
      }

      // Small delay to let AuthProvider process the session change
      await new Promise(r => setTimeout(r, 300));
      router.push('/onboarding');
      router.refresh();
    } catch {
      setError('注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-800 shadow-lg shadow-sky-400/25 mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">创建账号</h1>
          <p className="text-gray-500 mt-1">开通你的客服管理智能平�?/p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex items-center gap-1.5 text-sm font-medium ${step >= 1 ? 'text-blue-900' : 'text-gray-400'}`}>
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-r from-sky-400 to-blue-800">1</span>
            账号信息
          </div>
          <div className={`flex-1 h-0.5 rounded ${step >= 2 ? 'bg-sky-400' : 'bg-gray-200'}`} />
          <div className={`flex items-center gap-1.5 text-sm font-medium ${step >= 2 ? 'text-blue-900' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'text-white bg-gradient-to-r from-sky-400 to-blue-800' : 'text-gray-500 bg-gray-200'}`}>2</span>
            完成注册
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-6 animate-fade-in-up">
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
                    placeholder="至少6�?
                    required
                    minLength={6}
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
                <p className="text-xs text-gray-500 mt-1">密码至少8位，必须包含字母和数�?/p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">确认密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none transition-colors text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-sky-400 to-blue-800 text-white font-medium hover:from-blue-900 hover:to-blue-950 transition-all flex items-center justify-center gap-2 shadow-md shadow-sky-400/25"
              >
                下一�?
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              {/* Invitation banner */}
              {inviteToken && inviteInfo && (
                <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 mb-2">
                  <div className="flex items-center gap-2 text-blue-900 font-medium mb-1">
                    <Users className="w-4 h-4" />
                    邀请注�?
                  </div>
                  <p className="text-sm text-gray-600">
                    你已�?<span className="font-medium text-blue-900">{inviteInfo.inviterName}</span> 邀请加�?<span className="font-medium text-blue-900">{inviteInfo.companyName}</span>
                  </p>
                  <p className="text-xs text-gray-700 mt-1">注册后将自动加入团队，角色为客服</p>
                </div>
              )}

              {/* 版本选择 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">选择版本</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('efficiency_user')}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${role === 'efficiency_user' ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700 font-medium">¥99/�?/span>
                      <span className="font-semibold text-sm text-gray-900">效率�?/span>
                    </div>
                    <p className="text-xs text-gray-500">AI急救�?3项体检+话术练兵�?产品档案</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('personal_user')}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${role === 'personal_user' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">¥980买断</span>
                      <span className="font-semibold text-sm text-gray-900">管理�?/span>
                    </div>
                    <p className="text-xs text-gray-500">25课系统管理课�?深度AI诊断+KPI工具</p>
                    <p className="text-xs text-amber-600 mt-0.5">已购效率版可抵扣99元，实付881�?/p>
                  </button>
                </div>
              </div>

              {/* 兑换码（唯一注册方式�?*/}
              <div className="space-y-3">
                <div className={`p-3 rounded-lg border text-sm ${role === 'efficiency_user' ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  {role === 'efficiency_user'
                    ? '效率版：AI急救站（不限次）+ 3项AI体检 + 话术练兵�?+ 产品档案 + 模板�?�?后续可抵�?9元开通管理版'
                    : '管理版：25课系统管理课�?+ 全部AI体检 + KPI规划�?+ 管理工具�?}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    兑换�?<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={redemptionCode}
                    onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                    placeholder="请输入兑换码（必填）"
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none transition-colors text-sm tracking-widest font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">兑换码由管理员提供，注册时必�?/p>
                </div>
              </div>

              {/* 专业�?旗舰版引�?*/}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 space-y-2">
                <p className="text-sm font-medium text-blue-900">需要专业版或旗舰版�?/p>
                <p className="text-xs text-gray-600">专业版和旗舰版由管理员线下开通，不支持自助注册。请联系客服或销售人员获取账号�?/p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:text-sky-700"
                >
                  咨询开通方�?�?
                </Link>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">手机�?<span className="text-gray-400">(选填)</span></label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none transition-colors text-sm"
                />
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-600 mb-4 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400"
                />
                <span>
                  我已阅读并同�?
                  <Link href="/terms" target="_blank" className="text-[#2B7DE9] hover:underline font-medium">《用户服务协议�?/Link>
                  �?
                  <Link href="/privacy" target="_blank" className="text-[#2B7DE9] hover:underline font-medium">《隐私政策�?/Link>
                </span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">验证�?/label>
                <Captcha onValidate={setCaptchaValid} />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  上一�?
                </button>
                <button
                  type="submit"
                  disabled={loading || !agreed || !captchaValid}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-sky-400 to-blue-800 text-white font-medium hover:from-blue-900 hover:to-blue-950 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-sky-400/25"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? '注册�?..' : '创建账号'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            已有账号�?
            <Link href="/login" className="text-blue-900 hover:text-blue-950 font-medium ml-1">
              立即登录
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
        </div>
      </div>
    </div>
  );
}
