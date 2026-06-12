'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Loader2, Send, Lightbulb, Download, X, ArrowRight, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

interface CheckResult {
  id: string;
  chat_content: string;
  response_score: number;
  script_score: number;
  attitude_score: number;
  solution_score: number;
  total_score: number;
  issues: string;
  suggestions: string;
  created_at: string;
}

const DIMENSIONS = [
  { key: 'response_score', label: '响应速度', icon: '�?, color: 'sky' },
  { key: 'script_score', label: '话术规范', icon: '💬', color: 'emerald' },
  { key: 'attitude_score', label: '服务态度', icon: '😊', color: 'violet' },
  { key: 'solution_score', label: '问题解决', icon: '🎯', color: 'amber' },
] as const;

function ScoreRing({ score, max, label, color }: { score: number; max: number; label: string; color: string }) {
  const pct = Math.round((score / max) * 100);
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const colorMap: Record<string, { stroke: string; text: string; bg: string }> = {
    sky: { stroke: pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444', text: pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600', bg: 'bg-sky-50' },
    emerald: { stroke: pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444', text: pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600', bg: 'bg-emerald-50' },
    violet: { stroke: pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444', text: pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600', bg: 'bg-violet-50' },
    amber: { stroke: pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444', text: pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600', bg: 'bg-amber-50' },
  };
  const c = colorMap[color] || colorMap.sky;

  return (
    <div className={`${c.bg} rounded-xl p-4 flex flex-col items-center`}>
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle cx="40" cy="40" r={radius} fill="none" stroke={c.stroke} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="text-center -mt-14 mb-6">
        <span className={`text-xl font-bold ${c.text}`}>{score}</span>
        <span className="text-xs text-gray-400">/{max}</span>
      </div>
      <p className="text-xs font-medium text-gray-700">{label}</p>
    </div>
  );
}

export default function ChatCheckPage() {
  const { profile } = useAuth();
  const [results, setResults] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [chatContent, setChatContent] = useState('');
  const [selectedResult, setSelectedResult] = useState<CheckResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const [trials, setTrials] = useState<{ chat_check: number }>({ chat_check: 0 });

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch('/api/personal/chat-check');
      if (res.ok) { const data = await res.json(); setResults(data.results || []); }
    } catch { toast.error('加载失败'); }
    setLoading(false);
  }, []);

  const fetchTrials = useCallback(async () => {
    try {
      const res = await fetch('/api/personal/feature-trials');
      if (res.ok) { const data = await res.json(); setTrials(data.trials || {}); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchResults(); fetchTrials(); }, [fetchResults, fetchTrials]);

  const handleCheck = async () => {
    if (!chatContent.trim()) { toast.error('请粘贴聊天记�?); return; }
    setChecking(true);
    try {
      const res = await fetch('/api/personal/chat-check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_content: chatContent }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.trial_message || '对话自检完成');
        setChatContent('');
        fetchResults(); fetchTrials();
        if (data.result) setSelectedResult(data.result);
      } else { toast.error(data.error || '自检失败'); }
    } catch { toast.error('自检失败'); }
    setChecking(false);
  };

  const trialUsed = trials.chat_check || 0;
  const trialRemaining = Math.max(0, 5 - trialUsed);

  const totalColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  /* ─── 导入对话记录CSV ─── */
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
        // CSV格式：对话内容（必填），后续列可�?
        const headers = lines[0].split(',').map(h => h.trim());
        const contentIdx = headers.findIndex(h => h.includes('对话') || h.includes('内容') || h.includes('聊天'));
        // 如果找不到表头，默认�?列为对话内容
        const useIdx = contentIdx !== -1 ? contentIdx : 0;
        const chatLines: string[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          if (cols[useIdx]) chatLines.push(cols[useIdx]);
        }
        if (chatLines.length === 0) { toast.error('未找到对话内容，请确保CSV�?对话内容"�?); return; }
        // 将导入的对话内容拼接后填入输入框
        const merged = chatLines.join('\n');
        setChatContent(prev => prev ? prev + '\n---\n' + merged : merged);
        toast.success(`成功导入 ${chatLines.length} 条对话记录，可点�?开始自检"进行批量分析`);
      } catch { toast.error('CSV解析失败，请检查文件格�?); }
    };
    input.click();
  };

  /* ─── 导出自检结果为CSV ─── */
  const handleExportResults = () => {
    if (results.length === 0) { toast.error('暂无自检结果可导�?); return; }
    const BOM = '\uFEFF';
    const header = '对话内容,总分,响应速度,话术规范,服务态度,问题解决,扣分详情,改进建议,自检时间\n';
    const rows = results.map(r => {
      const content = (r.chat_content || '').replace(/"/g, '""').replace(/\n/g, ' ').slice(0, 200);
      const issues = (r.issues || '').replace(/"/g, '""').replace(/\n/g, ' ').slice(0, 200);
      const suggestions = (r.suggestions || '').replace(/"/g, '""').replace(/\n/g, ' ').slice(0, 200);
      return `"${content}",${r.total_score},${r.response_score},${r.script_score},${r.attitude_score},${r.solution_score},"${issues}","${suggestions}",${new Date(r.created_at).toLocaleString('zh-CN')}`;
    });
    const csvContent = BOM + header + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `对话自检结果_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('导出成功');
  };

  // Parse issues into structured format: problem �?suggestion �?alternative
  const parseIssues = (issues: string) => {
    if (!issues) return [];
    const lines = issues.split('\n').filter(l => l.trim());
    const items: { problem: string; suggestion?: string; alternative?: string }[] = [];
    let current: { problem: string; suggestion?: string; alternative?: string } | null = null;
    for (const line of lines) {
      const trimmed = line.replace(/^[•\-\*]\s*/, '').trim();
      if (trimmed.match(/^\d+[.、]/)) {
        if (current) items.push(current);
        current = { problem: trimmed.replace(/^\d+[.、]\s*/, '') };
      } else if (current && (trimmed.includes('建议') || trimmed.includes('应该') || trimmed.includes('可以'))) {
        current.suggestion = trimmed;
      } else if (current && (trimmed.includes('话术') || trimmed.includes('替换') || trimmed.includes('改为') || trimmed.includes('可以�?))) {
        current.alternative = trimmed;
      } else if (current) {
        current.problem += ' ' + trimmed;
      } else {
        current = { problem: trimmed };
      }
    }
    if (current) items.push(current);
    return items.length > 0 ? items : [{ problem: issues }];
  };

  if (!profile) return null;
  if (profile.role !== 'personal_user') {
    return <div className="p-8 text-center text-gray-500">此功能仅限个人版用户</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center"><MessageSquare className="w-5 h-5 text-violet-600" /></div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">对话自检</h1>
          <p className="text-sm text-gray-500">粘贴聊天记录，AI四维打分帮你找出问题</p>
        </div>
        {trialRemaining > 0 && (
          <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium border border-green-200">你还可以体验 {trialRemaining}/5 �?/span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleImportCsv} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-50 transition-colors">
            <Upload className="w-3.5 h-3.5" /> 导入对话
          </button>
          <button onClick={handleExportResults} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> 导出结果
          </button>
        </div>
      </div>
      {/* 价值引�?*/}
      <div className="mb-6 px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl">
        <p className="text-sm font-medium text-violet-800">粘贴聊天记录，AI帮你4维打分——不用自己一条条�?/p>
        <p className="text-xs text-violet-600 mt-1">从响应速度、话术规范、服务态度、问题解�?个维度自动评分，1秒找出改进点</p>
      </div>

      {/* 粘贴�?*/}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <label className="text-sm font-medium text-gray-700 mb-2 block">粘贴你的聊天记录</label>
        <textarea value={chatContent} onChange={e => setChatContent(e.target.value)} rows={6} placeholder="把跟客户的聊天记录粘贴到这里..." className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 text-sm px-3 py-2 placeholder-gray-400 resize-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300" />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" /> AI从响应速度、话术规范、服务态度、问题解�?个维度打�?/p>
          <button onClick={handleCheck} disabled={checking || !chatContent.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {checking ? 'AI分析�?..' : '开始自检'}
          </button>
        </div>
      </div>

      {/* 当前查看的结�?*/}
      {selectedResult && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">自检结果</h3>
            <button onClick={() => setSelectedResult(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>

          {/* 4维环形图 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {DIMENSIONS.map(dim => (
              <ScoreRing
                key={dim.key}
                score={selectedResult[dim.key]}
                max={25}
                label={`${dim.icon} ${dim.label}`}
                color={dim.color}
              />
            ))}
          </div>

          {/* 总分 */}
          <div className="text-center mb-5 py-3 bg-gray-50 rounded-xl">
            <span className="text-sm text-gray-500">总分 </span>
            <span className={`text-3xl font-bold ${totalColor(selectedResult.total_score)}`}>{selectedResult.total_score}<span className="text-base text-gray-400">/100</span></span>
          </div>

          {/* 扣分详情 - 3步展�?*/}
          {selectedResult.issues && (
            <div className="mb-4">
              <h4 className="text-sm font-bold text-red-700 mb-3">扣分详情</h4>
              <div className="space-y-3">
                {parseIssues(selectedResult.issues).map((item, idx) => (
                  <div key={idx} className="bg-white border border-red-100 rounded-lg overflow-hidden">
                    {/* 问题 */}
                    <div className="px-4 py-2.5 bg-red-50 flex items-start gap-2">
                      <span className="text-xs font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded shrink-0">问题</span>
                      <p className="text-sm text-gray-800">{item.problem}</p>
                    </div>
                    {/* 建议 + 替代话术 */}
                    {(item.suggestion || item.alternative) && (
                      <div className="px-4 py-2.5 flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          {item.suggestion && <p className="text-sm text-emerald-700">{item.suggestion}</p>}
                          {item.alternative && (
                            <div className="mt-1 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded text-sm text-emerald-800">
                              💬 {item.alternative}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 改进建议 */}
          {selectedResult.suggestions && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
              <h4 className="text-sm font-bold text-emerald-700 mb-2">改进建议</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedResult.suggestions}</p>
            </div>
          )}
        </div>
      )}

      {/* 历史结果 */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
      ) : results.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-base">暂无自检记录</p>
          <p className="text-sm mt-1">粘贴聊天记录，开始第一次对话自检</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 mb-2">历史自检</h3>
          {results.map(r => (
            <div key={r.id} onClick={() => setSelectedResult(r)} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <span className={`text-lg font-bold ${totalColor(r.total_score)}`}>{r.total_score}�?/span>
                <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <span className="text-sm text-violet-600 hover:underline">查看</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
