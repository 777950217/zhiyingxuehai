'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { UserCircle, Pencil, Check, X, Mail, Shield, Calendar, Lock, Eye, EyeOff, ChevronDown, Users, Plus, ArrowRight, Share2, Copy, CheckCircle } from 'lucide-react';

interface ProfileData {
  displayName: string;
  email: string;
  role: string;
  gender: string;
  bio: string;
  industry: string;
  teamSize: string;
  createdAt: string;
  expiresAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: '管理�?,
  enterprise_admin: '企业管理�?,
  enterprise_manager: '企业主管',
  staff: '员工',
  personal_user: '个人学员',
};

const INDUSTRY_OPTIONS = ['卫浴', '家具', '建材', '家电', '服装', '餐饮', '其他'];
const TEAM_SIZE_OPTIONS = ['1�?, '2-5�?, '6-10�?, '11-20�?, '20人以�?];
const GENDER_OPTIONS = ['�?, '�?, '保密'];

export default function SettingsPage() {
  const { profile, setProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Password dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);

  const [profileData, setProfileData] = useState<ProfileData>({
    displayName: '',
    email: '',
    role: '',
    gender: '保密',
    bio: '',
    industry: '',
    teamSize: '',
    createdAt: '',
    expiresAt: '',
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        displayName: profile.displayName || '',
        email: profile.email || '',
        role: profile.role || '',
        gender: profile.gender || '保密',
        bio: profile.bio || '',
        industry: profile.industry || '',
        teamSize: profile.teamSize || '',
        createdAt: profile.createdAt || '',
        expiresAt: ((profile as unknown) as Record<string, unknown>).expiresAt as string || '',
      });
    }
  }, [profile]);

  // Hash-based scroll to section (#password / #profile / #team)
  const scrollToHash = useCallback(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, []);

  useEffect(() => {
    scrollToHash();
    const handleHashChange = () => scrollToHash();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [scrollToHash]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (field: string, value: string) => {
    setSaving(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const body: Record<string, string> = { userId: profile?.id || '' };
      body[field] = value;

      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const json = await res.json();
        if (setProfile && json.profile) {
          setProfile(json.profile);
        }
        setProfileData(prev => ({ ...prev, [field]: value }));
        showToast('保存成功');
      } else {
        const err = await res.json();
        showToast(err.error || '保存失败');
      }
    } catch {
      showToast('保存失败，请重试');
    } finally {
      setSaving(false);
      setEditingField(null);
    }
  };

  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const confirmEdit = (field: string) => {
    handleSave(field, editValue);
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('请填写所有字�?);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('新密码至�?�?);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('两次密码不一�?);
      return;
    }
    setPasswordSaving(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message);
      } else {
        showToast('密码修改成功');
        setShowPasswordDialog(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPasswordError('修改失败，请重试');
    } finally {
      setPasswordSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0].toUpperCase();
  };

  const renderEditableRow = (
    field: string,
    label: string,
    value: string,
    options?: string[],
    placeholder?: string,
  ) => {
    const isEditing = editingField === field;
    const displayValue = value || '未设�?;

    return (
      <div className="py-4 border-b border-gray-100 last:border-b-0">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-gray-500 mb-1">{label}</div>
            {isEditing ? (
              options ? (
                <div className="flex items-center gap-2">
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200 text-gray-900 bg-white text-sm"
                  >
                    <option value="">未设�?/option>
                    {options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => confirmEdit(field)}
                    disabled={saving}
                    className="p-2 rounded-lg bg-[#0F2B46] text-white hover:bg-[#1a3a5c] transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    maxLength={field === 'bio' ? 100 : 50}
                    placeholder={placeholder || `输入${label}`}
                    className="flex-1 px-3 py-2 rounded-lg border border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200 text-gray-900 bg-white text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmEdit(field);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                  />
                  <button
                    onClick={() => confirmEdit(field)}
                    disabled={saving}
                    className="p-2 rounded-lg bg-[#0F2B46] text-white hover:bg-[#1a3a5c] transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            ) : (
              <div className="flex items-center gap-2">
                <span className={`text-base ${value ? 'text-gray-900' : 'text-gray-400'}`}>
                  {displayValue}
                </span>
                {field === 'bio' && value && (
                  <span className="text-xs text-gray-400">({value.length}/100)</span>
                )}
                <button
                  onClick={() => startEdit(field, value)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                  title="编辑"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-3xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-pulse">
          {toast}
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900">个人中心</h1>

      {/* ===== Profile Card ===== */}
      <div id="profile" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Avatar + Name Header */}
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-8 text-white">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold text-white border-4 border-white/30">
              {getInitials(profileData.displayName)}
            </div>
            <div>
              <div className="text-xl font-bold">{profileData.displayName || '未设置昵�?}</div>
              <div className="text-sky-100 text-sm mt-1">
                {ROLE_LABELS[profileData.role] || profileData.role}
              </div>
              {profileData.bio && (
                <div className="text-sky-200 text-sm mt-2 line-clamp-2 max-w-sm">{profileData.bio}</div>
              )}
            </div>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="px-6 py-2">
          {renderEditableRow('displayName', '昵称', profileData.displayName, undefined, '输入昵称')}
          {renderEditableRow('gender', '性别', profileData.gender, GENDER_OPTIONS)}
          {renderEditableRow('bio', '个性签�?, profileData.bio, undefined, '一句话介绍自己')}
          {renderEditableRow('industry', '行业', profileData.industry, INDUSTRY_OPTIONS)}
          {renderEditableRow('teamSize', '团队规模', profileData.teamSize, TEAM_SIZE_OPTIONS)}
        </div>
      </div>

      {/* ===== Account Info (Read-only) ===== */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-500" />
          账号信息
        </h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500 w-20">邮箱</span>
            <span className="text-base text-gray-900">{profileData.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <UserCircle className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500 w-20">角色</span>
            <span className="text-base text-gray-900">{ROLE_LABELS[profileData.role] || profileData.role}</span>
          </div>
          {profileData.createdAt && (
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500 w-20">注册时间</span>
              <span className="text-base text-gray-900">{new Date(profileData.createdAt).toLocaleDateString()}</span>
            </div>
          )}
          {profileData.expiresAt && (
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500 w-20">到期时间</span>
              <span className={`text-base ${new Date(profileData.expiresAt) > new Date() ? 'text-gray-900' : 'text-red-600 font-medium'}`}>
                {new Date(profileData.expiresAt).toLocaleDateString()}
                {new Date(profileData.expiresAt) > new Date() ? '' : '（已过期�?}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ===== Security ===== */}
      <div id="password" className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-gray-500" />
          安全设置
        </h2>
        <button
          onClick={() => setShowPasswordDialog(true)}
          className="px-5 py-2.5 bg-[#2B7DE9] text-white rounded-lg hover:bg-[#1a6dd4] transition-colors text-sm font-medium"
        >
          修改密码
        </button>
      </div>

      {/* ===== 推荐好友 ===== */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-blue-500" />
          推荐好友
        </h2>
        <p className="text-sm text-gray-500 mb-4">邀请同行一起使用职盈学海，提升团队管理效率</p>
        <button
          onClick={() => setShowReferralDialog(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all text-sm font-medium flex items-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          推荐给好�?
        </button>
      </div>

      {/* ===== Team Management (ent_manager/ent_admin only) ===== */}
      {(profile?.role === 'enterprise_manager' || profile?.role === 'enterprise_admin') && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            团队管理
          </h2>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">管理坐席账号，添加或编辑团队成员</p>
            <a
              href="/team/seats"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2B7DE9] text-white rounded-lg hover:bg-[#1a6dd4] transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              坐席管理
            </a>
          </div>
          <a
            href="/team/seats"
            className="flex items-center justify-between p-4 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">坐席列表与添�?/div>
                <div className="text-xs text-gray-500">查看坐席余量、添�?编辑/停用坐席</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </a>
        </div>
      )}

      {/* ===== Password Dialog ===== */}
      {showPasswordDialog && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <h3 className="text-lg font-bold text-gray-900">修改密码</h3>

            {passwordError && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{passwordError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">当前密码</label>
                <div className="relative">
                  <input
                    type={showOldPwd ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-200 text-gray-900 pr-10"
                    placeholder="输入当前密码"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPwd(!showOldPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showOldPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1.5">新密�?/label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-200 text-gray-900 pr-10"
                    placeholder="至少6�?
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1.5">确认新密�?/label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-200 text-gray-900"
                  placeholder="再次输入新密�?
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPasswordError('');
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={passwordSaving}
                className="px-5 py-2 rounded-lg bg-[#0F2B46] text-white hover:bg-[#1a3a5c] transition-colors text-sm font-medium disabled:opacity-50"
              >
                {passwordSaving ? '修改�?..' : '确认修改'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 推荐好友弹窗 */}
      {showReferralDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowReferralDialog(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">推荐好友</h3>
              <button onClick={() => setShowReferralDialog(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                我正在使用「职盈学海」客服管理平台，系统内置AI急救站、知识库、质检管理等实用工具，帮我大幅提升了工作效率，推荐给你也试试！
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-2">添加微信了解更多�?/p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-blue-700">xxxx</span>
                <button
                  onClick={() => { navigator.clipboard.writeText('xxxx'); }}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  复制微信�?
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                const text = '我正在使用「职盈学海」客服管理平台，系统内置AI急救站、知识库、质检管理等实用工具，推荐给你也试试！添加微信 xxxx 了解更多';
                navigator.clipboard.writeText(text);
              }}
              className="w-full py-2.5 bg-[#0F2B46] text-white rounded-lg hover:bg-[#1a3a5c] text-sm font-medium"
            >
              复制推荐文案
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
