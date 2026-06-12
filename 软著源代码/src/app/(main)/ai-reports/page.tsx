'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Loader2, Plus, X, Download, Lightbulb, Clock, Sparkles, CheckCircle2, Upload, BarChart3, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { markOnboardingDay } from '@/lib/onboarding-helpers';

interface Report {
  id: string;
  report_type: string;
  period: string;
  title: string;
  content: string;
  has_cda: boolean;
  created_at: string;
}

type ReportType = 'weekly' | 'monthly';
type TemplateType = 'standard' | 'data_review' | 'team_review';

const GENERATION_STEPS = [
  { label: '读取你的数据', icon: '📊' },
  { label: '计算环比同比', icon: '🔄' },
  { label: '分析问题趋势', icon: '🔍' },
  { label: '生成专业报告', icon: '📝' },
];

const TEMPLATES: { key: TemplateType; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'standard', label: '标准报告', desc: '数据汇�?问题复盘+改进建议', icon: <FileText className="w-5 h-5" /> },
  { key: 'data_review', label: '数据复盘', desc: '对比上期数据，突出变化趋�?, icon: <BarChart3 className="w-5 h-5" /> },
  { key: 'team_review', label: '团队复盘', desc: '团队问题诊断+改进计划', icon: <Users className="w-5 h-5" /> },
];

