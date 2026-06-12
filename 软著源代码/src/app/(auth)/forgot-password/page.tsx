'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Zap, Loader2, ArrowLeft, Mail, KeyRound } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const sb = await getSupabaseBrowser();
      const domain = typeof window !== 'undefined' ? window.location.origin : '';
      const { error: authError } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${domain}/login?reset=1`,
      });

      if (authError) {
        if (authError.message.includes('rate limit')) {
          setError('请求过于频繁，请稍后再试');
        } else {
          setError(authError.message);
        }
        return;
      }

      setSent(true);
    } catch {
      setError('发送失败，请重�?);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-800 shadow-lg shadow-sky-400/25 mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">职盈学海</h1>
          <p className="text-lg text-gray-700 mt-1 font-medium">找回密码</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                <Mail className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">重置链接已发�?/h2>
              <p className="text-base text-gray-600 mb-2">
                重置链接已发送至
              </p>
              <p className="text-lg font-semibold text-gray-900 mb-6">{email}</p>
              <p className="text-base text-gray-500 mb-8 leading-relaxed">
                请检查您的收件箱（含垃圾邮件文件夹），点击邮件中的链接即可重置密码�?
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25"
              >
                <ArrowLeft className="w-5 h-5" />
                返回登录
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">忘记密码�?/h2>
              </div>
              <p className="text-base text-gray-500 mb-6 leading-relaxed">
                输入注册时的邮箱，我们将发送重置链接到您的邮箱
              </p>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-base font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">邮箱地址</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入注册时使用的邮�?
                    required
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-colors text-lg"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                  {loading ? '发送中...' : '发送重置链�?}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-base text-orange-500 hover:text-orange-600 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  返回登录
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
