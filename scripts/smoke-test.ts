/**
 * 部署后冒烟测试
 * 用法: npx tsx scripts/smoke-test.ts [baseURL]
 * 默认 baseURL: http://localhost:5000
 */

const BASE_URL = process.argv[2] || "http://localhost:5000";

const PAGES = [
  "/",
  "/login",
  "/membership",
  "/privacy",
  "/terms",
  "/intro/personal",
  "/intro/professional",
  "/intro/flagship",
];

async function smokeTest() {
  let allPassed = true;

  for (const page of PAGES) {
    const url = `${BASE_URL}${page}`;
    try {
      const res = await fetch(url, { method: "GET", redirect: "manual" });
      // 200 or 3xx redirect are acceptable
      const ok = res.status >= 200 && res.status < 400;
      if (!ok) {
        console.log(`❌ ${page} returned ${res.status}`);
        allPassed = false;
      }
    } catch (err) {
      console.log(`❌ ${page} request failed: ${err}`);
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log(`✅ All ${PAGES.length} pages healthy`);
  }

  process.exit(allPassed ? 0 : 1);
}

smokeTest();