export default function AiReportsPage() {
  const { profile, authFetch } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [exporting, setExporting] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('weekly');
  const [templateType, setTemplateType] = useState<TemplateType>('standard');
  const [trials, setTrials] = useState<{ report: number }>({ report: 0 });
  const [genStep, setGenStep] = useState(0);

  // 数据复盘模板：上期数�?
  const [prevData, setPrevData] = useState({
    visits: '', avg_response_time: '', consultations: '', orders: '', complaints: '',
    conversion_rate: '', complaint_rate: '',
  });
  // 数据复盘模板：本期数�?
  const [curData, setCurData] = useState({
    visits: '', avg_response_time: '', consultations: '', orders: '', complaints: '',
    conversion_rate: '', complaint_rate: '',
  });

  // 团队复盘模板：团队维度数�?
  const [teamData, setTeamData] = useState({
    team_size: '', attendance_rate: '', new_hire_progress: '',
    complaint_count: '', mood_status: 'normal', training_completion: '',
  });

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/personal/reports');
      if (res.ok) { const data = await res.json(); setReports(data.reports || data.data || []); }
    } catch { toast.error('加载报告失败'); }
    setLoading(false);
  }, []);

  const fetchTrials = useCallback(async () => {
    try {
      const res = await fetch('/api/personal/feature-trials');
      if (res.ok) { const data = await res.json(); setTrials(data.trials || {}); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchReports(); fetchTrials(); }, [fetchReports, fetchTrials]);

  // 计算环比变化
  const calcChange = (cur: string, prev: string): { value: number; direction: 'up' | 'down' | 'flat' } => {
    const c = parseFloat(cur);
    const p = parseFloat(prev);
    if (isNaN(c) || isNaN(p) || p === 0) return { value: 0, direction: 'flat' };
    const change = ((c - p) / p) * 100;
    return { value: Math.round(change * 10) / 10, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat' };
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenStep(0);
    const stepTimer = setInterval(() => {
      setGenStep(prev => (prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev));
    }, 2000);

    try {
      const now = new Date();
      const period = reportType === 'weekly'
        ? `${now.getFullYear()}-W${String(Math.ceil(now.getDate() / 7)).padStart(2, '0')}`
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const body: Record<string, unknown> = { type: reportType, period, template: templateType };

      // 数据复盘模板：传入手动数�?
      if (templateType === 'data_review') {
        body.manualData = { current: curData, previous: prevData };
      }
      // 团队复盘模板：传入团队数�?
      if (templateType === 'team_review') {
        body.teamData = teamData;
      }

      const res = await fetch('/api/personal/reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      clearInterval(stepTimer);
      setGenStep(GENERATION_STEPS.length - 1);
      if (res.ok) {
        markOnboardingDay(authFetch, 7);
        toast.success(data.trial_message || '报告生成成功');
        fetchReports(); fetchTrials();
        if (data.report || data.data) setSelectedReport(data.report || data.data);
      } else {
        toast.error(data.error || '生成失败');
      }
    } catch { clearInterval(stepTimer); toast.error('生成失败'); }
    setGenerating(false);
  };

  const handleExport = async (report: Report) => {
    setExporting(true);
    try {
      const res = await fetch('/api/personal/report-export', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: report.id, format: 'docx' }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${report.title}.docx`; a.click();
        URL.revokeObjectURL(url);
        toast.success('导出成功');
      } else { const err = await res.json(); toast.error(err.error || '导出失败'); }
    } catch { toast.error('导出失败'); }
    setExporting(false);
  };

  /* ─── 导入CSV数据 ─── */
  const handleImportCsv = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const clean = text.replace(/^\uFEFF/, '');
        const lines = clean.split('\n').filter(l => l.trim());
        if (lines.length < 2) { toast.error('CSV文件至少需�?行表�?1行数�?); return; }
        const headers = lines[0].split(',').map(h => h.trim());
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          if (cols.length < 6) continue;
          await fetch('/api/personal/data-records', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              record_date: cols[0] || '', visits: Number(cols[1]) || 0,
              avg_response_time: Number(cols[2]) || 0, consultations: Number(cols[3]) || 0,
              orders: Number(cols[4]) || 0, complaints: Number(cols[5]) || 0,
            }),
          });
          imported++;
        }
        if (imported === 0) { toast.error('未导入任何数据，请检查CSV格式（表头：日期,接待�?响应时长,咨询人数,成交人数,差评数）'); return; }
        toast.success(`成功导入 ${imported} 条数据，现在可以生成报告了`);
      } catch { toast.error('CSV解析失败，请检查文件格�?); }
    };
    input.click();
  };

  /* ─── 下载CSV模板 ─── */
  const handleDownloadTemplate = () => {
    const headers = '日期,接待�?响应时长(�?,咨询人数,成交人数,差评�?;
    const sampleRow = '2025-01-06,120,35,80,25,2';
    const csv = '\uFEFF' + headers + '\n' + sampleRow + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '周报月报数据模板.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('模板已下载，填写后导入即�?);
  };

  const trialUsed = trials.report || 0;
  const trialRemaining = Math.max(0, 5 - trialUsed);

  // 变化指标颜色映射
  const changeColor = (dir: 'up' | 'down' | 'flat', isGoodUp: boolean) => {
    if (dir === 'flat') return 'text-gray-400';
    const improved = (dir === 'up' && isGoodUp) || (dir === 'down' && !isGoodUp);
    return improved ? 'text-green-600' : 'text-red-600';
  };

  // Parse report content to extract visual sections
  const renderReportContent = (content: string) => {
    if (!content) return null;
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inHighlight = false;
    let highlightContent = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^#{1,3}\s/)) {
        if (inHighlight) {
          elements.push(
            <div key={`hl-${i}`} className="bg-sky-50 border-l-4 border-sky-500 rounded-r-lg px-4 py-3 my-3">
              <p className="text-sm font-bold text-sky-800 mb-1">给老板的汇�?/p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{highlightContent.trim()}</p>
            </div>
          );
          inHighlight = false; highlightContent = '';
        }
        const level = line.match(/^(#{1,3})/)?.[1]?.length || 1;
        const text = line.replace(/^#{1,3}\s/, '');
        if (level === 1) elements.push(<h2 key={i} className="text-lg font-bold text-gray-900 mt-5 mb-2">{text}</h2>);
        else if (level === 2) elements.push(<h3 key={i} className="text-base font-bold text-gray-900 mt-4 mb-2">{text}</h3>);
        else elements.push(<h4 key={i} className="text-sm font-bold text-gray-800 mt-3 mb-1">{text}</h4>);
      } else if (line.includes('TOP') || line.includes('问题') || line.includes('⚠️') || line.includes('🔴')) {
        elements.push(
          <div key={i} className="flex items-start gap-2 my-1.5 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
            <span className="text-red-500 shrink-0 mt-0.5">�?/span>
            <p className="text-sm text-gray-800">{line.replace(/^[•\-\*]\s*/, '')}</p>
          </div>
        );
      } else if (line.includes('建议') || line.includes('改进') || line.includes('💡') || line.includes('整改')) {
        elements.push(
          <div key={i} className="flex items-start gap-2 my-1.5 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
            <span className="text-blue-500 shrink-0 mt-0.5">�?/span>
            <p className="text-sm text-gray-800">{line.replace(/^[•\-\*]\s*/, '')}</p>
          </div>
        );
      } else if (line.includes('老板') || line.includes('汇报') || line.includes('🗣�?)) {
        inHighlight = true; highlightContent += line + '\n';
      } else if (inHighlight) {
        highlightContent += line + '\n';
      } else if (line.trim()) {
        elements.push(<p key={i} className="text-sm text-gray-700 leading-relaxed my-0.5">{line.replace(/^[•\-\*]\s*/, '�?')}</p>);
      }
    }
    if (inHighlight && highlightContent.trim()) {
      elements.push(
        <div key="hl-final" className="bg-sky-50 border-l-4 border-sky-500 rounded-r-lg px-4 py-3 my-3">
          <p className="text-sm font-bold text-sky-800 mb-1">给老板的汇�?/p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{highlightContent.trim()}</p>
        </div>
      );
    }
    return elements;
  };

  if (!profile) return null;
  if (profile.role !== 'personal_user') {
    return <div className="p-8 text-center text-gray-500">此功能仅限个人版用户</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-4xl mx-auto">
      {/* 标题 */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-emerald-600" /></div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">周报月报 / 复盘</h1>
          <p className="text-sm text-gray-500">基于你的数据，AI自动生成专业报告和复盘方�?/p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {trialRemaining > 0 && (
            <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium border border-green-200">你还可以体验 {trialRemaining}/5 �?/span>
          )}
          <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> 下载模板
          </button>
          <button onClick={handleImportCsv} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-50 transition-colors">
            <Upload className="w-3.5 h-3.5" /> 导入数据
          </button>
        </div>
      </div>

      {/* 价值引�?*/}
      <div className="mb-6 px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl">
        <p className="text-sm font-medium text-emerald-800">AI帮你写周�?月报—�?分钟出稿，省3小时</p>
        <p className="text-xs text-emerald-600 mt-1">不用再对着空白文档发呆，AI基于你的真实数据一键生成专业报�?/p>
      </div>

      {/* 生成�?*/}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        {/* 报告类型选择 */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setReportType('weekly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${reportType === 'weekly' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>周报</button>
          <button onClick={() => setReportType('monthly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${reportType === 'monthly' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>月报</button>
          <button onClick={handleGenerate} disabled={generating} className="ml-auto flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {generating ? 'AI生成�?..' : '生成报告'}
          </button>
        </div>

        {/* 模板选择 - 大号卡片式Tab */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">选择报告模板</p>
          <div className="grid grid-cols-3 gap-3">
            {TEMPLATES.map(t => (
              <button key={t.key} onClick={() => setTemplateType(t.key)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                  templateType === t.key
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${templateType === t.key ? 'bg-emerald-200' : 'bg-gray-100'}`}>
                  {t.icon}
                </div>
                <span className="text-sm font-bold">{t.label}</span>
                <span className="text-xs text-gray-500 leading-tight">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 数据复盘模板：上�?本期数据录入 */}
        {templateType === 'data_review' && (
          <div className="mb-4 space-y-3">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              录入对比数据（上�?vs 本期，AI自动计算环比变化�?
            </p>
            <div className="grid grid-cols-2 gap-4">
              {/* 上期数据 */}
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <p className="text-xs font-bold text-gray-500 mb-2">上{reportType === 'weekly' ? '�? : '�?}数据</p>
                {[
                  { key: 'visits', label: '接待�?, unit: '�? },
                  { key: 'avg_response_time', label: '平均响应时长', unit: '�? },
                  { key: 'conversion_rate', label: '转化�?, unit: '%' },
                  { key: 'complaint_rate', label: '差评�?, unit: '%' },
                  { key: 'consultations', label: '咨询人数', unit: '�? },
                  { key: 'complaints', label: '差评�?, unit: '�? },
                ].map(f => (
                  <div key={f.key} className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs text-gray-600 w-24 shrink-0">{f.label}</span>
                    <input type="number" value={(prevData as Record<string, string>)[f.key]}
                      onChange={e => setPrevData(p => ({ ...p, [f.key]: e.target.value }))}
                      className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm bg-white" placeholder={`�?{reportType === 'weekly' ? '�? : '�?}`} />
                    <span className="text-xs text-gray-400">{f.unit}</span>
                  </div>
                ))}
              </div>
              {/* 本期数据 */}
              <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                <p className="text-xs font-bold text-blue-600 mb-2">本{reportType === 'weekly' ? '�? : '�?}数据</p>
                {[
                  { key: 'visits', label: '接待�?, unit: '�?, goodUp: true },
                  { key: 'avg_response_time', label: '平均响应时长', unit: '�?, goodUp: false },
                  { key: 'conversion_rate', label: '转化�?, unit: '%', goodUp: true },
                  { key: 'complaint_rate', label: '差评�?, unit: '%', goodUp: false },
                  { key: 'consultations', label: '咨询人数', unit: '�?, goodUp: true },
                  { key: 'complaints', label: '差评�?, unit: '�?, goodUp: false },
                ].map(f => {
                  const change = calcChange((curData as Record<string, string>)[f.key], (prevData as Record<string, string>)[f.key]);
                  const hasData = (curData as Record<string, string>)[f.key] && (prevData as Record<string, string>)[f.key];
                  return (
                    <div key={f.key} className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs text-gray-600 w-24 shrink-0">{f.label}</span>
                      <input type="number" value={(curData as Record<string, string>)[f.key]}
                        onChange={e => setCurData(p => ({ ...p, [f.key]: e.target.value }))}
                        className="flex-1 px-2 py-1.5 border border-blue-200 rounded text-sm bg-white" placeholder={`�?{reportType === 'weekly' ? '�? : '�?}`} />
                      <span className="text-xs text-gray-400 w-6">{f.unit}</span>
                      {hasData && (
                        <span className={`text-xs font-bold min-w-[48px] text-right ${changeColor(change.direction, f.goodUp)}`}>
                          {change.direction === 'up' ? '�? : change.direction === 'down' ? '�? : '�?}
                          {change.value !== 0 ? `${Math.abs(change.value)}%` : '持平'}
                        </span>
                      )}
                      {!hasData && <span className="min-w-[48px]" />}
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" /> 绿色=改善，红�?恶化，灰�?持平。留空项AI会基于已有数据生�?/p>
          </div>
        )}

        {/* 团队复盘模板：团队维度数�?*/}
        {templateType === 'team_review' && (
          <div className="mb-4 space-y-3">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-violet-500" />
              团队维度数据（AI基于团队数据诊断问题+制定改进计划�?
            </p>
            <div className="border border-violet-200 rounded-lg p-4 bg-violet-50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">团队人数</label>
                  <input type="number" value={teamData.team_size}
                    onChange={e => setTeamData(p => ({ ...p, team_size: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" placeholder="如：5" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">出勤�?%)</label>
                  <input type="number" value={teamData.attendance_rate}
                    onChange={e => setTeamData(p => ({ ...p, attendance_rate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" placeholder="如：95" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">新人上手进度</label>
                  <select value={teamData.new_hire_progress}
                    onChange={e => setTeamData(p => ({ ...p, new_hire_progress: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                    <option value="">请选择</option>
                    <option value="not_started">尚未开始培�?/option>
                    <option value="in_progress">培训中，进展正常</option>
                    <option value="slow">培训中，进度偏慢</option>
                    <option value="completed">已独立上�?/option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">客诉次数</label>
                  <input type="number" value={teamData.complaint_count}
                    onChange={e => setTeamData(p => ({ ...p, complaint_count: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" placeholder="如：3" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">员工情绪状�?/label>
                  <select value={teamData.mood_status}
                    onChange={e => setTeamData(p => ({ ...p, mood_status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                    <option value="good">良好——团队氛围积�?/option>
                    <option value="normal">一般——偶有抱�?/option>
                    <option value="tense">紧张——矛盾明�?/option>
                    <option value="low">低迷——消极怠工</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">培训完成�?%)</label>
                  <input type="number" value={teamData.training_completion}
                    onChange={e => setTeamData(p => ({ ...p, training_completion: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" placeholder="如：80" />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" /> 填得越详细，AI诊断越精准。留空项AI会合理假�?/p>
          </div>
        )}

        {/* 标准模板：数据说�?*/}
        {templateType === 'standard' && (
          <p className="text-xs text-gray-400 flex items-center gap-1 mb-2"><Lightbulb className="w-3.5 h-3.5" /> AI基于你录入的数据自动分析，包含核心数据、问题复盘、改进建议和汇报话术</p>
        )}

        {/* AI生成步骤动画 */}
        {generating && (
          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
              AI正在分析你的数据...
            </p>
            <div className="space-y-2">
              {GENERATION_STEPS.map((step, idx) => (
                <div key={idx} className={`flex items-center gap-2 text-sm transition-all duration-300 ${idx <= genStep ? 'text-gray-900' : 'text-gray-400'}`}>
                  {idx < genStep ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : idx === genStep ? <Loader2 className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />
                    : <Clock className="w-4 h-4 text-gray-300 shrink-0" />}
                  <span>{step.icon} {step.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 当前查看的报�?*/}
      {selectedReport && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900">{selectedReport.title}</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => handleExport(selectedReport)} disabled={exporting} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 transition-colors">
                <Download className="w-3.5 h-3.5" /> {exporting ? '导出�?..' : '导出Word——直接交老板'}
              </button>
              <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto pr-2">
            {renderReportContent(selectedReport.content)}
          </div>
        </div>
      )}

      {/* 历史报告列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-base">暂无报告</p>
          <p className="text-sm mt-1">录入数据后，点击"生成报告"开�?/p>
          <Link href="/data-input" className="inline-block mt-3 text-emerald-600 text-sm hover:underline">去录入数�?�?/Link>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 mb-2">历史报告</h3>
          {reports.map(r => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.report_type === 'weekly' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'}`}>{r.report_type === 'weekly' ? '周报' : '月报'}</span>
                <span className="text-sm text-gray-900 font-medium">{r.title}</span>
                <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleExport(r)} disabled={exporting} className="text-gray-400 hover:text-emerald-600"><Download className="w-4 h-4" /></button>
                <button onClick={() => setSelectedReport(r)} className="text-sm text-emerald-600 hover:underline">查看</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
