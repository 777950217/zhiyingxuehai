import cron from 'node-cron';

const CRON_SECRET = process.env.CRON_SECRET || 'wgy-cron-2024';
const BASE_URL = `http://localhost:${process.env.DEPLOY_RUN_PORT || 5000}`;

let isRunning = false;

/**
 * 启动定时任务调度器
 * - 每天 09:00 抓取行业趋势
 * - 每天 14:00 抓取平台规则变动
 * - 每天 17:30 生成复盘提醒
 */
export function startCronScheduler() {
  if (isRunning) return;
  isRunning = true;

  // 每天 09:00 — 行业趋势
  cron.schedule('0 9 * * *', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/cron/notifications?type=industry_trend&secret=${CRON_SECRET}`);
      const data = await res.json();
      console.log('[CRON 09:00] 行业趋势推送结果:', JSON.stringify(data));
    } catch (err) {
      console.error('[CRON 09:00] 行业趋势推送失败:', err);
    }
  });

  // 每天 14:00 — 平台规则变动
  cron.schedule('0 14 * * *', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/cron/notifications?type=platform_rule&secret=${CRON_SECRET}`);
      const data = await res.json();
      console.log('[CRON 14:00] 平台规则推送结果:', JSON.stringify(data));
    } catch (err) {
      console.error('[CRON 14:00] 平台规则推送失败:', err);
    }
  });

  // 每天 17:30 — 复盘提醒
  cron.schedule('30 17 * * *', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/cron/notifications?type=review&secret=${CRON_SECRET}`);
      const data = await res.json();
      console.log('[CRON 17:30] 复盘提醒推送结果:', JSON.stringify(data));
    } catch (err) {
      console.error('[CRON 17:30] 复盘提醒推送失败:', err);
    }
  });

  console.log('[CRON] 定时任务调度器已启动: 09:00行业趋势 / 14:00平台规则 / 17:30复盘提醒');
}
