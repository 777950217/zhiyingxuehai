import { NextRequest, NextResponse } from 'next/server';

// ─── In-memory rate limit store (single instance) ───
interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp when counter resets
}

const ipStore = new Map<string, RateLimitEntry>();
const userStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of ipStore) {
    if (now > entry.resetAt) ipStore.delete(key);
  }
  for (const [key, entry] of userStore) {
    if (now > entry.resetAt) userStore.delete(key);
  }
}, 5 * 60 * 1000);

// ─── Rate limit configs ───
interface RateLimitRule {
  windowMs: number;   // time window in milliseconds
  maxRequests: number; // max requests per window
}

const AUTH_LIMIT: RateLimitRule = { windowMs: 5 * 60 * 1000, maxRequests: 10 };       // /api/auth/* 5min/10次
const REGISTER_LIMIT: RateLimitRule = { windowMs: 5 * 60 * 1000, maxRequests: 5 };    // /api/auth/register 5min/5次
const AI_CHECKUP_LIMIT: RateLimitRule = { windowMs: 24 * 60 * 60 * 1000, maxRequests: 20 }; // /api/ai-checkup/* daily/20次

function getClientIP(request: NextRequest): string {
  // Try common proxy headers first
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

function checkRateLimit(
  store: Map<string, RateLimitEntry>,
  key: string,
  windowMs: number,
  maxRequests: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    const newEntry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
    store.set(key, newEntry);
    return { allowed: true, remaining: maxRequests - 1, resetAt: newEntry.resetAt };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Rate limiting for /api/auth/register (stricter) ───
  if (pathname === '/api/auth/register') {
    const ip = getClientIP(request);
    const result = checkRateLimit(ipStore, `register:${ip}`, REGISTER_LIMIT.windowMs, REGISTER_LIMIT.maxRequests);
    if (!result.allowed) {
      return NextResponse.json(
        { error: '注册请求过于频繁，请5分钟后再试' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }
  }

  // ─── Rate limiting for /api/auth/* (except register which has its own limit) ───
  if (pathname.startsWith('/api/auth/') && pathname !== '/api/auth/register') {
    const ip = getClientIP(request);
    const result = checkRateLimit(ipStore, `auth:${ip}`, AUTH_LIMIT.windowMs, AUTH_LIMIT.maxRequests);
    if (!result.allowed) {
      return NextResponse.json(
        { error: '登录请求过于频繁，请5分钟后再试' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }
  }

  // ─── Rate limiting for /api/ai-checkup/* (per user, daily) ───
  if (pathname.startsWith('/api/ai-checkup/')) {
    // User ID from header (set by client after auth), fallback to IP
    const userId = request.headers.get('x-user-id') || getClientIP(request);
    const result = checkRateLimit(userStore, `ai:${userId}`, AI_CHECKUP_LIMIT.windowMs, AI_CHECKUP_LIMIT.maxRequests);
    if (!result.allowed) {
      return NextResponse.json(
        { error: '今日AI体检次数已用完，明天再来吧' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Limit': String(AI_CHECKUP_LIMIT.maxRequests),
          },
        },
      );
    }
    // Add rate limit headers to successful responses
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Limit', String(AI_CHECKUP_LIMIT.maxRequests));
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/auth/:path*', '/api/ai-checkup/:path*'],
};
