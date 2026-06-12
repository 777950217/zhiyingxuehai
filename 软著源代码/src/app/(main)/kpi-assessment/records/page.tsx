'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, FileText, Filter, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, AlertTriangle, Loader2, User,
} from 'lucide-react';

// ========== 类型定义 ==========

interface AssessmentDetail {
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

interface AssessmentRecord {
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
  // 关联数据
  agent_name?: string;
  agent_position?: string;
  details?: AssessmentDetail[];
  scheme_name?: string;
}

// ========== 状态配�?==========

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700' },
  published: { label: '已发�?, color: 'bg-green-100 text-green-700' },
  confirmed: { label: '已确�?, color: 'bg-blue-100 text-blue-700' },
};

const positionLabels: Record<string, string> = {
  '售中客服': '售前客服',
  '售后客服': '售后客服',
  '组长': '组长',
  '主管': '主管',
};

// ========== 主组�?==========

export default function KpiAssessmentRecordsPage() {
  const router = useRouter();
  const { profile, hasAccess } = useAuth();
  const isReadOnly = profile?.role === 'personal_user';

  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 筛�?
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterName, setFilterName] = useState('');

  // 加载考核记录
  useEffect(() => {
    if (isReadOnly) { setLoading(false); return; }
    const token = localStorage.getItem('sb-br-pious-lynx-107fbaa4-auth-token');
    const accessToken = token ? JSON.parse(token).access_token : '';

    fetch('/api/kpi-assessments', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(data => {
        const list = data.assessments || data || [];
        setRecords(Array.isArray(list) ? list : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isReadOnly]);

  // 加载明细
  const loadDetails = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    const existing = records.find(r => r.id === id);
    if (existing?.details) {
      setExpandedId(id);
      return;
    }

    const token = localStorage.getItem('sb-br-pious-lynx-107fbaa4-auth-token');
    const accessToken = token ? JSON.parse(token).access_token : '';

    try {
      const res = await fetch(`/api/kpi-assessments/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.assessment) {
        setRecords(prev => prev.map(r =>
          r.id === id
            ? { ...r, details: data.details || [], scheme_name: data.scheme_name }
            : r
        ));
      }
    } catch (err) {
      console.error('加载明细失败:', err);
    }
    setExpandedId(id);
  };

  // 筛选逻辑
  const filteredRecords = records.filter(r => {
    if (filterPeriod !== 'all' && r.period !== filterPeriod) return false;
    if (filterPosition !== 'all' && r.agent_position !== filterPosition) return false;
    if (filterName && !(r.agent_name || '').includes(filterName)) return false;
    return true;
  });

  // 可选月�?
  const periods = [...new Set(records.map(r => r.period))].sort().reverse();
  // 可选岗�?
  const positions = [...new Set(records.map(r => r.agent_position).filter(Boolean))];

  // ========== 渲染 ==========

  if (isReadOnly) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <p className="text-lg text-gray-500">个人版不支持查看考核记录</p>
        <Button variant="outline" onClick={() => router.push('/kpi-assessment')}>
          返回KPI考核
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 顶部标题�?*/}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/kpi-assessment/list')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">考核记录</h1>
              <p className="text-sm text-gray-500">查看所有历史考核记录</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* 筛选区 */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="考核月份" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部月份</SelectItem>
                  {periods.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPosition} onValueChange={setFilterPosition}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="岗位" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部岗位</SelectItem>
                  {positions.filter((p): p is string => Boolean(p)).map((p) => (
                    <SelectItem key={p} value={p}>{positionLabels[p] || p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                placeholder="搜索员工姓名"
                className="w-48"
              />
              <span className="text-sm text-gray-500">
                �?{filteredRecords.length} 条记�?
              </span>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无考核记录</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push('/kpi-assessment/list')}>
                前往方案列表发起考核
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map(record => (
              <Card key={record.id} className="overflow-hidden">
                {/* 记录�?*/}
                <div
                  className="px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => loadDetails(record.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{record.agent_name || record.agent_id}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {positionLabels[record.agent_position || ''] || record.agent_position || '-'}
                      </Badge>
                      <span className="text-sm text-gray-500">{record.period}</span>
                      <Badge className={`text-xs ${statusConfig[record.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                        {statusConfig[record.status]?.label || record.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-gray-500">
                        总分�?strong className={record.total_score !== null && record.total_score < 60 ? 'text-red-600' : 'text-gray-900'}>
                          {record.total_score ?? '-'}
                        </strong>
                      </span>
                      {record.total_deduction > 0 && (
                        <span className="text-red-500 flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          -{record.total_deduction}
                        </span>
                      )}
                      {record.total_bonus > 0 && (
                        <span className="text-green-600 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          +{record.total_bonus}
                        </span>
                      )}
                      {expandedId === record.id ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* 展开明细 */}
                {expandedId === record.id && record.details && (
                  <div className="border-t bg-gray-50 px-5 py-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">指标</th>
                          <th className="text-center p-2">目标�?/th>
                          <th className="text-center p-2">实际�?/th>
                          <th className="text-center p-2">达标</th>
                          <th className="text-center p-2">得分变化</th>
                          <th className="text-center p-2">容错</th>
                        </tr>
                      </thead>
                      <tbody>
                        {record.details.map((d, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="p-2 font-medium">{d.indicator_name}</td>
                            <td className="p-2 text-center text-gray-600">{d.target_value}</td>
                            <td className="p-2 text-center">{d.actual_value || '-'}</td>
                            <td className="p-2 text-center">
                              {d.is_achieved === true ? '�? : d.is_achieved === false ? '�? : '-'}
                            </td>
                            <td className={`p-2 text-center font-medium ${
                              d.score_change > 0 ? 'text-green-600' :
                              d.score_change < 0 ? 'text-red-600' : 'text-gray-400'
                            }`}>
                              {d.score_change > 0 ? '+' : ''}{d.score_change}
                            </td>
                            <td className="p-2 text-center">
                              {d.fault_tolerance_used ? '�? : '-'}
                              {d.fault_tolerance_used && d.fault_tolerance_reason && (
                                <span className="text-xs text-gray-400 ml-1">({d.fault_tolerance_reason})</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {record.salary_effect && (
                      <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                        薪酬影响：{record.salary_effect}
                      </div>
                    )}
                    {record.hr_action && (
                      <div className="text-sm text-gray-600">
                        HR措施：{record.hr_action}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
