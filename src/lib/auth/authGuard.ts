import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export interface AuthContext {
  companyId: string;
  userId: string;
  role: string;
  plan: string;
  permissions: string[];
}

export async function authGuard(requiredPermission?: string): Promise<AuthContext> {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: { path?: string; maxAge?: number }) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: { path?: string }) {
          cookieStore.delete(name);
        },
      },
    }
  );
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role, plan, permissions')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  if (requiredPermission && !profile.permissions?.includes(requiredPermission)) {
    redirect('/login');
  }

  return {
    companyId: String(profile.company_id || ''),
    userId: user.id,
    role: String(profile.role || ''),
    plan: String(profile.plan || ''),
    permissions: Array.isArray(profile.permissions) ? profile.permissions.map(String) : []
  };
}

export function checkPermission(context: AuthContext, requiredPermission: string): boolean {
  return context.permissions.includes(requiredPermission);
}
