/**
 * 7天新手引导 - 自动标记完成辅助函数
 * 
 * 用法：在对应功能模块完成关键操作后调用
 * 例如：创建团队成员后 → markOnboardingDay(authFetch, 1)
 */

export async function markOnboardingDay(
  authFetch: (input: string | URL | globalThis.Request, init?: RequestInit) => Promise<Response>,
  dayNumber: number
): Promise<void> {
  try {
    await authFetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day_number: dayNumber, completed: true }),
    });
  } catch {
    // 静默失败，不影响主流程
  }
}
