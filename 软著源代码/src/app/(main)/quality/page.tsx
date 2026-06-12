'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck, TrendingUp, TrendingDown, Users, Star,
  ChevronDown, ChevronUp, Download, Filter, BarChart3,
  MessageSquare, Clock, Heart, Target, CheckCircle2, AlertTriangle,
} from 'lucide-react';

/* ─── Mock数据 ─── */
const MOCK_STAFF_SCORES = [
  { name: '张小�?, avgScore: 92.5, totalChecks: 28, passRate: 96, response: 94, script: 91, attitude: 95, resolution: 90, trend: 'up' as const },
  { name: '李晓�?, avgScore: 88.3, totalChecks: 25, passRate: 92, response: 90, script: 87, attitude: 93, resolution: 83, trend: 'up' as const },
  { name: '王大�?, avgScore: 85.1, totalChecks: 22, passRate: 86, response: 88, script: 82, attitude: 90, resolution: 80, trend: 'down' as const },
  { name: '赵婷�?, avgScore: 90.8, totalChecks: 30, passRate: 97, response: 93, script: 89, attitude: 96, resolution: 85, trend: 'up' as const },
  { name: '孙建�?, avgScore: 78.6, totalChecks: 18, passRate: 78, response: 80, script: 75, attitude: 82, resolution: 77, trend: 'down' as const },
];

const DIMENSIONS = [
  { key: 'response', label: '响应速度', icon: Clock, desc: '首次响应时间、平均响应时�?, weight: '25%', standard: '首次响应�?0秒，平均�?0�? },
  { key: 'script', label: '话术规范', icon: MessageSquare, desc: '是否按标准话术回复、是否有敏感�?, weight: '25%', standard: '话术命中率≥90%，零敏感�? },
  { key: 'attitude', label: '服务态度', icon: Heart, desc: '语气友好度、客户满意度评价', weight: '25%', standard: '好评率≥95%，零投诉' },
  { key: 'resolution', label: '问题解决�?, icon: Target, desc: '一次解决率、转交率、重复咨询率', weight: '25%', standard: '一次解决率�?5%，转交率�?0%' },
];

export default function QualityPage() {
  const { profile } = useAuth();
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [showDimensions, setShowDimensions] = useState(false);

  const totalChecks = MOCK_STAFF_SCORES.reduce((s, m) => s + m.totalChecks, 0);
  const avgScore = (MOCK_STAFF_SCORES.reduce((s, m) => s + m.avgScore, 0) / MOCK_STAFF_SCORES.length).toFixed(1);
  const avgPassRate = (MOCK_STAFF_SCORES.reduce((s, m) => s + m.passRate, 0) / MOCK_STAFF_SCORES.length).toFixed(0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#2B7DE9]" />
          质检评分管理
        </h1>
        <p className="text-gray-500 mt-1">管理团队质检标准，追踪客服评分趋�?/p>
      </div>

      {/* 总览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">团队平均�?/span>
            <BarChart3 className="w-4 h-4 text-[#2B7DE9]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{avgScore}</span>
            <span className="text-sm text-gray-400">/ 100</span>
          </div>
          <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 较上�?+1.2
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">本月质检总数</span>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold text-gray-900">{totalChecks}</span>
            <span className="text-sm text-gray-400 ml-1">�?/span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            覆盖 {MOCK_STAFF_SCORES.length} 名客�?
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">合格�?/span>
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold text-gray-900">{avgPassRate}</span>
            <span className="text-sm text-gray-400 ml-1">%</span>
          </div>
          <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 较上�?+2.1%
          </div>
        </div>
      </div>

      {/* 质检维度说明 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowDimensions(!showDimensions)}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#2B7DE9]" />
            <span className="font-semibold text-gray-900">质检维度与评分标�?/span>
            <Badge variant="secondary" className="text-xs">{DIMENSIONS.length}个维�?/Badge>
          </div>
          {showDimensions ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        {showDimensions && (
          <div className="border-t border-gray-100 p-5 space-y-4">
            {DIMENSIONS.map(dim => (
              <div key={dim.key} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <dim.icon className="w-5 h-5 text-[#2B7DE9]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{dim.label}</span>
                    <Badge variant="outline" className="text-xs">权重 {dim.weight}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">{dim.desc}</p>
                  <p className="text-xs text-gray-400 mt-1">达标标准：{dim.standard}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 客服质检评分列表 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2B7DE9]" />
            <span className="font-semibold text-gray-900">客服质检评分</span>
            <Badge variant="secondary" className="text-xs">{MOCK_STAFF_SCORES.length}�?/Badge>
          </div>
          <Button variant="outline" size="sm" className="text-xs gap-1">
            <Download className="w-3.5 h-3.5" /> 导出报表
          </Button>
        </div>

        <div className="divide-y divide-gray-50">
          {MOCK_STAFF_SCORES.map(staff => (
            <div key={staff.name}>
              <button
                onClick={() => setExpandedStaff(expandedStaff === staff.name ? null : staff.name)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700">
                    {staff.name[0]}
                  </div>
                  <div className="text-left">
                    <span className="font-medium text-gray-900 text-sm">{staff.name}</span>
                    <div className="text-xs text-gray-400 mt-0.5">质检 {staff.totalChecks} �?/div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className={`text-lg font-bold ${staff.avgScore >= 90 ? 'text-green-600' : staff.avgScore >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                        {staff.avgScore}
                      </span>
                      {staff.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <span className="text-xs text-gray-400">合格�?{staff.passRate}%</span>
                  </div>
                  {expandedStaff === staff.name ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedStaff === staff.name && (
                <div className="px-4 pb-4 pt-1">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {DIMENSIONS.map(dim => {
                      const score = staff[dim.key as keyof typeof staff] as number;
                      return (
                        <div key={dim.key} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <dim.icon className="w-3.5 h-3.5 text-[#2B7DE9]" />
                            <span className="text-xs text-gray-500">{dim.label}</span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-xl font-bold ${score >= 90 ? 'text-green-600' : score >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                              {score}
                            </span>
                            <span className="text-xs text-gray-400">/ 100</span>
                          </div>
                          <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${score >= 90 ? 'bg-green-500' : score >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {staff.avgScore < 80 && (
                    <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-700">
                        <span className="font-medium">改进建议�?/span>
                        该客服评分低�?0分，建议安排专项培训并增加质检频次。重点关注{DIMENSIONS.filter(d => (staff[d.key as keyof typeof staff] as number) < 85).map(d => d.label).join('�?)}维度�?
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
