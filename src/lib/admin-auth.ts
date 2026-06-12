/**
 * 创始人后台 API 认证辅助函数
 * 前端 Supabase 使用 localStorage 存储 session，API 需要从 localStorage 取 token
 */

const PROJECT_REF = 'ojolpkzgeivgbokotaap';

/**
 * 从 localStorage 获取 Supabase access token
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  // 尝试标准 Supabase key 格式
  let token = localStorage.getItem(`sb-${PROJECT_REF}-auth-token`);
  if (!token) {
    // 回退：尝试不带 project-ref 的格式
    token = localStorage.getItem('sb-auth-token');
  }
  if (!token) {
    // 回退：尝试其他可能的 key
    token = localStorage.getItem('supabase.auth.token');
  }

  if (token) {
    try {
      // 可能是 JSON 数组格式 ["token"]
      const parsed = JSON.parse(token);
      if (Array.isArray(parsed)) return parsed[0];
      if (typeof parsed === 'string') return parsed;
      // 可能是 { access_token, ... } 对象
      if (parsed && typeof parsed.access_token === 'string') return parsed.access_token;
      if (parsed && typeof parsed.token === 'string') return parsed.token;
    } catch {
      // 不是 JSON，直接返回
      return token;
    }
  }
  return null;
}

/**
 * 获取带认证头的 HeadersInit
 * @param contentType 是否添加 Content-Type: application/json
 */
export function getAuthHeaders(contentType = false): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}
