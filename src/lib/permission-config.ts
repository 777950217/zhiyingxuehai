import type { UserRole, CompanyPlan } from '@/lib/auth-context';

export interface RouteConfig {
  path: string;
  name: string;
  requiresAuth: boolean;
  allowedRoles?: UserRole[];
  allowedPlans?: CompanyPlan[];
}

export const PUBLIC_ROUTES: string[] = [
  '/api/auth/config',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/reset-password',
  '/api/auth/verify',
  '/api/health',
  '/api/public/',
  '/api/webhook/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/_next/',
  '/favicon.ico',
  '/images/',
  '/fonts/',
  '/deploy-test.txt',
  '/privacy',
  '/terms',
];

export const AUTH_REQUIRED_ROUTES: string[] = [
  '/admin',
  '/agents',
  '/teams',
  '/cockpit',
  '/cost-baseline',
  '/profit-funnel',
  '/approval',
  '/weekly-report',
  '/incentive',
  '/keyword-monitor',
  '/self-check',
  '/dashboard',
  '/my-workspace',
  '/companies',
  '/users',
  '/ai-assistant',
  '/product-knowledge',
  '/work-orders',
  '/customer-records',
  '/training',
  '/membership',
  '/notifications',
  '/product-profile',
  '/onboarding',
  '/onboarding-flow',
  '/onboarding-industry',
  '/consultant',
  '/templates',
  '/help',
  '/practice',
  '/knowledge-notes',
  '/learning-path',
  '/rules',
  '/learning-profile',
  '/cost-alert',
  '/knowledge-qa',
  '/business-tools',
  '/reports',
  '/growth-dashboard',
  '/data-input',
  '/ai-reports',
  '/chat-check',
  '/cda-analysis',
  '/change-password',
  '/monthly-report',
  '/rules-and-trends',
  '/cockpit-tutorial',
  '/team-learning-progress',
  '/kpi-assessment',
  '/after-sales-guide',
  '/quality-feedback',
  '/my-knowledge',
  '/assessment',
  '/business',
  '/service',
  '/courses',
  '/tools',
  '/my',
  '/team',
  '/settings',
  '/contact',
  '/insights',
  '/roi-ledger',
  '/quick-replies',
  '/upgrade',
  '/intro',
  '/refund',
  '/finance',
  '/team-qc',
  '/team-knowledge',
  '/team-performance',
  '/task-dispatch',
  '/compliance-dashboard',
  '/ai-scheduling',
];

export const ROLE_BASED_ROUTES: Record<string, UserRole[]> = {
  '/admin': ['super_admin', 'admin'],
  '/companies': ['super_admin', 'admin'],
  '/users': ['super_admin', 'admin', 'enterprise_admin'],
  '/cockpit': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager'],
  '/cost-baseline': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager'],
  '/profit-funnel': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager'],
  '/approval': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager'],
  '/weekly-report': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager'],
  '/incentive': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager'],
  '/growth-dashboard': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager'],
  '/roi-ledger': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager'],
  '/reports': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager'],
  '/agents': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/teams': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/dashboard': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/my-workspace': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/work-orders': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/customer-records': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/training': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/product-knowledge': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/ai-assistant': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/keyword-monitor': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/self-check': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/practice': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/knowledge-notes': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/learning-path': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/rules': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/learning-profile': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/business-tools': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/ai-reports': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/chat-check': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/cda-analysis': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/monthly-report': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/rules-and-trends': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/kpi-assessment': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/after-sales-guide': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/quality-feedback': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/my-knowledge': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/assessment': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/finance': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'financial'],
  '/team-qc': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/team-knowledge': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/team-performance': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/task-dispatch': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/compliance-dashboard': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
  '/ai-scheduling': ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'],
};

export const PLAN_BASED_ROUTES: Record<string, CompanyPlan[]> = {
  '/cockpit': ['professional', 'enterprise'],
  '/cost-baseline': ['professional', 'enterprise'],
  '/profit-funnel': ['professional', 'enterprise'],
  '/approval': ['professional', 'enterprise'],
  '/weekly-report': ['professional', 'enterprise'],
  '/incentive': ['professional', 'enterprise'],
  '/growth-dashboard': ['professional', 'enterprise'],
  '/roi-ledger': ['professional', 'enterprise'],
  '/reports': ['professional', 'enterprise'],
  '/keyword-monitor': ['professional', 'enterprise'],
  '/self-check': ['professional', 'enterprise'],
  '/ai-assistant': ['professional', 'enterprise'],
  '/ai-reports': ['professional', 'enterprise'],
  '/chat-check': ['professional', 'enterprise'],
  '/cda-analysis': ['professional', 'enterprise'],
  '/monthly-report': ['professional', 'enterprise'],
  '/rules-and-trends': ['professional', 'enterprise'],
  '/kpi-assessment': ['professional', 'enterprise'],
  '/team-learning-progress': ['professional', 'enterprise'],
  '/team-qc': ['professional', 'enterprise'],
  '/team-knowledge': ['professional', 'enterprise'],
  '/team-performance': ['professional', 'enterprise'],
  '/task-dispatch': ['professional', 'enterprise'],
  '/compliance-dashboard': ['professional', 'enterprise'],
  '/ai-scheduling': ['professional', 'enterprise'],
  '/finance': ['enterprise', 'financial'],
  '/finance/daily-profit': ['enterprise', 'financial'],
  '/finance/accounts-receivable': ['enterprise', 'financial'],
  '/finance/accounts-payable': ['enterprise', 'financial'],
  '/finance/refund-compensation': ['enterprise', 'financial'],
  '/finance/advertising': ['enterprise', 'financial'],
  '/finance/cost-control': ['enterprise', 'financial'],
  '/finance/warehouse': ['enterprise', 'financial'],
  '/finance/monthly-close': ['enterprise', 'financial'],
  '/finance/financial-analysis': ['enterprise', 'financial'],
  '/finance/data-import': ['enterprise', 'financial'],
};

export const ADMIN_ROLES: UserRole[] = ['super_admin', 'admin', 'enterprise_admin'];

export const MANAGER_ROLES: UserRole[] = ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager'];

export const STAFF_ROLES: UserRole[] = ['super_admin', 'admin', 'enterprise_admin', 'enterprise_manager', 'staff'];

export const ENTERPRISE_ROLES: UserRole[] = ['enterprise_admin', 'enterprise_manager', 'staff'];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

export function requiresAuthentication(pathname: string): boolean {
  return AUTH_REQUIRED_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

export function getAllowedRoles(pathname: string): UserRole[] | undefined {
  for (const route of Object.keys(ROLE_BASED_ROUTES)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return ROLE_BASED_ROUTES[route];
    }
  }
  return undefined;
}

export function getAllowedPlans(pathname: string): CompanyPlan[] | undefined {
  for (const route of Object.keys(PLAN_BASED_ROUTES)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return PLAN_BASED_ROUTES[route];
    }
  }
  return undefined;
}

export function hasRoleAccess(role: UserRole, pathname: string): boolean {
  const allowedRoles = getAllowedRoles(pathname);
  if (!allowedRoles) return true;
  return allowedRoles.includes(role);
}

export function hasPlanAccess(plan: CompanyPlan, pathname: string): boolean {
  const allowedPlans = getAllowedPlans(pathname);
  if (!allowedPlans) return true;
  return allowedPlans.includes(plan);
}