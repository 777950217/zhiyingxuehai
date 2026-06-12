/**
 * Audit Log Utility
 * Centralized logging for all write operations in the system.
 */

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  REVIEW = 'REVIEW',
  EXTRACT = 'EXTRACT',
  PUSH_FEEDBACK = 'PUSH_FEEDBACK',
  CONFIRM_FEEDBACK = 'CONFIRM_FEEDBACK',
  RESOLVE_FEEDBACK = 'RESOLVE_FEEDBACK',
  LOGIN = 'LOGIN',
  EXPORT = 'EXPORT',
  ADD_SEAT = 'ADD_SEAT',
  REMOVE_SEAT = 'REMOVE_SEAT',
}

export enum ResourceType {
  PHRASE = 'phrase',
  QUALITY_FEEDBACK = 'quality_feedback',
  PRODUCT_PROFILE = 'product_profile',
  AI_CHAT_HISTORY = 'ai_chat_history',
  SEAT = 'seat',
  SCHEDULE = 'schedule',
  USER = 'user',
  COMPANY = 'company',
  AUDIT_LOG = 'audit_log',
  BACKUP = 'backup',
  CHECKUP = 'checkup',
}

interface LogActionParams {
  userId: string;
  companyId?: string | null;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string | null;
  detail?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Log an audit action to the audit_logs table.
 * This function is designed to be non-blocking — errors are logged but never throw.
 */
export async function logAction(params: LogActionParams): Promise<void> {
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { error } = await supabase.from('audit_logs').insert({
      user_id: params.userId,
      company_id: params.companyId || null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      detail: params.detail || {},
      ip_address: params.ipAddress || null,
    });

    if (error) {
      console.error('[audit-log] Failed to write audit log:', error);
    }
  } catch (err) {
    console.error('[audit-log] logAction error:', err);
  }
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  return realIp || null;
}
