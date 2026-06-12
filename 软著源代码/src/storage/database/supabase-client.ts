import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { getReportBuffer, createWrappedFetch } from 'coze-coding-dev-sdk';

let envLoaded = false;

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

function loadEnv(): void {
  if (envLoaded || (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY)) {
    return;
  }

  try {
    try {
      require('dotenv').config();
      if (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY) {
        envLoaded = true;
        return;
      }
    } catch {
      // dotenv not available
    }

    const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;

    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex);
        let value = line.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }

    envLoaded = true;
  } catch {
    // Silently fail
  }
}

/**
 * Check if we are in a build phase where env vars may not be available.
 * During `next build`, routes are imported for page data collection,
 * but Supabase env vars are only injected at runtime.
 */
function isBuildPhase(): boolean {
  // Next.js sets NEXT_PHASE during build
  if (process.env.NEXT_PHASE === 'phase-production-build') return true;
  // If COZE_SUPABASE_URL is missing after loadEnv, assume build phase
  return false;
}

function getSupabaseCredentials(): SupabaseCredentials | null {
  // 临时硬编码：Coze部署环境变量指向火山引擎实例，但用户数据在官方Supabase
  // TODO: Coze平台支持修改环境变量后改回环境变量读取
  const OVERRIDE_URL = 'https://ojolpkzgeivgbokotaap.supabase.co';
  const OVERRIDE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qb2xwa3pnZWl2Z2Jva290YWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMDUzNzYsImV4cCI6MjA5Mzg4MTM3Nn0.NY95byVizD3UgaZktmiJ3qx0VYuzt59GLOBQXIm5OdA';
  return {
    url: OVERRIDE_URL,
    anonKey: OVERRIDE_ANON_KEY,
  };
}

function getSupabaseServiceRoleKey(): string | undefined {
  // 临时硬编码：使用正确的 Supabase service role key
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qb2xwa3pnZWl2Z2Jva290YWFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMwNTM3NiwiZXhwIjoyMDkzODgxMzc2fQ.uoywpU4KolwAldLtPFHV7nuhlcmkqeaVF3zZNlsh4TA';
}

/**
 * Lazy-initialized Supabase client cache.
 * Key format: "token:<token>" or "no-token" or "service-role"
 */
const clientCache = new Map<string, SupabaseClient>();

function createConfiguredClient(url: string, key: string, globalOptions: Record<string, any>): SupabaseClient {
  return createClient(url, key, {
    global: globalOptions,
    db: {
      timeout: 60000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getSupabaseClient(token?: string): SupabaseClient {
  // Only cache the no-token (service role / anon key) client.
  // Token-based clients are per-request and should not be cached.
  if (!token) {
    const cached = clientCache.get('no-token');
    if (cached) return cached;
  }

  const credentials = getSupabaseCredentials();

  // During build phase, env vars may not be available.
  // Return a placeholder client that defers errors to request time.
  if (!credentials) {
    if (isBuildPhase() || !process.env.COZE_SUPABASE_URL) {
      // Create a placeholder client with dummy values so module imports don't crash during build.
      // Actual requests will fail with connection errors, which is expected during build.
      const placeholder = createConfiguredClient('https://placeholder.supabase.co', 'placeholder-key', {});
      if (!token) clientCache.set('no-token', placeholder);
      return placeholder;
    }
    throw new Error('COZE_SUPABASE_URL is not set');
  }

  const { url, anonKey } = credentials;

  let key: string;
  if (token) {
    key = anonKey;
  } else {
    const serviceRoleKey = getSupabaseServiceRoleKey();
    key = serviceRoleKey ?? anonKey;
  }

  const globalOptions: Record<string, any> = {};
  if (token) {
    globalOptions.headers = { Authorization: `Bearer ${token}` };
  }
  try {
    const buffer = getReportBuffer();
    if (buffer) {
      globalOptions.fetch = createWrappedFetch(buffer, 'supabase');
    }
  } catch {
    // Silent — reporting setup failure should not block client creation
  }

  const client = createConfiguredClient(url, key, globalOptions);
  if (!token) clientCache.set('no-token', client);
  return client;
}

export { loadEnv, getSupabaseCredentials, getSupabaseServiceRoleKey, getSupabaseClient };
