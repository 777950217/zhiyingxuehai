'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';

interface UseBusinessDataResult<T> {
  data: T | null;
  isDemo: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 经营看板数据Hook
 * 从 /api/business-data 读取导入的数据
 * 有数据 → { data, isDemo: false }
 * 无数据 → { data: null, isDemo: true }（调用方自行决定用Mock还是显示空状态）
 */
export function useBusinessData<T = unknown>(dataType: string): UseBusinessDataResult<T> {
  const { authFetch, profile } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile?.companyId || !dataType) {
      setLoading(false);
      setIsDemo(true);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authFetch(`/api/business-data?data_type=${dataType}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setData(json.data as T);
          setIsDemo(false);
        } else {
          setData(null);
          setIsDemo(true);
        }
      } else {
        setData(null);
        setIsDemo(true);
      }
    } catch (err: any) {
      setError(err.message || '获取数据失败');
      setData(null);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [profile?.companyId, dataType, authFetch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isDemo, loading, error, refetch: fetchData };
}
