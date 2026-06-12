'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { BookOpen, Send, Copy, Check, Loader2, Lightbulb, ArrowRight, Search } from 'lucide-react';
import { toast } from 'sonner';

const QUICK_QUESTIONS = [
  '退换货时效一般是多久�?,
  '大件商品物流破损怎么处理�?,
  '客户催发货怎么安抚�?,
  '商品尺码不合适怎么处理�?,
  '产品质保期一般是多久�?,
  '赠品缺货怎么回复客户�?,
];

interface QAItem {
  question: string;
  answer: string;
  timestamp: Date;
}

export default function KnowledgeQAPage() {
  const { profile, authFetch } = useAuth();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QAItem[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleAsk = useCallback(async (q?: string) => {
    const query = q || question.trim();
    if (!query) return;

    setLoading(true);
    setQuestion('');

    try {
      const res = await authFetch('/api/ai/knowledge-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          companyId: profile?.companyId,
          userId: profile?.id,
        }),
      });

      if (!res.ok) throw new Error('请求失败');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('无法读取响应�?);

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullText += data.content;
              }
            } catch { /* skip */ }
          }
        }
      }

      if (fullText) {
        setHistory(prev => [{ question: query, answer: fullText, timestamp: new Date() }, ...prev]);
      } else {
        setHistory(prev => [{ question: query, answer: '暂无回答，请换个方式提问', timestamp: new Date() }, ...prev]);
      }
    } catch {
      toast.error('查询失败，请重试');
      setQuestion(query);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [question, profile, authFetch]);

  const handleCopy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-blue-100">
          <BookOpen className="h-5 w-5 text-blue-800" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">产品百科</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">知识</span>
          </div>
          <p className="text-sm text-muted-foreground">查产品知识，一搜就�?/p>
        </div>
      </div>

      {/* Quick Questions */}
      <div className="flex flex-wrap gap-2">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => handleAsk(q)}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded-full border border-border hover:bg-accent transition-colors disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAsk();
            }
          }}
          placeholder="输入产品问题，如：智能马桶E1故障怎么处理�?
          className="flex-1 min-h-[44px] max-h-32 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          rows={1}
        />
        <Button onClick={() => handleAsk()} disabled={loading || !question.trim()} className="bg-blue-900 hover:bg-blue-900/90">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 border rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          AI正在查阅资料...
        </div>
      )}

      {/* History */}
      {history.map((item, idx) => (
        <div key={idx} className="border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">{item.question}</span>
          </div>
          <div className="px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed relative">
            {item.answer}
            <button
              onClick={() => handleCopy(item.answer, idx)}
              className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-accent transition-colors"
              title="复制"
            >
              {copiedIdx === idx ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      ))}

      {/* Empty State */}
      {history.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">输入产品问题或点击上方快捷问题开始查�?/p>
          <p className="text-xs mt-2 text-muted-foreground/70">售后处理问题请使用「AI急救站」，话术练习请使用「话术练兵场�?/p>
        </div>
      )}

      {/* Link to Practice */}
      <div className="border rounded-lg p-4 bg-muted/30 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">遇到售后问题需要实战方案？</p>
          <p className="text-xs text-muted-foreground">AI急救站帮你秒出方�?话术</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.href = '/ai-assistant'}>
          去急救�?
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
