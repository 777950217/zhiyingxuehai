/**
 * API Response Cache Utility
 * In-memory cache for frequently accessed, rarely changing data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // time-to-live in ms
}

const cache = new Map<string, CacheEntry<unknown>>();

/** Get cached data if still valid */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

/** Set cache with TTL (default 5 minutes) */
export function setCache<T>(key: string, data: T, ttlMs = 300_000): void {
  cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
}

/** Invalidate cache by key prefix */
export function invalidateCache(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/** Clear all cache */
export function clearCache(): void {
  cache.clear();
}

/** Cache TTL presets */
export const TTL = {
  /** 30 seconds */
  HALF_MIN: 30_000 as const,
  /** 1 minute - for semi-volatile data */
  SHORT: 60_000 as const,
  /** 5 minutes - for course lists, configs */
  MEDIUM: 300_000 as const,
  /** 1 hour - for rarely changing data */
  LONG: 3_600_000 as const,
  /** 24 hours - for static reference data */
  DAY: 86_400_000 as const,
};

/**
 * Cached fetch wrapper for API routes
 * Usage: const data = await cachedFetch('key', () => supabase.from('table').select('*'), TTL.MEDIUM);
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = TTL.MEDIUM
): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== null) return cached;

  const data = await fetcher();
  setCache(key, data, ttlMs);
  return data;
}

/**
 * Add cache-control headers to API response
 * - public: can be cached by CDN
 * - private: only browser cache (for user-specific data)
 * - no-store: never cache (for real-time data)
 */
export function cacheHeaders(options: {
  maxAge?: number;     // seconds
  scope?: 'public' | 'private' | 'no-store';
  staleWhileRevalidate?: number; // seconds
} = {}): HeadersInit {
  if (options.scope === 'no-store') {
    return { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
  }

  const parts = [
    options.scope ?? 'private',
    `max-age=${options.maxAge ?? 60}`,
  ];
  if (options.staleWhileRevalidate) {
    parts.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }
  return { 'Cache-Control': parts.join(', ') };
}

// Periodic cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > entry.ttl) cache.delete(key);
    }
  }, 600_000);
}
