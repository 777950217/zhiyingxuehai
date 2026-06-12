'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

// ─── Industry options ───
const INDUSTRIES = [
  '卫浴/建材', '家具/家居', '灯具/照明', '服装/服饰',
  '美妆/护肤', '食品/生鲜', '3C数码', '母婴/童装',
  '宠物用品', '其他电商', '实体零售', '服务行业', '其他',
];

const TEAM_SIZES = [
  '1人（我自己）', '2-3�?, '4-5�?, '6-10�?,
];

export interface IndustryProfile {
  industry: string;
  teamSize: string;
}

const STORAGE_KEY = 'user-industry-profile';

/** Read industry profile from localStorage (used by AI prompts etc.) */
export function getIndustryProfile(): IndustryProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface IndustryDialogProps {
  onComplete: (profile: IndustryProfile) => void;
}

export default function IndustryDialog({ onComplete }: IndustryDialogProps) {
  const { profile, authFetch } = useAuth();
  const [industry, setIndustry] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = industry && teamSize && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !profile) return;
    setSubmitting(true);
    try {
      // 1. Save to localStorage
      const data: IndustryProfile = { industry, teamSize };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      // 2. Save to backend
      await authFetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          industry,
          teamSize,
        }),
      });

      onComplete(data);
    } catch (err) {
      console.error('Failed to save industry profile:', err);
      // Still complete locally even if API fails
      const data: IndustryProfile = { industry, teamSize };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      onComplete(data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0a1f33] border border-[#1a3a5c] rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
        {/* Title */}
        <h2 className="text-xl font-bold text-white text-center mb-2">
          欢迎来到职盈学海�?
        </h2>
        <p className="text-slate-400 text-center text-sm mb-6">
          先告诉我你是做什么的，AI会为你量身定制方�?
        </p>

        {/* Industry selection */}
        <div className="mb-6">
          <label className="text-slate-300 text-sm font-medium mb-3 block">
            你的行业
          </label>
          <div className="grid grid-cols-2 gap-2">
            {INDUSTRIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setIndustry(item)}
                className={`px-3 py-2.5 rounded-lg text-sm border transition-all text-left ${
                  industry === item
                    ? 'border-sky-400 bg-sky-400/10 text-sky-300'
                    : 'border-[#1a3a5c] bg-[#0F2B46]/60 text-slate-400 hover:border-[#0d2a42] hover:text-slate-300'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Team size selection */}
        <div className="mb-8">
          <label className="text-slate-300 text-sm font-medium mb-3 block">
            团队人数
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TEAM_SIZES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTeamSize(item)}
                className={`px-3 py-2.5 rounded-lg text-sm border transition-all text-center ${
                  teamSize === item
                    ? 'border-sky-400 bg-sky-400/10 text-sky-300'
                    : 'border-[#1a3a5c] bg-[#0F2B46]/60 text-slate-400 hover:border-[#0d2a42] hover:text-slate-300'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
            canSubmit
              ? 'bg-sky-500 text-white hover:bg-sky-400 active:scale-[0.98]'
              : 'bg-[#1a3a5c] text-[#0d2a42] cursor-not-allowed'
          }`}
        >
          {submitting ? '保存�?..' : '开始使�?}
        </button>
      </div>
    </div>
  );
}
