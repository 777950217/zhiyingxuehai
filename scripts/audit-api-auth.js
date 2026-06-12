// 权限审计脚本：找出所有缺少 authenticateRequest 的 API 端点
// 用法：node scripts/audit-api-auth.js

const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, '..', 'src', 'app');

// 公开端点（不应该有 authenticateRequest）
const PUBLIC_ENDPOINTS = [
  '/api/auth/register',
  '/api/auth/reset-password',
  '/api/auth/change-password', // 改密码需要旧密码，可以不需要JWT
  '/api/health',
  '/api/robots.txt',
];

// 需要检查的目录
const API_DIRS = [
  path.join(APP_DIR, 'api'),
  path.join(APP_DIR, '(main)', 'api'),
];

function findRouteFiles(dir) {
  const files = [];
  
  function walk(currentDir) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);
      
      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.name === 'route.ts') {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

function checkFileAuth(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查是否有 authenticateRequest 导入或调用
  const hasAuthImport = content.includes("from '@/lib/api-auth'") || 
                      content.includes('from "@/lib/api-auth"') ||
                      content.includes("from '@/lib/api-auth';") ||
                      content.includes('from "@/lib/api-auth";');
  
  const hasAuthCall = content.includes('authenticateRequest(');
  
  // 检查是否有 export async function（是 API 路由）
  const hasRouteHandler = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)/.test(content);
  
  if (!hasRouteHandler) {
    return null; // 不是 API 路由，跳过
  }
  
  // 计算 API 路径
  const relativePath = path.relative(APP_DIR, filePath);
  const apiPath = '/' + relativePath
    .replace(/\\/g, '/')
    .replace(/\/route\.ts$/, '')
    .replace(/\/\[.*?\]/g, (match) => match.replace(/[\[\]]/g, ''))
    .replace(/^\(.*?\)\//, ''); // 移除路由组 (main)
  
  return {
    file: filePath,
    apiPath,
    hasAuthImport,
    hasAuthCall,
    isPublic: PUBLIC_ENDPOINTS.some(publicPath => apiPath.startsWith(publicPath)),
    vulnerable: !hasAuthCall && !PUBLIC_ENDPOINTS.some(publicPath => apiPath.startsWith(publicPath)),
  };
}

// 主逻辑
const allFiles = [];
for (const dir of API_DIRS) {
  if (fs.existsSync(dir)) {
    allFiles.push(...findRouteFiles(dir));
  }
}

const results = allFiles
  .map(file => checkFileAuth(file))
  .filter(Boolean);

const vulnerable = results.filter(r => r.vulnerable);
const publicOk = results.filter(r => r.isPublic && !r.hasAuthCall);
const authenticated = results.filter(r => !r.isPublic && r.hasAuthCall);
const falsePositive = results.filter(r => r.isPublic && r.hasAuthCall); // 公开端点却有权限检查（bug）

console.log('=== API 权限审计结果 ===\n');
console.log(`总 API 端点: ${results.length}`);
console.log(`已认证端点: ${authenticated.length}`);
console.log(`公开端点(正确): ${publicOk.length}`);
console.log(`漏洞端点(缺少认证): ${vulnerable.length}`);
console.log(`误报端点(公开但有权限检查): ${falsePositive.length}\n`);

if (falsePositive.length > 0) {
  console.log('=== 误报端点（公开端点却有权限检查，可能是bug）===');
  falsePositive.forEach(r => console.log(`  ${r.apiPath} (${path.relative(process.cwd(), r.file)})`));
  console.log('');
}

if (vulnerable.length > 0) {
  console.log('=== 漏洞端点（缺少 authenticateRequest 调用）===');
  vulnerable.forEach(r => console.log(`  ${r.apiPath} (${path.relative(process.cwd(), r.file)})`));
  console.log('');
  console.log('请手动检查这些端点，确认是否需要添加认证。');
} else {
  console.log('✅ 未发现漏洞端点（所有非公开端点都有认证检查）');
}

// 输出 JSON 报告
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    total: results.length,
    authenticated: authenticated.length,
    publicOk: publicOk.length,
    vulnerable: vulnerable.length,
    falsePositive: falsePositive.length,
  },
  details: {
    vulnerable: vulnerable.map(r => ({ apiPath: r.apiPath, file: path.relative(process.cwd(), r.file) })),
    falsePositive: falsePositive.map(r => ({ apiPath: r.apiPath, file: path.relative(process.cwd(), r.file) })),
    publicOk: publicOk.map(r => ({ apiPath: r.apiPath, file: path.relative(process.cwd(), r.file) })),
    authenticated: authenticated.map(r => ({ apiPath: r.apiPath, file: path.relative(process.cwd(), r.file) })),
  },
};

fs.writeFileSync(
  path.join(__dirname, '..', 'audit-api-auth-report.json'),
  JSON.stringify(report, null, 2)
);

console.log(`\n报告已保存到: scripts/../audit-api-auth-report.json`);
