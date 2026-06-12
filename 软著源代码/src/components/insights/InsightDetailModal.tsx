'use client';

import { INSIGHT_CONFIG, INSIGHT_DARK_CONFIG, type InsightType } from '@/lib/insights';
import { X, ExternalLink, Bell } from 'lucide-react';

interface InsightDetailModalProps {
  insight: {
    id: string;
    insight_type: string;
    title: string;
    summary: string;
    detail: Record<string, unknown>;
    priority: string;
    is_read: boolean;
    created_at: string;
  } | null;
  onClose: () => void;
}

export function InsightDetailModal({ insight, onClose }: InsightDetailModalProps) {
  if (!insight) return null;

  const config = INSIGHT_CONFIG[insight.insight_type as InsightType];
  const darkConfig = INSIGHT_DARK_CONFIG[insight.insight_type as InsightType];
  const timeStr = new Date(insight.created_at).toLocaleString('zh-CN');

  const priorityLabel = insight.priority === 'high' ? '紧�? : insight.priority === 'low' ? '�? : '一�?;
  const priorityColor = insight.priority === 'high' ? 'text-red-400' : insight.priority === 'low' ? 'text-white/40' : 'text-amber-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0F2B46] border border-white/10 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${darkConfig?.bgClass || 'bg-white/5'}`}>
              {config?.icon || '🔔'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${darkConfig?.bgClass || 'bg-white/5'} ${darkConfig?.borderClass || 'border-white/10'} border`}>
                  {config?.label || insight.insight_type}
                </span>
                <span className={`text-xs ${priorityColor}`}>{priorityLabel}</span>
              </div>
              <p className="text-white/40 text-xs mt-1">{timeStr}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <h3 className="text-lg font-semibold text-white">{insight.title}</h3>

          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-white/70 text-sm leading-relaxed">{insight.summary}</p>
          </div>

          {/* Detail JSON */}
          {insight.detail && Object.keys(insight.detail).length > 0 && (
            <div>
              <p className="text-white/50 text-xs font-medium mb-2">详细数据</p>
              <div className="bg-white/5 rounded-lg p-3">
                <pre className="text-white/60 text-xs whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(insight.detail, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 浅色版详情弹窗（用于非深海蓝主题页面�?
export function InsightDetailModalLight({ insight, onClose }: InsightDetailModalProps) {
  if (!insight) return null;

  const config = INSIGHT_CONFIG[insight.insight_type as InsightType];
  const timeStr = new Date(insight.created_at).toLocaleString('zh-CN');

  const priorityLabel = insight.priority === 'high' ? '紧�? : insight.priority === 'low' ? '�? : '一�?;
  const priorityColor = insight.priority === 'high'
    ? 'bg-red-50 text-red-700'
    : 'bg-gray-50 text-gray-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${config?.bgClass || 'bg-gray-50'}`}>
              {config?.icon || '🔔'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config?.bgClass || 'bg-gray-50'} ${config?.textClass || 'text-gray-700'}`}>
                  {config?.label || insight.insight_type}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor}`}>{priorityLabel}</span>
              </div>
              <p className="text-gray-400 text-xs mt-1">{timeStr}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">{insight.title}</h3>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-600 text-sm leading-relaxed">{insight.summary}</p>
          </div>

          {/* Detail JSON */}
          {insight.detail && Object.keys(insight.detail).length > 0 && (
            <div>
              <p className="text-gray-400 text-xs font-medium mb-2">详细数据</p>
              <div className="bg-gray-50 rounded-lg p-3">
                <pre className="text-gray-500 text-xs whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(insight.detail, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
