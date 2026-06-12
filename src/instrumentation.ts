export async function register() {
  // 仅在 Node.js 进程中运行（非 Edge）
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCronScheduler } = await import('./lib/cron-scheduler');
    startCronScheduler();
  }
}
