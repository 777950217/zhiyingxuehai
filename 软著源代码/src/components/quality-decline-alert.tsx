'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, X, BookOpen } from 'lucide-react';
import { getQualityDeclineRecommendation } from '@/lib/tool-course-map';

const STORAGE_KEY = 'quality-decline-dismissed';

/**
 * 质检分数连续下降→自动弹窗推荐相关课�?
 * 在质检页面(my-quality)中使�?
 */
export default function QualityDeclineAlert() {
  const [show, setShow] = useState(false);
  const recommendation = getQualityDeclineRecommendation();

  useEffect(() => {
    // 检查质检分数是否连续下降
    const checkDecline = () => {
      try {
        const historyStr = localStorage.getItem('quality-score-history');
        if (!historyStr) return;

        const history: number[] = JSON.parse(historyStr);
        if (history.length < 3) return;

        // 检查最�?次是否连续下�?
        const recent = history.slice(-3);
        if (recent[0] > recent[1] && recent[1] > recent[2]) {
          // 检查是否已经关闭过
          const dismissed = localStorage.getItem(STORAGE_KEY);
          if (dismissed) {
            const dismissedDate = new Date(dismissed);
            const hoursSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60);
            // 24小时内不再提�?
            if (hoursSinceDismissed < 24) return;
          }
          setShow(true);
        }
      } catch {
        // ignore
      }
    };

    checkDecline();
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-white border border-amber-200 shadow-2xl p-6">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">质检分数连续下降</h3>
            <p className="text-sm text-gray-500">�?次质检评分持续走低</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          检测到你的质检分数连续下降，建议回顾质检方法论，找到下降根因再针对性改进�?
        </p>

        <Link
          href={`/learning-path/${recommendation.moduleId}/${recommendation.lessonId}`}
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-amber-600 text-white py-2.5 text-sm font-medium hover:bg-amber-700 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          去学「{recommendation.title}�?
        </Link>

        <button
          onClick={handleDismiss}
          className="w-full mt-2 text-center text-xs text-gray-400 hover:text-gray-600"
        >
          知道了，暂不学习
        </button>
      </div>
    </div>
  );
}
