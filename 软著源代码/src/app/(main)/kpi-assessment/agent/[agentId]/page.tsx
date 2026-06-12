'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Loader2, User, Award, Calendar,
} from 'lucide-react';

// ========== 类型定义 ==========

interface AgentInfo {
  id: string;
  name: string;
  position: string;
}

interface AssessmentWithDetails {
  id: string;
  scheme_id: string;
  agent_id: string;
  period: string;
  total_score: number | null;
  total_deduction: number;
  total_bonus: number;
  salary_effect: string | null;
  hr_action: string | null;
  status: string;
  created_at: string;
  details: DetailItem[];
  scheme_name?: string;
}

interface DetailItem {
  id: string;
  dimension_id: string;
  indicator_id: string;
  indicator_name: string;
  target_value: string;
  actual_value: string | null;
  is_achieved: boolean | null;
  score_change: number;
  fault_tolerance_used: boolean;
  fault_tolerance_reason: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700' },
  published: { label: '已发布', color: 'bg-green-100 text-green-700' },
  confirmed: { label: '已确认', color: 'bg-blue-100 text-blue-700' },
};

const positionLabels: Record<string, string> = {
  '售中客服': '售前客服',
  '售后客服': '售后客服',
  '组长': '组长',
  '主管': '主管',
};

// ========== 主组件 ==========

export default function AgentAssessmentHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.agentId as string;
  const { profile } = useAuth();
  const isReadOnly = profile?.role === 'personal_user';

  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [assessments, setAssessments] = useState<AssessmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId || isReadOnly) { setLoading(false); return; }

    const token = localStorage.getItem('sb-br-pious-lynx-107fbaa4-auth-token');
    const accessToken = token ? JSON.parse(token).access_token : '';

    // 加载员工考核历史
    fetch(`/api/kpi-assessments/agent/${agentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.agent) {
          setAgent(data.agent);
        }
        const list = data.assessments || [];
        setAssessments(Array.isArray(list) ? list : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [agentId, isReadOnly]);

  // 计算趋势
  const getTrend = (index: number): 'up' | 'down' | 'flat' | null => {
    if (index >= assessments.length - 1) return null;
    const curr = assessments[index].total_score;
    const prev = assessments[index + 1].total_score;
    if (curr === null || prev === null) return null;
    if (curr > prev) return 'up';
    if (curr < prev) return 'down';
    return 'flat';
  };

  // ========== 渲染 ==========

  if (isReadOnly) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <p className="text-lg text-gray-500">个人版不支持查看考核历史</p>
        <Button variant="outline" onClick={() => router.push('/kpi-assessment')}>
          返回KPI考核
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 顶部标题栏 */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {agent?.name || '员工'}的考核历史
            </h1>
            <p className="text-sm text-gray-500">
              {agent && `${positionLabels[agent.position] || agent.position} · `}
              共 {assessments.length} 次考核
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : assessments.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Award className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无考核记录</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* 趋势摘要 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  得分趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-32">
                  {assessments.slice(0, 12).map((a, i) => (
                    <div key={a.id} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-500">
                        {a.total_score ?? '-'}
                      </span>
                      <div
                        className={`w-full rounded-t transition-all ${
                          (a.total_score ?? 0) >= 80 ? 'bg-green-400' :
                          (a.total_score ?? 0) >= 60 ? 'bg-amber-400' : 'bg-red-400'
                        }`}
                        style={{
                          height: `${Math.max(((a.total_score ?? 0) / 100) * 100, 8)}%`,
                        }}
                      />
                      <span className="text-xs text-gray-400 truncate w-full text-center">
                        {a.period?.slice(5) || ''}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 时间线 */}
            <div className="space-y-3">
              {assessments.map((assessment, index) => {
                const trend = getTrend(index);
                return (
                  <Card key={assessment.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        {/* 时间线标记 */}
                        <div className="flex flex-col items-center gap-1 pt-1">
                          <div className={`w-3 h-3 rounded-full ${
                            (assessment.total_score ?? 0) >= 80 ? 'bg-green-500' :
                            (assessment.total_score ?? 0) >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                          {index < assessments.length - 1 && (
                            <div className="w-0.5 h-8 bg-gray-200" />
                          )}
                        </div>

                        {/* 内容 */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">{assessment.period}</span>
                              <Badge className={`text-xs ${statusConfig[assessment.status]?.color || ''}`}>
                                {statusConfig[assessment.status]?.label || assessment.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-2xl font-bold ${
                                (assessment.total_score ?? 0) >= 80 ? 'text-green-600' :
                                (assessment.total_score ?? 0) >= 60 ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {assessment.total_score ?? '-'}
                              </span>
                              {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                              {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                              {trend === 'flat' && <Minus className="h-4 w-4 text-gray-400" />}
                            </div>
                          </div>

                          {/* 指标明细 */}
                          {assessment.details && assessment.details.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {assessment.details.map((d, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                  <span className="text-gray-600 w-36 truncate">{d.indicator_name}</span>
                                  <span className="text-gray-400 w-20 text-center">{d.target_value}</span>
                                  <span className="w-16 text-center">{d.actual_value || '-'}</span>
                                  <span className={`w-16 text-center font-medium ${
                                    d.score_change > 0 ? 'text-green-600' :
                                    d.score_change < 0 ? 'text-red-600' : 'text-gray-400'
                                  }`}>
                                    {d.score_change > 0 ? '+' : ''}{d.score_change}
                                  </span>
                                  {d.fault_tolerance_used && (
                                    <Badge variant="outline" className="text-xs">容错</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 薪酬影响 */}
                          {(assessment.salary_effect || assessment.hr_action) && (
                            <div className="mt-2 pt-2 border-t text-sm text-gray-600 flex gap-4">
                              {assessment.salary_effect && <span>薪酬：{assessment.salary_effect}</span>}
                              {assessment.hr_action && <span>HR：{assessment.hr_action}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
