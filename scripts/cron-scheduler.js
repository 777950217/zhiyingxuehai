/**
 * 轻量级定时推送调度器
 * 每天 08:30 调用 /api/cron/daily-push 生成当日通知
 * 每周一 08:00 生成周报（成本/质检/工单）
 * 每月1号 08:00 生成月报（AI使用）
 * 
 * 使用方式: node scripts/cron-scheduler.js
 * 即时触发: node scripts/cron-scheduler.js --now
 */

const CRON_SECRET = process.env.CRON_SECRET || "dev-cron-secret";
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

async function fetchWithAuth(url, method) {
  method = method || "GET";
  try {
    const response = await fetch(url, {
      method: method,
      headers: { Authorization: "Bearer " + CRON_SECRET },
    });
    const data = await response.json();
    console.log("[" + new Date().toISOString() + "] " + method + " " + url + " →", JSON.stringify(data).slice(0, 200));
    return data;
  } catch (error) {
    console.error("[" + new Date().toISOString() + "] " + method + " " + url + " failed:", error);
    return null;
  }
}

// ── 每日推送 ──
async function triggerDailyPush() {
  await fetchWithAuth(BASE_URL + "/api/cron/daily-push", "GET");
}

// ── 周报生成 ──
async function triggerWeeklyReports() {
  console.log("[" + new Date().toISOString() + "] Generating weekly reports...");
  await fetchWithAuth(BASE_URL + "/api/reports/generate?type=cost_weekly", "GET");
  await fetchWithAuth(BASE_URL + "/api/reports/generate?type=quality_weekly", "GET");
  await fetchWithAuth(BASE_URL + "/api/reports/generate?type=workorder_weekly", "GET");
}

// ── 月报生成 ──
async function triggerMonthlyReports() {
  console.log("[" + new Date().toISOString() + "] Generating monthly reports...");
  await fetchWithAuth(BASE_URL + "/api/reports/generate?type=ai_monthly", "GET");
}

// ── 调度逻辑 ──
function checkAndRun() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon
  const date = now.getDate(); // 1-31

  // 每日推送 (08:30)
  if (now.getHours() === 8 && now.getMinutes() === 30) {
    triggerDailyPush();
  }

  // 周一早上 08:00 生成周报
  if (day === 1 && now.getHours() === 8 && now.getMinutes() === 0) {
    triggerWeeklyReports();
  }

  // 每月1号 08:00 生成月报
  if (date === 1 && now.getHours() === 8 && now.getMinutes() === 0) {
    triggerMonthlyReports();
  }
}

// ── 主循环：每分钟检查一次 ──
function startScheduler() {
  checkAndRun();
  setInterval(function() {
    checkAndRun();
  }, 60 * 1000);
  console.log("[cron-scheduler] Scheduler started. Checks every minute.");
  console.log("[cron-scheduler] Daily push: 08:30 | Weekly reports: Mon 08:00 | Monthly reports: 1st 08:00");
}

// ── 启动 ──
console.log("[cron-scheduler] Base URL: " + BASE_URL);

if (process.argv.includes("--now")) {
  console.log("[cron-scheduler] Immediate trigger requested...");
  triggerDailyPush();
}

if (process.argv.includes("--weekly")) {
  console.log("[cron-scheduler] Generating weekly reports now...");
  triggerWeeklyReports();
}

if (process.argv.includes("--monthly")) {
  console.log("[cron-scheduler] Generating monthly reports now...");
  triggerMonthlyReports();
}

startScheduler();
