import cron from 'node-cron';
import { logError, logInfo } from './logger';

const CRON_SECRET = process.env.CRON_SECRET || 'local_dev_secret_2026_change_in_prod';
const BASE_URL = `http://localhost:${process.env.DEPLOY_RUN_PORT || 5000}`;

let isRunning = false;

export function startCronScheduler() {
  if (process.env.NODE_ENV === 'development' && process.env.ENABLE_CRON !== 'true') {
    logInfo('本地开发环境：定时任务已禁用（设置ENABLE_CRON=true可启用）', { module: 'cron' });
    return;
  }

  if (isRunning) return;
  isRunning = true;

  cron.schedule('0 9 * * *', async () => {
    try {
      await fetch(`${BASE_URL}/api/cron/notifications?type=industry_trend&secret=${CRON_SECRET}`);
    } catch (err) {
      logError('行业趋势推送失败', { module: 'cron', context: { error: err instanceof Error ? err.message : String(err) } });
    }
  });

  cron.schedule('0 14 * * *', async () => {
    try {
      await fetch(`${BASE_URL}/api/cron/notifications?type=platform_rule&secret=${CRON_SECRET}`);
    } catch (err) {
      logError('平台规则推送失败', { module: 'cron', context: { error: err instanceof Error ? err.message : String(err) } });
    }
  });

  cron.schedule('30 17 * * *', async () => {
    try {
      await fetch(`${BASE_URL}/api/cron/notifications?type=review&secret=${CRON_SECRET}`);
    } catch (err) {
      logError('复盘提醒推送失败', { module: 'cron', context: { error: err instanceof Error ? err.message : String(err) } });
    }
  });

  logInfo('定时任务调度器已启动: 09:00行业趋势 / 14:00平台规则 / 17:30复盘提醒', { module: 'cron' });
}
