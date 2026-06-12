'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ConsultDialog } from '@/components/consult-dialog';

interface UpgradeHintProps {
  title?: string;
  description?: string;
  ctaText?: string;
}

export default function UpgradeHint({
  title = '💡 想在线落地？',
  description = '开通专业版，将AI生成的方案分配给团队、自动追踪完成率、在线台账管控',
  ctaText = '咨询开通',
}: UpgradeHintProps) {
  const { profile } = useAuth();
  const [consultOpen, setConsultOpen] = useState(false);

  // Only show for personal_user
  if (profile?.role !== 'personal_user') return null;

  return (
    <>
      <div className="mt-4 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-blue-900">{title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{description}</div>
        </div>
        <button
          onClick={() => setConsultOpen(true)}
          className="shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-900 text-white text-xs font-medium hover:bg-blue-800 transition-colors"
        >
          <MessageCircle className="w-3 h-3" />
          {ctaText}
        </button>
      </div>
      <ConsultDialog open={consultOpen} onOpenChange={setConsultOpen} title="咨询开通" />
    </>
  );
}
