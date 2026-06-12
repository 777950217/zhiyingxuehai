#!/usr/bin/env node

/**
 * 职盈学海 - 部署后冒烟测试
 * 检查8个关键页面是否返回200
 *
 * 用法: node scripts/smoke-test.mjs [BASE_URL]
 * 默认: http://localhost:5000
 */

const BASE_URL = process.argv[2] || 'http://localhost:5000';
const TIMEOUT_MS = 10000;

const PAGES = [
  '/',
  '/login',
  '/membership',
  '/privacy',
  '/terms',
  '/intro/personal',
  '/intro/professional',
  '/intro/flagship',
];

async function checkPage(path) {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
    });
    return { path, status: res.status, ok: res.status >= 200 && res.status < 400 };
  } catch (err) {
    return { path, status: 0, ok: false, error: err.message };
  }
}

async function main() {
  console.log(`\n🚀 职盈学海 冒烟测试 — ${BASE_URL}\n`);

  const results = [];
  for (const page of PAGES) {
    const result = await checkPage(page);
    results.push(result);
    const icon = result.ok ? '✅' : '❌';
    const statusText = result.error
      ? `ERROR: ${result.error}`
      : `${result.status}`;
    console.log(`  ${icon} ${page.padEnd(22)} ${statusText}`);
  }

  console.log('');

  const failures = results.filter((r) => !r.ok);
  if (failures.length === 0) {
    console.log(`✅ All ${PAGES.length} pages healthy\n`);
    process.exit(0);
  } else {
    for (const f of failures) {
      const detail = f.error ? f.error : `returned ${f.status}`;
      console.log(`❌ ${f.path} ${detail}`);
    }
    console.log(`\n❌ ${failures.length}/${PAGES.length} pages failed\n`);
    process.exit(1);
  }
}

main();
