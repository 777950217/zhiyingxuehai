'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { markOnboardingDay } from '@/lib/onboarding-helpers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, Copy, Check, ThumbsUp, Clock, FileText, Download, X, AlertCircle, MessageCircle, ChevronDown, ChevronUp, ClipboardList, Loader2, Star, Brain, MessageSquare, ArrowRight, BookOpen, Lightbulb, Package } from 'lucide-react';
import UpgradeHint from '@/components/upgrade-hint';
import { PageHint } from '@/components/page-hint';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Link from 'next/link';

const DIAGNOSIS_TYPES = [
  { id: '投诉处理', icon: '😤', desc: '客户投诉安抚与处�?, color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' },
  { id: '转化提升', icon: '📈', desc: '提升咨询到成交转化率', color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
  { id: '响应速度', icon: '�?, desc: '缩短客户等待时间', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
  { id: '话术优化', icon: '💬', desc: '优化话术表达和效�?, color: 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100' },
  { id: '流程问题', icon: '🔄', desc: '流程效率与管理问�?, color: 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100' },
];

const QUICK_SCENARIOS = [
  { label: '客户要退�?, icon: '📦' },
  { label: '客户嫌贵', icon: '💰' },
  { label: '客户说质量差', icon: '⚠️' },
  { label: '缺配�?, icon: '🔧' },
  { label: '客户不会�?, icon: '�? },
  { label: '客户要补�?, icon: '🎯' },
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  diagnosisType?: string;
  solutionId?: string;
  isHelpful?: boolean;
  showUpgrade?: boolean;
  timestamp: Date;
}

interface ChatHistoryItem {
  id: string;
  title: string;
  messages: { role: string; content: string; timestamp: string }[];
  tags: string[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export default function AIAssistantPage() {
  const { profile, user, authFetch } = useAuth();
  const searchParams = useSearchParams();
  const prefilledPrompt = searchParams.get('prompt') || searchParams.get('prefill');
  const [showPrefillGuide, setShowPrefillGuide] = useState(!!(searchParams.get('prompt') || searchParams.get('prefill')));
  const [highlightInput, setHighlightInput] = useState(!!searchParams.get('prefill'));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [diagnosisType, setDiagnosisType] = useState('');
  const [sending, setSending] = useState(false);
  const [aiUsageCount, setAiUsageCount] = useState(() => parseInt(localStorage.getItem('ai_usage_count') || '0', 10));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [helpfulIds, setHelpfulIds] = useState<Set<string>>(new Set());
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [creditsDialog, setCreditsDialog] = useState(false);
  const [freeQuotaUsed, setFreeQuotaUsed] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [expandedAnalysis, setExpandedAnalysis] = useState<Set<string>>(new Set());

  // Load AI usage count from Supabase on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch('/api/user-stats?stat_type=ai_usage_count');
        if (res.ok) {
          const { data } = await res.json();
          if (data?.stat_value) {
            const count = parseInt(data.stat_value, 10);
            setAiUsageCount(count);
            localStorage.setItem('ai_usage_count', String(count));
          }
        }
      } catch { /* fallback to localStorage default */ }
    })();
  }, [authFetch]);  // Chat history state
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Product profile: Supabase优先 �?localStorage降级
  const [productProfile, setProductProfile] = useState<{
    brand: string; category: string; products: { name: string; warranty: number; priceRange: string }[];
    teamSize: number; complaintTypes: string[];
    aiGenerated: { features: string[]; materials: string[]; commonIssues: { question: string; answer: string }[]; quickPhrases: { presale: string[]; aftersale: string[] } } | null;
  } | null>(null);

  useEffect(() => {
    (async () => {
      // 优先从Supabase读取
      try {
        const res = await authFetch('/api/personal-product-profile');
        if (res.ok) {
          const { data } = await res.json();
          if (data) {
            const spec = (data.specifications as Record<string, unknown>) || {};
            const p = {
              brand: data.brand || '',
              category: data.category || '',
              products: (spec as { products?: { name: string; warranty: number; priceRange: string }[] }).products || [],
              teamSize: (spec as { teamSize?: number }).teamSize || 1,
              complaintTypes: (spec as { complaintTypes?: string[] }).complaintTypes || [],
              aiGenerated: (data.features as { features: string[]; materials: string[]; commonIssues: { question: string; answer: string }[]; quickPhrases: { presale: string[]; aftersale: string[] } } | null) || null,
            };
            setProductProfile(p);
            // 同步到localStorage作降级缓�?
            localStorage.setItem('personal_product_profile', JSON.stringify(p));
            return;
          }
        }
      } catch { /* Supabase失败，降级localStorage */ }
      // 降级：从localStorage读取
      try {
        const raw = localStorage.getItem('personal_product_profile');
        if (raw) setProductProfile(JSON.parse(raw));
      } catch { /* ignore */ }
    })();
  }, [authFetch]);

  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showSaveToKB, setShowSaveToKB] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [savingToKB, setSavingToKB] = useState(false);
  const [orderMsgId, setOrderMsgId] = useState<string | null>(null);
  const [orderUserQuery, setOrderUserQuery] = useState('');
  const [orderCategory, setOrderCategory] = useState('');
  const [orderAiJudgment, setOrderAiJudgment] = useState('');
  const [orderAiScript, setOrderAiScript] = useState('');
  const [orderForm, setOrderForm] = useState({
    customer_name: '',
    customer_phone: '',
    order_no: '',
    customer_type: 'C�?,
    source: '电商平台',
    priority: '普�?,
    notes: '',
  });
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 学习进度上下文（仅personal_user�?
  const isPersonalUser = profile?.role === 'personal_user';
  const [learningContext, setLearningContext] = useState<{
    recentlyCompleted: { id: string; stage: number; lesson_number: number; title: string; completed_at: string }[];
    recommendations: { icon: string; title: string; desc: string; href: string; fromLesson: string }[];
    totalCompleted: number;
    totalLessons: number;
    isAllCompleted: boolean;
  } | null>(null);
  const [showRecentCourseModal, setShowRecentCourseModal] = useState(false);
  const [dismissedRecentCourse, setDismissedRecentCourse] = useState<string | null>(null);

  // 获取学习进度上下�?
  useEffect(() => {
    if (!isPersonalUser || !profile?.id) return;
    authFetch('/api/courses?action=learning-context')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setLearningContext(data);
          // 检查是否有24小时内完成的课程，弹出引�?
          if (data.recentlyCompleted?.length > 0) {
            const latest = data.recentlyCompleted[0];
            const dismissKey = `recent_course_dismissed_${latest.id}`;
            if (!localStorage.getItem(dismissKey)) {
              setDismissedRecentCourse(latest.id);
              setShowRecentCourseModal(true);
            }
          }
        }
      })
      .catch(() => {});
  }, [isPersonalUser, profile?.id]);

  // Prefill prompt from URL (e.g. after industry dialog / onboarding tour)
  useEffect(() => {
    if (prefilledPrompt) {
      setInput(decodeURIComponent(prefilledPrompt));
      setTimeout(() => inputRef.current?.focus(), 300);
    }
    // Highlight input area for 3 seconds when coming from onboarding
    if (searchParams.get('prefill') && highlightInput) {
      const timer = setTimeout(() => setHighlightInput(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [prefilledPrompt]);

  // Fetch chat history from ai_chat_history + restore last conversation
  useEffect(() => {
    if (!profile?.id) return;
    authFetch(`/api/ai-chat-history?user_id=${profile.id}&page_size=30`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.data) {
          setChatHistory(data.data);
          // Restore the most recent conversation on page load
          if (data.data.length > 0 && messages.length === 0) {
            const latest = data.data[0];
            const restoredMessages: ChatMessage[] = (latest.messages || []).map(
              (m: { role: string; content: string; timestamp: string; diagnosisType?: string }, i: number) => ({
                id: `${m.role}-${i}-${Date.now()}`,
                role: m.role as 'user' | 'assistant',
                content: m.content,
                diagnosisType: m.diagnosisType,
                timestamp: new Date(m.timestamp),
              })
            );
            if (restoredMessages.length > 0) {
              setMessages(restoredMessages);
              setCurrentChatId(latest.id);
              if (restoredMessages[0].diagnosisType) {
                setDiagnosisType(restoredMessages[0].diagnosisType);
              }
            }
          }
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // Auto-save chat to Supabase after each AI reply
  const saveChatToSupabase = useCallback(async (msgs: ChatMessage[], chatId: string | null) => {
    if (!profile?.id || msgs.length === 0) return null;
    const title = msgs[0]?.content?.slice(0, 30) || '新对�?;
    const serializableMsgs = msgs.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
      ...(m.diagnosisType ? { diagnosisType: m.diagnosisType } : {}),
    }));

    try {
      if (chatId) {
        // Update existing chat
        await authFetch(`/api/ai-chat-history/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: serializableMsgs, title }),
        });
        return chatId;
      } else {
        // Create new chat
        const res = await authFetch('/api/ai-chat-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: profile.id,
            company_id: profile.companyId || null,
            title,
            messages: serializableMsgs,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const newId = data?.data?.id;
          if (newId) {
            setCurrentChatId(newId);
            // Refresh history list
            authFetch(`/api/ai-chat-history?user_id=${profile.id}&page_size=30`)
              .then(r => r.ok ? r.json() : null)
              .then(d => { if (d?.data) setChatHistory(d.data); })
              .catch(() => { toast.error('对话历史同步失败'); });
          }
          return newId;
        }
      }
    } catch {
      toast.error('对话保存失败，数据已暂存本地，恢复网络后将自动同�?);
    }
    return null;
  }, [profile?.id, profile?.companyId, authFetch]);

  // Debounced auto-save after messages change
  useEffect(() => {
    if (messages.length === 0) return;
    // Only save when there's at least one user + one assistant message
    const hasUser = messages.some(m => m.role === 'user');
    const hasAssistant = messages.some(m => m.role === 'assistant' && m.content);
    if (!hasUser) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      // Only auto-save if the last message is from assistant and has content
      const last = messages[messages.length - 1];
      if (last.role === 'assistant' && last.content) {
        saveChatToSupabase(messages, currentChatId);
      }
    }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [messages, currentChatId, saveChatToSupabase]);

  // Fetch credits
  useEffect(() => {
    if (!profile?.id) return;
    authFetch(`/api/credits?userId=${profile.id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.remainingCredits !== undefined) setRemainingCredits(data.remainingCredits);
      })
      .catch(() => {});
  }, [profile?.id]);

  // First-time usage check
  const [isFirstTime, setIsFirstTime] = React.useState(false);
  const [exampleQuestions, setExampleQuestions] = React.useState<string[]>([]);

  useEffect(() => {
    const dismissed = localStorage.getItem('ai_first_time_dismissed');
    if (!dismissed) {
      authFetch(`/api/problem-solutions?companyId=${profile?.companyId}&limit=1`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          const records = data?.data || data || [];
          if (records.length === 0) {
            setIsFirstTime(true);
            const questions: string[] = [];
            questions.push('客户收到货说陶瓷有裂痕拒绝安装怎么办？');
            questions.push('客户用了半个月觉得不好用要求拆走退货怎么处理�?);
            if (profile?.companyId) {
              authFetch(`/api/product-profile?companyId=${profile.companyId}`)
                .then(r => r.json())
                .then(profileData => {
                  const cats = (profileData?.data?.categories || '').toLowerCase();
                  if (cats.includes('花洒') || cats.includes('龙头')) {
                    questions.unshift('客户说水压太小花洒不出水怎么办？');
                  } else if (cats.includes('浴室�?)) {
                    questions.unshift('客户说柜门关不紧有缝隙怎么办？');
                  } else if (cats.includes('马桶')) {
                    questions.unshift('客户说冲水效果不好怎么排查�?);
                  }
                  setExampleQuestions(questions.slice(0, 3));
                })
                .catch(() => {
                  setExampleQuestions(questions.slice(0, 3));
                });
            } else {
              setExampleQuestions(questions.slice(0, 3));
            }
          } else {
            localStorage.setItem('ai_first_time_dismissed', '1');
          }
        })
        .catch(() => {});
    }
  }, [profile?.companyId, profile?.companyName]);

  // Auto-scroll when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mobile keyboard: scroll to bottom when virtual keyboard appears
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport && window.visualViewport.height < window.innerHeight * 0.8) {
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => { window.visualViewport?.removeEventListener('resize', handleResize); };
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    if (!diagnosisType) return;

    // Basic plan AI usage limit (5 free uses)
    const role = profile?.role || 'staff';
    const isBasic = role === 'staff' || role === 'personal_user';
    if (isBasic) {
      const currentCount = aiUsageCount;
      if (currentCount >= 5) {
        setMessages(prev => [...prev, {
          id: `limit-${Date.now()}`,
          role: 'assistant' as const,
          content: '您已使用完免费AI体验额度。订阅专业版即可无限使用AI助手，还可解锁KPI管理、质检等更多功能�?,
          timestamp: new Date(),
          showUpgrade: true,
        }]);
        return;
      }
      const newCount = currentCount + 1;
      setAiUsageCount(newCount);
      localStorage.setItem('ai_usage_count', String(newCount));
      // Sync to Supabase
      authFetch('/api/user-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stat_type: 'ai_usage_count', stat_value: String(newCount) }),
      }).catch(() => {});
    }

    if (isFirstTime) {
      setIsFirstTime(false);
      localStorage.setItem('ai_first_time_dismissed', '1');
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      diagnosisType,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setShowPrefillGuide(false);
    setInput('');
    setSending(true);

    try {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const res = await authFetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosisType,
          problem: input,
          userId: profile?.id,
          companyId: profile?.companyId,
          productContext: productProfile ? {
            brand: productProfile.brand,
            category: productProfile.category,
            products: productProfile.products.filter(p => p.name.trim()).map(p => `${p.name}(${p.warranty}年质�?${p.priceRange})`),
            complaintTypes: productProfile.complaintTypes,
            features: productProfile.aiGenerated?.features || [],
            commonIssues: productProfile.aiGenerated?.commonIssues?.map(i => i.question) || [],
            quickPhrases: productProfile.aiGenerated?.quickPhrases || null,
          } : null,
        }),
        signal: ctrl.signal,
      });

      if (res.status === 403) {
        setCreditsDialog(true);
        setSending(false);
        return;
      }

      if (!res.ok) {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: '抱歉，AI助手暂时无法响应，请稍后重试�?,
          timestamp: new Date(),
        }]);
        setSending(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      // Day3: 使用AI问题解决�?�?完成
      markOnboardingDay(authFetch, 3);

      const decoder = new TextDecoder();
      let fullText = '';
      const assistantId = `ai-${Date.now()}`;

      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.content) {
              fullText += parsed.content;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: fullText } : m
              ));
            }
            if (parsed.done) {
              if (parsed.freeQuotaUsed) setFreeQuotaUsed(true);
              if (parsed.creditsRemaining !== undefined) setRemainingCredits(parsed.creditsRemaining);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Diagnosis error:', err);
      }
    } finally {
      setSending(false);
    }
  }, [input, diagnosisType, sending, profile, isFirstTime]);

  // Load a chat from history
  const loadChat = useCallback(async (chatId: string) => {
    try {
      const res = await authFetch(`/api/ai-chat-history?id=${chatId}`);
      if (!res.ok) return;
      const data = await res.json();
      const chat = data?.data;
      if (!chat) return;

      const loadedMessages: ChatMessage[] = (chat.messages || []).map((m: { role: string; content: string; timestamp: string; diagnosisType?: string }, i: number) => ({
        id: `${m.role}-${i}-${Date.now()}`,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        diagnosisType: m.diagnosisType,
        timestamp: new Date(m.timestamp),
      }));
      setMessages(loadedMessages);
      setCurrentChatId(chatId);
      if (loadedMessages.length > 0 && loadedMessages[0].diagnosisType) {
        setDiagnosisType(loadedMessages[0].diagnosisType);
      }
      setShowHistory(false);
    } catch { /* ignore */ }
  }, [authFetch]);

  // Delete a chat from history
  const deleteChat = useCallback(async (chatId: string) => {
    if (!confirm('确定删除这条对话记录�?)) return;
    setDeletingId(chatId);
    try {
      await authFetch(`/api/ai-chat-history/${chatId}`, { method: 'DELETE' });
      setChatHistory(prev => prev.filter(c => c.id !== chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
      }
    } catch { /* ignore */ }
    setDeletingId(null);
  }, [authFetch, currentChatId]);

  // Start new chat
  const startNewChat = useCallback(() => {
    setMessages([]);
    setCurrentChatId(null);
    setInput('');
    setDiagnosisType('');
  }, []);

  // 存入知识�?
  const handleOpenSaveToKB = useCallback(() => {
    const firstUserMsg = messages.find(m => m.role === 'user');
    const defaultTitle = firstUserMsg ? firstUserMsg.content.slice(0, 20) : 'AI对话记录';
    setSaveTitle(defaultTitle);
    setShowSaveToKB(true);
  }, [messages]);

  const handleSaveToKnowledgeBase = useCallback(async () => {
    if (!profile?.id) return;
    const firstUserMsg = messages.find(m => m.role === 'user');
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.content);
    if (!firstUserMsg) return;

    setSavingToKB(true);
    try {
      const res = await authFetch('/api/phrases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: profile.companyId || null,
          category: 'AI对话精华',
          question: firstUserMsg.content.slice(0, 100),
          answer: lastAssistantMsg?.content?.slice(0, 500) || '',
          content: JSON.stringify(messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp.toISOString() }))),
          scene: 'AI急救�?,
          tags: ['AI对话', '急救�?],
          is_preset: false,
          created_by: profile.id,
        }),
      });
      if (res.ok) {
        toast.success('已保存到我的知识�?);
        setShowSaveToKB(false);
      } else {
        toast.error('保存失败，请重试');
      }
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setSavingToKB(false);
    }
  }, [messages, profile?.id, profile?.companyId, authFetch]);

  const handleHelpful = useCallback(async (solutionId: string, feedback?: string) => {
    if (helpfulIds.has(solutionId)) return;
    setHelpfulIds(prev => new Set(prev).add(solutionId));
    setFeedbackId(null);
    try {
      const updateData: Record<string, unknown> = { id: solutionId, is_helpful: true };
      if (feedback?.trim()) updateData.customer_feedback = feedback.trim();
      await authFetch('/api/problem-solutions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
    } catch { /* ignore */ }
  }, [helpfulIds]);

  const handleCopy = useCallback(async (text: string, id: string, withFormat = false) => {
    let finalText = text;

    // 带格式复制：加上表情和换�?
    if (withFormat) {
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        // 问候语处理：第一行前加表�?
        lines[0] = '😊 ' + lines[0];
        // 结尾加表�?
        lines.push('🤝 祝您生活愉快�?);
        finalText = lines.join('\n\n');
      }
    }

    try {
      await navigator.clipboard.writeText(finalText);
      setCopiedId(id);
      toast.success(withFormat ? '带格式话术已复制' : '话术已复�?);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('复制失败，请手动复制');
    }
  }, []);

  const handleExportPDF = useCallback(() => {
    const content = messages.map(m =>
      m.role === 'user'
        ? `�?{m.diagnosisType}�?{m.content}`
        : m.content
    ).join('\n\n---\n\n');

    const blob = new Blob([
      `职盈学海 - 问题诊断报告\n`,
      `日期�?{new Date().toLocaleDateString()}\n`,
      `诊断类型�?{diagnosisType}\n\n`,
      content
    ], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `诊断报告_${diagnosisType}_${new Date().toLocaleDateString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, diagnosisType]);

  const toggleAnalysis = useCallback((msgId: string) => {
    setExpandedAnalysis(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }, []);

  const renderAssistantMessage = (msg: ChatMessage) => {
    const content = msg.content;
    if (!content) return <span className="animate-pulse">AI正在分析...</span>;

    // Try to parse the new 2-section format: 【话术】and 【分析�?
    const sections = content.split(/�?[^】]+)�?);
    if (sections.length > 1) {
      let scriptContent = '';
      let analysisContent = '';
      const isExpanded = expandedAnalysis.has(msg.id);

      for (let i = 1; i < sections.length; i += 2) {
        const title = sections[i];
        const body = sections[i + 1] || '';
        if (title === '话术') {
          scriptContent = body.trim();
        } else if (title === '分析') {
          analysisContent = body.trim();
        }
      }

      // If we found 话术 and 分析 sections, render in new format
      if (scriptContent || analysisContent) {
        return (
          <div className="space-y-3">
            {/* Script section - prominent, top */}
            {scriptContent && (
              <div className="rounded-lg border-2 border-green-300 bg-green-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm flex items-center gap-1.5 text-green-700">
                    📋 可直接发送的话术
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleCopy(scriptContent, `script-${msg.id}`, false)}
                      className="h-8 px-3 text-xs font-medium gap-1.5 bg-[#0F2B46] hover:bg-[#1a3a5c] text-white shadow-sm"
                    >
                      {copiedId === `script-${msg.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      复制话术
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(scriptContent, `script-formatted-${msg.id}`, true)}
                      className="h-8 px-3 text-xs gap-1.5 border-[#2B7DE9]/30 text-[#2B7DE9] hover:bg-[#2B7DE9]/10 hover:text-[#1a5fb4]"
                    >
                      {copiedId === `script-formatted-${msg.id}` ? <Check className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                      带格�?
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{scriptContent}</p>
              </div>
            )}

            {/* Analysis section - collapsible */}
            {analysisContent && (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleAnalysis(msg.id)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-600 flex items-center gap-1.5">
                    🔍 判断依据
                  </span>
                  <div className="flex items-center gap-1">
                    {isExpanded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleCopy(analysisContent, `analysis-${msg.id}`); }}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                        title="复制分析"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className="p-3 border-t border-gray-200 bg-white">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{analysisContent}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      // Fallback for old 4-section format (backward compatibility)
      const colors: Record<string, string> = {
        '问题分析': 'border-sky-200 bg-sky-50',
        '解决方案': 'border-gray-300 bg-gray-50',
        '推荐话术': 'border-green-300 bg-green-50',
        '预防建议': 'border-blue-300 bg-blue-50',
      };
      const icons: Record<string, string> = {
        '问题分析': '🔍',
        '解决方案': '💡',
        '推荐话术': '💬',
        '预防建议': '🛡�?,
      };
      const elements: React.ReactNode[] = [];
      for (let i = 1; i < sections.length; i += 2) {
        const title = sections[i];
        const body = sections[i + 1] || '';
        if (colors[title]) {
          const scriptLines = title === '推荐话术'
            ? body.split('\n').filter((l: string) => l.trim().startsWith('>')).map((l: string) => l.replace(/^>\s*/, ''))
            : [];

          elements.push(
            <div key={i} className={`rounded-lg border p-3 ${colors[title]}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm flex items-center gap-1">
                  {icons[title]} {title}
                </span>
                {title === '推荐话术' && scriptLines.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleCopy(scriptLines.join('\n'), `script-${msg.id}`, false)}
                      className="h-7 px-2.5 text-xs font-medium gap-1 bg-[#0F2B46] hover:bg-[#1a3a5c] text-white shadow-sm"
                    >
                      {copiedId === `script-${msg.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      复制话术
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(scriptLines.join('\n'), `script-formatted-${msg.id}`, true)}
                      className="h-7 px-2.5 text-xs gap-1 border-[#2B7DE9]/30 text-[#2B7DE9] hover:bg-[#2B7DE9]/10 hover:text-[#1a5fb4]"
                    >
                      {copiedId === `script-formatted-${msg.id}` ? <Check className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                      带格�?
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{body.trim()}</p>
            </div>
          );
        }
      }
      if (elements.length > 0) return <div className="space-y-2">{elements}</div>;
    }

    // Fallback: plain text
    return <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</p>;
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 bg-gray-50">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="shrink-0 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">AI急救�?/h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">紧�?/span>
                </div>
                <PageHint text="管理问题秒出方案——不会管？问AI�?秒给答案" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(profile?.role || 'staff') === 'staff' && (() => {
                const aiCount = aiUsageCount;
                return (
                  <Badge variant="outline" className="text-sky-700 border-sky-200 bg-sky-50">
                    <Sparkles className="w-3 h-3 mr-1" />
                    你还可以体验 {5 - aiCount}/5 �?
                  </Badge>
                );
              })()}
              {remainingCredits !== null && (profile?.role || 'staff') !== 'staff' && profile?.role !== 'personal_user' && profile?.role !== 'efficiency_user' && (
                <Badge variant="outline" className="text-sky-700 border-sky-200 bg-sky-50">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {freeQuotaUsed ? '今日已用' : `剩余${remainingCredits}次`}
                </Badge>
              )}
              {(profile?.role === 'personal_user' || profile?.role === 'efficiency_user') && (
                <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                  <Sparkles className="w-3 h-3 mr-1" />
                  不限次使�?
                </Badge>
              )}
              {messages.length > 0 && (
                <Button variant="outline" size="sm" onClick={startNewChat}>
                  + 新对�?
                </Button>
              )}
              {messages.length >= 2 && (
                <Button variant="outline" size="sm" onClick={handleOpenSaveToKB}>
                  <BookOpen className="w-3 h-3 mr-1" />存入知识�?
                </Button>
              )}
              {messages.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <Download className="w-3 h-3 mr-1" />导出报告
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Diagnosis type selector */}
        <div className="shrink-0 mb-3">

        {/* 学以致用推荐区域（仅personal_user + 有推荐时显示�?*/}
        {isPersonalUser && learningContext && learningContext.recommendations.length > 0 && (
          <div className="mb-3 rounded-xl bg-gradient-to-r from-blue-50 to-sky-50 border border-sky-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-sky-600" />
              <h4 className="text-base font-bold text-gray-900">学以致用</h4>
              <span className="text-sm text-gray-500">已学{learningContext.totalCompleted}/{learningContext.totalLessons}�?/span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {learningContext.recommendations.slice(0, 6).map((rec) => (
                <a
                  key={rec.fromLesson}
                  href={rec.href}
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-white border border-sky-100 hover:border-sky-300 hover:shadow-sm transition-all group"
                >
                  <span className="text-xl shrink-0 mt-0.5">{rec.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 group-hover:text-sky-700">{rec.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{rec.desc}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-sky-500 shrink-0 mt-1 transition-colors" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
            {DIAGNOSIS_TYPES.map(dt => (
              <button
                key={dt.id}
                onClick={() => setDiagnosisType(dt.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all ${
                  diagnosisType === dt.id
                    ? `${dt.color} font-bold ring-2 ring-offset-1 ${dt.id === '投诉处理' ? 'ring-red-300' : dt.id === '转化提升' ? 'ring-emerald-300' : dt.id === '响应速度' ? 'ring-amber-300' : dt.id === '话术优化' ? 'ring-sky-300' : 'ring-violet-300'}`
                    : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
                }`}
              >
                <span className="text-base">{dt.icon}</span>
                <span>{dt.id}</span>
              </button>
            ))}
          </div>
          {!diagnosisType && (
            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-500" /> 请先选择问题类型，AI会给出更精准的方�?
            </p>
          )}
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto space-y-6 pb-4 pr-2">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-sky-100 flex items-center justify-center">
                  <MessageCircle className="w-10 h-10 text-sky-500" />
                </div>
                {isFirstTime ? (
                  <>
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">欢迎使用AI急救�?/h3>
                    <p className="text-sm text-gray-600 mb-4">
                      完善产品档案后，AI会根据你的品类和痛点给出更精准的方案
                    </p>
                    <div className="space-y-2 max-w-sm mx-auto">
                      {exampleQuestions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInput(q);
                            setIsFirstTime(false);
                            localStorage.setItem('ai_first_time_dismissed', '1');
                          }}
                          className="w-full text-left px-4 py-2.5 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 hover:border-sky-300 transition-all text-sm text-gray-700"
                        >
                          <span className="text-sky-500 mr-2">💡</span>{q}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-lg mb-2 text-gray-900">选择问题类型，描述你的情�?/h3>
                    <p className="text-sm text-gray-500 max-w-md">
                      例如：客户收到马桶发现坑距不对要退货，怎么安抚�?
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-[#0F2B46] text-white'
                  : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
              }`}>
                {msg.role === 'user' ? (
                  <div>
                    {msg.diagnosisType && (
                      <div className="text-xs opacity-75 mb-1">[{msg.diagnosisType}]</div>
                    )}
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ) : (
                  <div>
                    {renderAssistantMessage(msg)}
                    {/* Upgrade prompt for personal plan */}
                    {msg.showUpgrade && (
                      <UpgradeHint />
                    )}
                    {/* Helpful button + feedback */}
                    {msg.content && !msg.content.includes('AI正在分析') && msg.content.includes('�?) && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        {helpfulIds.has(msg.id) ? (
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <ThumbsUp className="w-3 h-3" />
                            已反馈有帮助
                          </span>
                        ) : feedbackId === msg.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={feedbackText}
                              onChange={(e) => setFeedbackText(e.target.value)}
                              placeholder="说说哪里帮到你了（可选）"
                              className="w-full text-xs px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:border-sky-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleHelpful(msg.id, feedbackText);
                              }}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleHelpful(msg.id, feedbackText)}
                                className="text-xs px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                              >
                                提交反馈
                              </button>
                              <button
                                onClick={() => handleHelpful(msg.id)}
                                className="text-xs px-3 py-1 text-gray-500 hover:text-gray-700"
                              >
                                跳过
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setFeedbackId(msg.id)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-500 transition-colors"
                          >
                            <ThumbsUp className="w-3 h-3" />
                            帮到我了
                          </button>
                        )}
                      </div>
                    )}
                    {/* 创建工单按钮 */}
                    {msg.content && !msg.content.includes('AI正在分析') && msg.content.includes('�?) && (
                      <div className="mt-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => {
                            setOrderMsgId(msg.id);
                            // 找到该AI回复对应的用户消�?
                            const msgIdx = messages.findIndex(m => m.id === msg.id);
                            const userQuery = msgIdx > 0 && messages[msgIdx - 1]?.role === 'user'
                              ? messages[msgIdx - 1].content : '';
                            setOrderUserQuery(userQuery);
                            // 从AI回复中提取分�?
                            const catMatch = msg.content.match(/分类[�?]\s*(.+)/);
                            setOrderCategory(catMatch ? catMatch[1].trim() : diagnosisType || '');
                            // 从AI回复中提取话术和分析
                            const scriptMatch = msg.content.match(/【话术�?[\s\S]*?)(?=【分析】|$)/);
                            const analysisMatch = msg.content.match(/【分析�?[\s\S]*?)$/);
                            setOrderAiJudgment(analysisMatch ? analysisMatch[1].trim() : '');
                            setOrderAiScript(scriptMatch ? scriptMatch[1].trim() : '');
                            setOrderForm({
                              customer_name: '',
                              customer_phone: '',
                              customer_type: 'C�?,
                              source: '电商平台',
                              priority: '普�?,
                              notes: '',
                              order_no: '',
                            });
                            setShowCreateOrder(true);
                          }}
                        >
                          <ClipboardList className="w-3 h-3" />
                          创建工单
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                <span className="text-sm text-gray-500 animate-pulse">AI正在分析你的问题...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input area - sticky on mobile for keyboard visibility */}
        <div className="shrink-0 border-t border-gray-200 pt-3 space-y-2 bg-white sticky bottom-0 z-10 md:relative md:z-auto">
          {/* Product profile indicator */}
          {productProfile && productProfile.brand && (
            <div className="flex items-center gap-2 px-1">
              <div className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 rounded-full px-3 py-1 border border-blue-200">
                <Package className="w-3.5 h-3.5" />
                <span>当前产品：{productProfile.brand} {productProfile.category}</span>
              </div>
              <Link href="/product-profile-personal" className="text-xs text-gray-400 hover:text-blue-600">修改</Link>
            </div>
          )}
          {/* Quick scenario buttons */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {QUICK_SCENARIOS.map(scenario => (
              <button
                key={scenario.label}
                onClick={() => setInput(scenario.label)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-gray-200 bg-white text-gray-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 transition-all whitespace-nowrap shrink-0 shadow-sm"
              >
                <span>{scenario.icon}</span>
                {scenario.label}
              </button>
            ))}
          </div>
          {/* Prefill guide banner */}
          {showPrefillGuide && input && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-xl px-4 py-3 text-sm">
              <span className="text-sky-700 font-medium">5秒出结果，点击发送生成你的专属话�?/span>
              <span className="text-sky-500 text-lg animate-pulse">�?/span>
              <button onClick={() => setShowPrefillGuide(false)} className="ml-auto text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {/* Onboarding prefill guide */}
          {highlightInput && (
            <div className="flex items-center gap-2 text-sm text-sky-600 font-medium animate-pulse">
              <span className="text-lg">👇</span>
              <span>5秒出结果，点击生成你的专属话�?/span>
            </div>
          )}
          <div className="flex gap-2 relative">
            <div className="flex-1 flex flex-col">
              <textarea
              ref={inputRef}
              className={`flex-1 border rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 min-h-[44px] max-h-[120px] bg-white text-gray-900 placeholder-gray-400 transition-all duration-500 ${highlightInput ? 'border-sky-400 ring-2 ring-sky-400/30 shadow-lg shadow-sky-400/20' : 'border-gray-300'} ${input.length > 5000 ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder={diagnosisType ? `描述${diagnosisType}相关的问�?..` : '请先选择问题类型'}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 5200))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={!diagnosisType}
              rows={1}
            />
            {input.length > 4000 && (
              <div className={`text-xs mt-0.5 text-right ${input.length > 5000 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                {input.length > 5000 ? `已超�?{input.length - 5000}字，请精简内容` : `还可输入${5000 - input.length}字`}
              </div>
            )}
            </div>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sending || !diagnosisType || input.length > 5000}
              className="bg-[#0F2B46] hover:bg-[#1a3a5c] text-white shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* History sidebar */}
      {showHistory && (
        <div className="w-80 shrink-0 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
          <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-900">对话历史</h3>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={startNewChat} className="h-7 text-xs gap-1">
                + 新对�?
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {chatHistory.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">暂无对话记录</p>
                <p className="text-xs text-gray-300 mt-1">聊天内容会自动保�?/p>
              </div>
            ) : (
              chatHistory.map(chat => (
                <div
                  key={chat.id}
                  className={`p-3 border-b hover:bg-gray-50 cursor-pointer group transition-colors ${currentChatId === chat.id ? 'bg-sky-50 border-l-2 border-l-sky-400' : ''}`}
                  onClick={() => loadChat(chat.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{chat.title || '新对�?}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">
                          {new Date(chat.updated_at || chat.created_at).toLocaleDateString()} {new Date(chat.updated_at || chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-xs text-gray-400">{(chat.messages || []).length}条消�?/span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                      disabled={deletingId === chat.id}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                      title="删除对话"
                    >
                      {deletingId === chat.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* History toggle button (when sidebar is hidden) */}
      {!showHistory && (
        <button
          onClick={() => setShowHistory(true)}
          className="fixed right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg border flex items-center justify-center hover:shadow-xl transition-shadow z-10"
          title="对话历史"
        >
          <Clock className="w-4 h-4 text-gray-500" />
        </button>
      )}

      {/* Credits exhausted dialog */}
      {creditsDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl text-center">
            <Sparkles className="w-12 h-12 mx-auto text-sky-400 mb-3" />
            <h3 className="font-bold text-lg mb-2">当日免费次数已用�?/h3>
            <p className="text-sm text-gray-500 mb-4">
              {profile?.role === 'staff' || profile?.role === 'personal_user' || profile?.role === 'enterprise_manager'
                ? '今日AI体验次数已用完，明日可继续使用，或联系企业管理员解锁更多服务'
                : '今日AI体验次数已用完，明日再来，或解锁更多服务继续使用'}
            </p>
            {profile?.role !== 'staff' && profile?.role !== 'enterprise_manager' && (
              <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 mb-4">
                <p className="text-sm font-medium text-sky-800 mb-2">解锁更多服务</p>
                <div className="w-32 h-32 mx-auto bg-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-400">
                  联系客服咨询开�?
                </div>
              </div>
            )}
            <Button onClick={() => setCreditsDialog(false)} className="w-full">我知道了</Button>
          </div>
        </div>
      )}

      {/* 存入知识库确认弹�?*/}
      <Dialog open={showSaveToKB} onOpenChange={setShowSaveToKB}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              存入知识�?
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">摘要标题</label>
                <input
                  type="text"
                  value={saveTitle}
                  onChange={e => setSaveTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入标题便于后续查找"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-xs text-gray-500">
                <p>将保存以下内容到知识库「AI对话精华」分类：</p>
                <p className="text-gray-700">�?你的问题：{messages.find(m => m.role === 'user')?.content?.slice(0, 60) || '�?}�?/p>
                <p className="text-gray-700">�?AI回复：{[...messages].reverse().find(m => m.role === 'assistant' && m.content)?.content?.slice(0, 60) || '�?}�?/p>
                <p className="text-gray-700">�?完整对话记录</p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveToKB(false)} disabled={savingToKB}>取消</Button>
            <Button onClick={handleSaveToKnowledgeBase} disabled={savingToKB || !saveTitle.trim()}>
              {savingToKB ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <BookOpen className="w-4 h-4 mr-1" />}
              确认保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建工单 Modal */}
      <Dialog open={showCreateOrder} onOpenChange={setShowCreateOrder}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-sky-400" />
              创建工单
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <p className="text-xs font-medium text-gray-500 mb-1">已自动填入的信息</p>
            {orderUserQuery && (
              <div className="text-sm"><span className="text-gray-500">咨询内容�?/span><span className="text-gray-800">{orderUserQuery}</span></div>
            )}
            {orderCategory && (
              <div className="text-sm"><span className="text-gray-500">问题分类�?/span><span className="text-gray-800">{orderCategory}</span></div>
            )}
            {orderAiJudgment && (
              <div className="text-sm"><span className="text-gray-500">AI判断�?/span><span className="text-gray-700 line-clamp-2">{orderAiJudgment}</span></div>
            )}
            {orderAiScript && (
              <div className="text-sm"><span className="text-gray-500">AI话术�?/span><span className="text-gray-700 line-clamp-2">{orderAiScript}</span></div>
            )}
          </div>

          {/* 需填写信息 */}
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  客户名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={orderForm.customer_name}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customer_name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="请输入客户名�?
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">客户电话</label>
                <input
                  type="text"
                  value={orderForm.customer_phone}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="选填"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">平台订单�?<span className="text-sky-400 text-xs">（与客户名称至少填一项）</span></label>
                <input
                  type="text"
                  value={orderForm.order_no}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, order_no: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="电商平台订单号，如淘�?京东/拼多多订单号"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">客户类型</label>
                <select
                  value={orderForm.customer_type}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customer_type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <option value="C�?>C�?/option>
                  <option value="B�?>B�?/option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">来源</label>
                <select
                  value={orderForm.source}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, source: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <option value="电商平台">电商平台</option>
                  <option value="私域">私域</option>
                  <option value="线下">线下</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">优先�?/label>
                <select
                  value={orderForm.priority}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <option value="普�?>普�?/option>
                  <option value="紧�?>紧�?/option>
                </select>
              </div>
            </div>

            {orderForm.priority === '紧�? && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600 font-medium">紧急工单将立即通知处理�?/span>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">备注</label>
              <textarea
                value={orderForm.notes}
                onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
                rows={2}
                placeholder="选填，补充说�?
              />
            </div>
          </div>
          </DialogBody>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateOrder(false)} disabled={orderSubmitting}>
              取消
            </Button>
            <Button
              className="bg-[#0F2B46] hover:bg-[#1a3a5c] active:scale-95 text-white transition-all duration-200"
              disabled={(!orderForm.customer_name.trim() && !orderForm.order_no.trim()) || orderSubmitting}
              onClick={async () => {
                if (!orderForm.customer_name.trim() && !orderForm.order_no.trim()) {
                  toast.error('请输入客户名称或平台订单号（至少填一项）');
                  return;
                }
                setOrderSubmitting(true);
                try {
                  const res = await authFetch('/api/work-orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      company_id: profile?.companyId || null,
                      user_id: user?.id || null,
                      customer_name: orderForm.customer_name.trim(),
                      customer_phone: orderForm.customer_phone.trim(),
                      order_no: orderForm.order_no.trim() || null,
                      query: orderUserQuery,
                      category: orderCategory,
                      ai_judgment: orderAiJudgment,
                      ai_script: orderAiScript,
                      priority: orderForm.priority,
                      status: '待处�?,
                      source_type: 'ai_generate',
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || '创建失败');
                  // 同步创建售后管理
                  await authFetch('/api/customer-records', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      company_id: profile?.companyId || null,
                      user_id: user?.id || null,
                      customer_name: orderForm.customer_name.trim(),
                      customer_phone: orderForm.customer_phone.trim(),
                      customer_type: orderForm.customer_type,
                      source: orderForm.source,
                      notes: orderForm.notes.trim() || undefined,
                    }),
                  });
                  toast.success('工单创建成功');
                  setShowCreateOrder(false);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : '创建工单失败');
                } finally {
                  setOrderSubmitting(false);
                }
              }}
            >
              {orderSubmitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              确认创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刚完成课程引导弹窗（仅personal_user�?*/}
      {showRecentCourseModal && learningContext?.recentlyCompleted?.[0] && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">课程完成�?/h3>
              <p className="text-sm text-gray-600">
                你刚学完《{learningContext.recentlyCompleted[0].title}�?
              </p>
            </div>
            <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 mb-4">
              <p className="text-sm font-medium text-sky-800 mb-1">要试试用AI帮你落地吗？</p>
              <p className="text-xs text-sky-600">AI会根据刚学的内容，帮你生成实操方�?/p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (dismissedRecentCourse) {
                    localStorage.setItem(`recent_course_dismissed_${dismissedRecentCourse}`, '1');
                  }
                  setShowRecentCourseModal(false);
                }}
              >
                稍后
              </Button>
              <Button
                className="flex-1 bg-[#0F2B46] hover:bg-[#1a3a5c] text-white"
                onClick={() => {
                  if (dismissedRecentCourse) {
                    localStorage.setItem(`recent_course_dismissed_${dismissedRecentCourse}`, '1');
                  }
                  setShowRecentCourseModal(false);
                  // 根据刚完成的课程自动填充AI提示�?
                  const courseTitle = learningContext.recentlyCompleted[0].title;
                  const courseStage = learningContext.recentlyCompleted[0].stage;
                  const courseNum = learningContext.recentlyCompleted[0].lesson_number;
                  // 根据课程内容生成引导提示�?
                  const prompts: Record<string, string> = {
                    '1.1': '我刚学完客服主管职责，帮我制定一份每日必做清�?,
                    '1.2': '帮我写一份标准售后话术，覆盖常见场景',
                    '1.3': '帮我设计一�?维质检评分�?,
                    '1.4': '帮我分析售后成本出血点，设计赔付权限分级�?,
                    '2.1': '帮我制定一份新�?天培训计�?,
                    '2.2': '帮我排出一份高效排班表',
                    '2.3': '帮我画一份团队技能矩�?,
                    '2.4': '帮我写一�?分钟早会模板',
                    '3.1': '帮我写一份向上汇报话术模�?,
                    '3.2': '帮我写一份团队情绪急救�?,
                    '3.3': '客户恶意投诉怎么应对？给我具体话�?,
                    '3.4': '帮我制定团队KPI�?个核心指标怎么�?,
                    '4.1': '帮我写一份售后处理SOP',
                    '4.2': '帮我分析最近的数据异常',
                    '4.3': '帮我�?0+12问做一次体系自检',
                    '4.4': '帮我制定一�?个月管理成长规划',
                  };
                  const prompt = prompts[`${courseStage}.${courseNum}`] || `我刚学完�?{courseTitle}》，帮我落地实操`;
                  setInput(prompt);
                  setDiagnosisType('流程问题');
                  setTimeout(() => inputRef.current?.focus(), 200);
                }}
              >
                试试
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
