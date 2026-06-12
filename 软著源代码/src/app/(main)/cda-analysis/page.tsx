'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Loader2, Lightbulb, Download, X, Zap, CreditCard, Clock, Sparkles, CheckCircle2, TrendingUp, Upload } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

const CDA_STEPS = [
  { label: '数据校验', icon: '�? },
  { label: '趋势分析', icon: '📈' },
  { label: '异常检�?, icon: '🔍' },
  { label: '归因分析', icon: '🎯' },
  { label: '生成报告', icon: '📝' },
];

const PRICING_OPTIONS = [
  { count: 1, price: 9.9, unit: '单次', highlight: false },
  { count: 5, price: 39, unit: '5�?, perTime: '7.8', highlight: true },
  { count: 10, price: 69, unit: '10�?, perTime: '6.9', highlight: false },
];

export default function CdaAnalysisPage() {
  const { profile } = useAuth();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [credits, setCredits] = useState({ total: 0, used: 0 });
  const [trials, setTrials] = useState<{ cda: number }>({ cda: 0 });
  const [genStep, setGenStep] = useState(0);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/personal/cda-credits');
      if (res.ok) { const data = await res.json(); setCredits(data.credits || { total: 0, used: 0 }); }
    } catch { /* ignore */ }
  }, []);

  const fetchTrials = useCallback(async () => {
    try {
      const res = await fetch('/api/personal/feature-trials');
      if (res.ok) { const data = await res.json(); setTrials(data.trials || {}); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCredits(); fetchTrials(); }, [fetchCredits, fetchTrials]);

  const remaining = credits.total - credits.used;
  const trialUsed = trials.cda || 0;
  const trialRemaining = Math.max(0, 2 - trialUsed);
  const canUse = remaining > 0 || trialRemaining > 0;

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setGenStep(0);
    const stepTimer = setInterval(() => {
      setGenStep(prev => (prev < CDA_STEPS.length - 1 ? prev + 1 : prev));
    }, 1500);

    try {
      const res = await fetch('/api/personal/cda-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      clearInterval(stepTimer);
      setGenStep(CDA_STEPS.length - 1);
      if (res.ok) {
        toast.success(data.trial_message || 'CDA分析完成');
        setResult(data.analysis);
        fetchCredits(); fetchTrials();
      } else if (data.creditsInsufficient) {
        toast.error('CDA分析次数不足，请购买分析次数继续使用');
      } else {
        toast.error(data.error || '分析失败');
      }
    } catch { clearInterval(stepTimer); toast.error('分析失败'); }
    setAnalyzing(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/personal/cda-export', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'docx' }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `CDA分析报告.docx`; a.click();
        URL.revokeObjectURL(url);
        toast.success('导出成功');
      } else {
        const err = await res.json();
        if (err.creditsInsufficient) {
          toast.error('需要CDA分析次数才能导出专业报告');
        } else {
          toast.error(err.error || '导出失败');
        }
      }
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
          // 映射字段：日�?接待�?响应时长,咨询人数,成交人数,差评�?
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
        toast.success(`成功导入 ${imported} 条数据，现在可以开始CDA分析了`);
      } catch { toast.error('CSV解析失败，请检查文件格�?); }
    };
    input.click();
  };

  // Parse CDA result into structured visual sections
  const renderCdaResult = (content: string) => {
    if (!content) return null;
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^#{1,3}\s/)) {
        const level = line.match(/^(#{1,3})/)?.[1]?.length || 1;
        const text = line.replace(/^#{1,3}\s/, '');
        if (level === 1) {
          elements.push(<h2 key={i} className="text-lg font-bold text-gray-900 mt-5 mb-2">{text}</h2>);
        } else {
          elements.push(<h3 key={i} className="text-base font-bold text-gray-900 mt-4 mb-2">{text}</h3>);
        }
      } else if (line.includes('异常') || line.includes('⚠️') || line.includes('警告')) {
        elements.push(
          <div key={i} className="flex items-start gap-2 my-1.5 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
            <span className="text-red-500 shrink-0 mt-0.5">�?/span>
            <p className="text-sm text-gray-800">{line.replace(/^[•\-\*]\s*/, '')}</p>
          </div>
        );
      } else if (line.includes('预测') || line.includes('趋势') || line.includes('📈')) {
        elements.push(
          <div key={i} className="flex items-start gap-2 my-1.5 px-3 py-2 bg-purple-50 border border-purple-100 rounded-lg">
            <TrendingUp className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-800">{line.replace(/^[•\-\*]\s*/, '')}</p>
          </div>
        );
      } else if (line.includes('建议') || line.includes('改进') || line.includes('💡')) {
        elements.push(
          <div key={i} className="flex items-start gap-2 my-1.5 px-3 py-2 bg-sky-50 border border-sky-100 rounded-lg">
            <span className="text-sky-500 shrink-0 mt-0.5">�?/span>
            <p className="text-sm text-gray-800">{line.replace(/^[•\-\*]\s*/, '')}</p>
          </div>
        );
      } else if (line.trim()) {
        elements.push(<p key={i} className="text-sm text-gray-700 leading-relaxed my-0.5">{line.replace(/^[•\-\*]\s*/, '�?')}</p>);
      }
    }
    return elements;
  };

  // Extract first line as summary
  const getSummary = (content: string) => {
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    return lines[0] || '';
  };

  if (!profile) return null;
  if (profile.role !== 'personal_user') {
    return <div className="p-8 text-center text-gray-500">此功能仅限个人版用户</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><BarChart3 className="w-5 h-5 text-purple-600" /></div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">CDA专业数据分析</h1>
          <p className="text-sm text-gray-500">异常检�?趋势预测+相关�?归因，专业数据深度分�?/p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleImportCsv} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            <Upload className="w-4 h-4" /> 导入数据
          </button>
          {trialRemaining > 0 && (
            <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium border border-green-200">你还可以体验 {trialRemaining}/2 �?/span>
          )}
          {remaining > 0 && (
            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs rounded-full font-medium border border-purple-200">已购�?{remaining} �?/span>
          )}
        </div>
      </div>
      {/* 价值引�?*/}
      <div className="mb-6 px-4 py-3 bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl">
        <p className="text-sm font-medium text-purple-800">CDA专业数据分析——别人靠经验猜，你靠专业数据�?/p>
        <p className="text-xs text-purple-600 mt-1">用统计控制图、异常检测、趋势预测等专业方法，让你的管理决策有数据支�?/p>
      </div>

      {/* 操作�?*/}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={handleAnalyze} disabled={analyzing || !canUse} className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {analyzing ? 'AI分析�?..' : '开始分�?}
          </button>
          <button onClick={handleExport} disabled={exporting} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> {exporting ? '导出�?..' : '导出CDA报告'}
          </button>
        </div>

        {/* AI生成步骤动画 */}
        {analyzing && (
          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
              AI正在用CDA方法深度分析...
            </p>
            <div className="space-y-2">
              {CDA_STEPS.map((step, idx) => (
                <div key={idx} className={`flex items-center gap-2 text-sm transition-all duration-300 ${idx <= genStep ? 'text-gray-900' : 'text-gray-400'}`}>
                  {idx < genStep ? (
                    <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                  ) : idx === genStep ? (
                    <Loader2 className="w-4 h-4 text-purple-500 animate-spin shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-300 shrink-0" />
                  )}
                  <span>{step.icon} {step.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!canUse && (
          <p className="text-sm text-amber-600 mb-3">体验已结束，请购买CDA分析次数继续使用</p>
        )}
        <p className="text-xs text-gray-400 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" /> CDA分析需要至�?条数据记录。分析包含控制图异常检测、趋势预测、指标相关性和归因分析</p>
      </div>

      {/* 分析结果 */}
      {result && (
        <div className="mb-6">
          {/* 分析摘要卡片 */}
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-5 mb-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-bold text-purple-900">分析摘要</h3>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">{getSummary(result)}</p>
          </div>

          {/* 详细分析 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900">详细分析报告</h3>
              <button onClick={() => setResult(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="max-h-[600px] overflow-y-auto pr-2">
              {renderCdaResult(result)}
            </div>
          </div>
        </div>
      )}

      {/* 购买次数 - 定价卡片 */}
      {!result && !analyzing && (
        <div className="mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              购买CDA分析次数
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {PRICING_OPTIONS.map(opt => (
                <Link key={opt.count} href={`/cda-credits?count=${opt.count}`} className={`relative rounded-xl border-2 p-4 text-center transition-all hover:shadow-md ${opt.highlight ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white hover:border-purple-200'}`}>
                  {opt.highlight && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-full">推荐</span>
                  )}
                  <p className="text-xs text-gray-500 mb-1">{opt.unit}</p>
                  <p className="text-2xl font-bold text-gray-900">¥{opt.price}</p>
                  {opt.perTime && (
                    <p className="text-xs text-purple-600 mt-1">¥{opt.perTime}/�?/p>
                  )}
                </Link>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">购买后永久有效，不限使用时间</p>
          </div>
        </div>
      )}

      {!result && !analyzing && (
        <div className="text-center py-8 text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-base">点击"开始分�?生成CDA专业分析报告</p>
          <p className="text-sm mt-1">需要先在数据录入中录入至少4条数�?/p>
          <Link href="/data-input" className="inline-block mt-3 text-purple-600 text-sm hover:underline">去录入数�?�?/Link>
        </div>
      )}
    </div>
  );
}
