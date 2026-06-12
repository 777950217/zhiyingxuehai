/**
 * Input validation & sanitization utilities
 * Prevents XSS, injection, and malformed data
 */

// ─── Sanitization ───

const DANGEROUS_TAGS_RE = /<\s*\/?\s*(script|iframe|object|embed|form|input|textarea|select|button|applet|meta|link|style|base)\b[^>]*>/gi;
const DANGEROUS_ATTRS_RE = /\s(on\w+|javascript:|vbscript:|data\s*:\s*text\/html)\s*=/gi;
const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

/**
 * Strip dangerous HTML tags and encode special characters.
 * Returns sanitized string or throws if exceeds maxLength.
 */
export function sanitizeString(input: unknown, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';

  let cleaned = input.trim();

  // Remove dangerous tags
  cleaned = cleaned.replace(DANGEROUS_TAGS_RE, '');

  // Remove dangerous attributes
  cleaned = cleaned.replace(DANGEROUS_ATTRS_RE, ' data-removed=');

  // Encode special characters for XSS prevention
  cleaned = cleaned.replace(/[&<>"']/g, (ch) => HTML_ENTITY_MAP[ch] || ch);

  if (cleaned.length > maxLength) {
    throw new Error(`输入内容超过最大长度限制(${maxLength}字)`);
  }

  return cleaned;
}

/**
 * Sanitize for contexts where HTML is intentionally allowed (e.g. rich text).
 * Only strips script/iframe/event handlers but keeps safe HTML.
 */
export function sanitizeRichText(input: unknown, maxLength: number = 5000): string {
  if (typeof input !== 'string') return '';

  let cleaned = input.trim();

  // Remove script/iframe/embed/object tags
  cleaned = cleaned.replace(DANGEROUS_TAGS_RE, '');

  // Remove event handler attributes
  cleaned = cleaned.replace(DANGEROUS_ATTRS_RE, ' data-removed=');

  // Remove javascript: in href/src
  cleaned = cleaned.replace(/(href|src)\s*=\s*["']?\s*javascript:/gi, '$1="removed:"');

  if (cleaned.length > maxLength) {
    throw new Error(`输入内容超过最大长度限制(${maxLength}字)`);
  }

  return cleaned;
}

// ─── Validation ───

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_RE = /^1[3-9]\d{9}$/;
const CODE_RE = /^[A-Za-z0-9]+$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate email format
 */
export function validateEmail(email: unknown): ValidationResult {
  if (typeof email !== 'string' || !email.trim()) {
    return { valid: false, error: '请输入邮箱' };
  }
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254) {
    return { valid: false, error: '邮箱格式不正确' };
  }
  if (!EMAIL_RE.test(trimmed)) {
    return { valid: false, error: '邮箱格式不正确' };
  }
  return { valid: true };
}

/**
 * Validate Chinese mobile phone number
 */
export function validatePhone(phone: unknown): ValidationResult {
  if (typeof phone !== 'string' || !phone.trim()) {
    return { valid: false, error: '请输入手机号' };
  }
  const trimmed = phone.trim();
  if (!PHONE_RE.test(trimmed)) {
    return { valid: false, error: '手机号格式不正确（需11位国内手机号）' };
  }
  return { valid: true };
}

/**
 * Validate redemption code format (alphanumeric only)
 */
export function validateCode(code: unknown): ValidationResult {
  if (typeof code !== 'string' || !code.trim()) {
    return { valid: false, error: '请输入兑换码' };
  }
  const trimmed = code.trim();
  if (trimmed.length < 4 || trimmed.length > 32) {
    return { valid: false, error: '兑换码长度不正确' };
  }
  if (!CODE_RE.test(trimmed)) {
    return { valid: false, error: '兑换码仅允许字母和数字' };
  }
  return { valid: true };
}

/**
 * Validate password strength:
 * - Minimum 8 characters
 * - Must contain at least one letter and one number
 */
export function validatePassword(password: unknown): ValidationResult {
  if (typeof password !== 'string' || !password) {
    return { valid: false, error: '请输入密码' };
  }
  if (password.length < 8) {
    return { valid: false, error: '密码至少8位' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: '密码必须包含至少一个字母' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: '密码必须包含至少一个数字' };
  }
  if (password.length > 128) {
    return { valid: false, error: '密码长度不能超过128位' };
  }
  return { valid: true };
}

/**
 * Validate pagination parameters to prevent negative/oversized values
 */
export function validatePagination(params: {
  page?: unknown;
  pageSize?: unknown;
}): { page: number; pageSize: number } | ValidationResult {
  const MAX_PAGE_SIZE = 200;
  const DEFAULT_PAGE = 1;
  const DEFAULT_PAGE_SIZE = 20;

  let page = DEFAULT_PAGE;
  let pageSize = DEFAULT_PAGE_SIZE;

  if (params.page !== undefined && params.page !== null) {
    const p = Number(params.page);
    if (!Number.isFinite(p) || p < 1) {
      return { valid: false, error: '页码必须为正整数' };
    }
    page = Math.floor(p);
  }

  if (params.pageSize !== undefined && params.pageSize !== null) {
    const ps = Number(params.pageSize);
    if (!Number.isFinite(ps) || ps < 1) {
      return { valid: false, error: '每页数量必须为正整数' };
    }
    pageSize = Math.min(Math.floor(ps), MAX_PAGE_SIZE);
  }

  return { page, pageSize };
}

/**
 * Validate that a value is a safe string ID (alphanumeric, dashes, underscores)
 */
export function validateId(id: unknown): ValidationResult {
  if (typeof id !== 'string' || !id.trim()) {
    return { valid: false, error: '缺少ID参数' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(id.trim())) {
    return { valid: false, error: 'ID格式不正确' };
  }
  if (id.trim().length > 128) {
    return { valid: false, error: 'ID过长' };
  }
  return { valid: true };
}

/**
 * Validate role value against whitelist
 */
const VALID_ROLES = ['admin', 'enterprise_admin', 'enterprise_manager', 'personal_user', 'efficiency_user', 'staff'];

export function validateRole(role: unknown): ValidationResult {
  if (typeof role !== 'string' || !role) {
    return { valid: false, error: '缺少角色类型' };
  }
  if (!VALID_ROLES.includes(role)) {
    return { valid: false, error: '无效的角色类型' };
  }
  return { valid: true };
}

/**
 * Batch validate multiple fields, returns first error or all-valid
 */
export function validateAll(
  checks: Array<{ name: string; result: ValidationResult }>,
): ValidationResult {
  for (const check of checks) {
    if (!check.result.valid) {
      return { valid: false, error: check.result.error };
    }
  }
  return { valid: true };
}
