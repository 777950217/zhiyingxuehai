'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';
import { validatePassword } from '@/lib/validate';

function getPasswordStrength(pwd: string): { label: string; color: string; width: string } {
  if (!pwd) return { label: '', color: '', width: '0%' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { label: '�?, color: 'bg-red-500', width: '33%' };
  if (score <= 3) return { label: '�?, color: 'bg-amber-500', width: '66%' };
  return { label: '�?, color: 'bg-green-500', width: '100%' };
}

export default function ChangePasswordPage() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (currentPassword.length < 6) {
      setError('请输入当前密�?);
      return;
    }
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      setError(pwCheck.error || '新密码格式不正确');
      return;
    }
    if (newPassword === currentPassword) {
      setError('新密码不能与当前密码相同');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一�?);
      return;
    }

    setLoading(true);
    try {
      const sb = await getSupabaseBrowser();

      // Re-authenticate with current password first
      if (!user?.email) {
        setError('无法获取用户信息，请重新登录');
        return;
      }
      const { error: signInError } = await sb.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        setError('当前密码不正�?);
        return;
      }

      // Update password
      const { error: updateError } = await sb.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message || '修改失败，请重试');
        return;
      }

      setSuccess(true);
    } catch {
      setError('修改失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, user]);

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">密码修改成功</h2>
          <p className="text-lg text-gray-600 mb-8">您的密码已更新，下次登录请使用新密码</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25"
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-400/25 mb-4">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">修改密码</h1>
          {profile?.email && (
            <p className="text-base text-gray-500 mt-2">当前账号：{profile.email}</p>
          )}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-base font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                当前密码
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="请输入当前密�?
                  required
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-colors text-lg pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                新密�?
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="至少8位，必须包含字母和数�?
                  required
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-colors text-lg pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* Password strength indicator */}
              {newPassword && (
                <div className="mt-3">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} rounded-full transition-all duration-300`} style={{ width: strength.width }} />
                  </div>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-sm text-gray-500">密码强度</span>
                    <span className={`text-sm font-semibold ${
                      strength.label === '�? ? 'text-red-500' :
                      strength.label === '�? ? 'text-amber-500' : 'text-green-500'
                    }`}>{strength.label}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                确认新密�?
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密�?
                  required
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-colors text-lg pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && newPassword && confirmPassword !== newPassword && (
                <p className="mt-2 text-sm text-red-500 font-medium">两次输入的密码不一�?/p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
              {loading ? '修改�?..' : '确认修改'}
            </button>
          </form>
        </div>

        {/* Bottom links */}
        <div className="mt-6 text-center">
          <Link
            href="/forgot-password"
            className="text-base text-orange-500 hover:text-orange-600 font-medium"
          >
            忘记当前密码�?
          </Link>
        </div>
      </div>
    </div>
  );
}
