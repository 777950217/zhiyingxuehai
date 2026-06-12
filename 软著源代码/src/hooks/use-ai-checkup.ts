'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

interface CheckupResult {
  loading: boolean;
  result: string | null;
  error: string | null;
  usageCount: number;
  limitReached: boolean;
  startCheckup: (type: string, input: string, mode?: string, productContext?: Record<string, unknown> | null, role?: string) => Promise<void>;
  reset: () => void;
}

const FREE_LIMIT = 3;

export function useAiCheckup(): CheckupResult {
  const { authFetch, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usageCount, setUsageCount] = useState(() => parseInt(localStorage.getItem('checkup_usage_count') || '0', 10));
  const [limitReached, setLimitReached] = useState(false);

  // Load usage count from Supabase on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch('/api/user-stats?stat_type=checkup_usage_count');
        if (res.ok) {
          const { data } = await res.json();
          if (data?.stat_value) {
            const count = parseInt(data.stat_value, 10);
            setUsageCount(count);
            localStorage.setItem('checkup_usage_count', String(count));
          }
        }
      } catch { /* fallback to localStorage default */ }
    })();
  }, [authFetch]);

  const startCheckup = useCallback(async (type: string, input: string, mode?: string, productContext?: Record<string, unknown> | null, role?: string) => {
    setLoading(true);
    setResult(null);
    setError(null);

    // Check usage limit for basic users
    const isBasic = role === 'staff' || role === 'personal_user' || role === 'efficiency_user';
    if (isBasic && usageCount >= FREE_LIMIT) {
      setLimitReached(true);
      setLoading(false);
      setError('您已使用完免费体检额度。订阅专业版即可无限使用AI体检，还可解锁更多功能。');
      return;
    }

    try {
      const response = await fetch('/api/ai-checkup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, input, mode, productContext, role }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                setError(data.error);
              } else if (data.done) {
                accumulated = data.fullContent || accumulated;
              } else if (data.content) {
                accumulated += data.content;
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }

      setResult(accumulated);

      // Increment usage count after successful checkup
      if (isBasic) {
        const newCount = usageCount + 1;
        setUsageCount(newCount);
        localStorage.setItem('checkup_usage_count', String(newCount));
        // Sync to Supabase
        try {
          await authFetch('/api/user-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stat_type: 'checkup_usage_count', stat_value: String(newCount) }),
          });
        } catch { /* ignore sync failure */ }
        if (newCount >= FREE_LIMIT) {
          setLimitReached(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, [usageCount, authFetch]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return { loading, result, error, usageCount, limitReached, startCheckup, reset };
}
