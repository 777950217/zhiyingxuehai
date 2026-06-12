import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient> | null = null;

async function fetchConfig(): Promise<{ url: string; anonKey: string }> {
  const res = await fetch('/api/auth/config');
  if (!res.ok) throw new Error('Failed to fetch Supabase config');
  const data = await res.json();
  // API returns supabaseUrl/supabaseAnonKey, normalize to url/anonKey
  return {
    url: data.supabaseUrl || data.url,
    anonKey: data.supabaseAnonKey || data.anonKey,
  };
}

export async function getSupabaseBrowser(): Promise<SupabaseClient> {
  if (supabaseInstance) return supabaseInstance;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { url, anonKey } = await fetchConfig();
    if (!url || !anonKey) {
      throw new Error('Supabase URL or Anon Key is not available');
    }
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    return supabaseInstance;
  })();

  return initPromise;
}
