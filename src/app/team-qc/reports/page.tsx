'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Report {
  id: string;
  report_name: string;
  generated_at: string;
  total_count: number;
  issue_count: number;
  overall_score: number;
}

interface Issue {
  id: string;
  summary: string;
  issue_type: string;
  severity: string;
  user_name: string;
  suggestion: string;
}

const mockReports: Report[] = [
  { id: '1', report_name: '2024年1月质检报告', generated_at: '2024-01-15 10:30:00', total_count: 150, issue_count: 23, overall_score: 85.5 },
  { id: '2', report_name: '2024年1月第二周报告', generated_at: '2024-01-10 14:20:00', total_count: 80, issue_count: 12, overall_score: 88.2 },
  { id: '3', report_name: '2024年1月第一周报告', generated_at: '2024-01-03 11:15:00', total_count: 75, issue_count: 15, overall_score: 82.8 },
];

const mockIssues: Issue[] = [
  { id: '1', summary: '客户反馈物流破损，客服未及时响应...', issue_type: '响应超时', severity: 'high', user_name: '张三', suggestion: '建议提高响应速度，及时跟进客户问题' },
  { id: '2', summary: '产品质量投诉处理不当...', issue_type: '处理不当', severity: 'medium', user_name: '李四', suggestion: '建议加强产品知识培训' },
  { id: '3', summary: '客户情绪激烈时未正确安抚...', issue_type: '情绪处理', severity: 'high', user_name: '王五', suggestion: '建议学习情绪安抚技巧' },
  { id: '4', summary: '退换货流程说明不清...', issue_type: '信息错误', severity: 'low', user_name: '赵六', suggestion: '建议使用标准话术' },
  { id: '5', summary: '客诉升级信号未及时识别...', issue_type: '风险识别', severity: 'high', user_name: '张三', suggestion: '建议加强风险识别培训' },
];

const issueTypeLabels: Record<string, string> = {
  '响应超时': '响应超时',
  '处理不当': '处理不当',
  '情绪处理': '情绪处理',
  '信息错误': '信息错误',
  '风险识别': '风险识别',
};

const severityConfig: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: '严重', color: 'text-red-700', bg: 'bg-red-100' },
  medium: { label: '中等', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  low: { label: '轻微', color: 'text-green-700', bg: 'bg-green-100' },
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase.from('qc_reports').select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          setReports(data as Report[]);
        } else {
          setReports(mockReports);
        }
      } catch (err) {
        console.error('获取报告失败:', err);
        setReports(mockReports);
      }
      setLoading(false);
    };

    fetchReports();
  }, []);

  const handleSelectReport = (report: Report) => {
    setSelectedReport(report);
    setIssues(mockIssues);
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN');
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">质检报告</h1>
            <p className="text-slate-500 text-sm mt-1">查看AI质检生成的报告列表</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            导出Excel
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-medium text-slate-800">报告列表</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="px-4 py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-500">暂无报告</p>
                  </div>
                ) : (
                  reports.map(report => (
                    <div
                      key={report.id}
                      onClick={() => handleSelectReport(report)}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        selectedReport?.id === report.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-medium text-slate-800">{report.report_name}</div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span>{formatTime(report.generated_at)}</span>
                        <span className={`font-bold ${getScoreColor(report.overall_score)}`}>
                          {report.overall_score}分
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedReport ? (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-800">{selectedReport.report_name}</h2>
                      <p className="text-sm text-slate-500 mt-1">生成时间: {formatTime(selectedReport.generated_at)}</p>
                    </div>
                    <div className={`text-3xl font-bold ${getScoreColor(selectedReport.overall_score)}`}>
                      {selectedReport.overall_score}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{selectedReport.total_count}</div>
                      <div className="text-sm text-blue-700">质检条数</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{selectedReport.issue_count}</div>
                      <div className="text-sm text-red-700">问题数</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{((selectedReport.total_count - selectedReport.issue_count) / selectedReport.total_count * 100).toFixed(1)}%</div>
                      <div className="text-sm text-green-700">合格率</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">问题分布统计</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-slate-800">8</div>
                        <div className="text-sm text-slate-500">情绪激烈</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-slate-800">7</div>
                        <div className="text-sm text-slate-500">违规风险</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-slate-800">8</div>
                        <div className="text-sm text-slate-500">客诉升级信号</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-800">问题明细</h3>
                  </div>
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">对话摘要</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">问题类型</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">严重程度</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">客服</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">建议改进</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {issues.map(issue => {
                        const severity = severityConfig[issue.severity];
                        return (
                          <tr key={issue.id}>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-700 line-clamp-2">{issue.summary}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                {issueTypeLabels[issue.issue_type] || issue.issue_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${severity.bg} ${severity.color}`}>
                                {severity.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs">
                                  {issue.user_name[0]}
                                </div>
                                <span className="text-sm text-slate-700">{issue.user_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-green-700 line-clamp-2">{issue.suggestion}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">选择一个报告查看详情</h3>
                <p className="text-sm text-slate-500">从左侧列表选择报告，查看详细的质检分析结果</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}