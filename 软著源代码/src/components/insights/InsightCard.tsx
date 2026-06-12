'use client';

import { INSIGHT_CONFIG, type InsightType } from '@/lib/insights';
import { Bell, ChevronRight } from 'lucide-react';

interface InsightCardProps {
  id: string;
  insightType: string;
  title: string;
  summary: string;
  isRead: boolean;
  createdAt: string;
  onClick?: () => void;
}

export function InsightCard({
  insightType,
  title,
  summary,
  isRead,
  createdAt,
  onClick,
}: InsightCardProps) {
  const config = INSIGHT_CONFIG[insightType as InsightType];
  const timeStr = formatTime(createdAt);

  return (
    <div
      className={`rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
        isRead
          ? 'bg-white border-gray-100'
          : `${config?.bgClass || 'bg-sky-50'} ${config?.borderClass || 'border-sky-200'}`
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
          config?.bgClass || 'bg-gray-50'
        }`}>
          {config?.icon || '🔔'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              config?.bgClass || 'bg-gray-50'
            } ${config?.textClass || 'text-gray-700'}`}>
              {config?.label || insightType}
            </span>
            {!isRead && (
              <span className="w-2 h-2 bg-red-400 rounded-full shrink-0" />
            )}
            <span className="text-gray-400 text-xs ml-auto">{timeStr}</span>
          </div>
          <p className={`text-sm font-medium mb-1 ${isRead ? 'text-gray-500' : 'text-gray-800'}`}>
            {title}
          </p>
          <p className="text-xs text-gray-400 line-clamp-2">{summary}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
      </div>
    </div>
  );
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return '刚刚';
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return d.toLocaleDateString('zh-CN');
}

// 首页精简版洞察卡片（用于首页展示最�?条）
export function InsightCardCompact({
  insightType,
  title,
  isRead,
  onClick,
}: {
  insightType: string;
  title: string;
  isRead: boolean;
  onClick?: () => void;
}) {
  const config = INSIGHT_CONFIG[insightType as InsightType];

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <span className="text-base shrink-0">{config?.icon || '🔔'}</span>
      <p className={`text-sm flex-1 min-w-0 truncate ${isRead ? 'text-white/50' : 'text-white/90'}`}>
        {title}
      </p>
      {!isRead && <span className="w-2 h-2 bg-red-400 rounded-full shrink-0" />}
    </div>
  );
}

// 空状�?
export function InsightEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Bell className="w-10 h-10 text-gray-300 mb-3" />
      <p className="text-gray-400 text-sm">暂无洞察推�?/p>
      <p className="text-gray-300 text-xs mt-1">系统会自动分析数据并推送洞�?/p>
    </div>
  );
}
