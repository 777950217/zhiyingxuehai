# ==============================================================================
# 职盈学海 - 终端部署脚本
# 用途：当 Git 自动部署不可用时使用此脚本手动部署
# 依赖：Node.js >= 22, pnpm, Vercel CLI
# ==============================================================================

param(
    [string]$VercelToken = $env:VERCEL_TOKEN
)

Write-Host "`n🚀 职盈学海部署脚本 v1.0" -ForegroundColor Cyan
Write-Host "==============================`n"

# 1. 检查依赖
Write-Host "1️⃣ 检查依赖..." -ForegroundColor Yellow

try {
    node --version | Out-Null
    Write-Host "   ✅ Node.js 已安装" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js 未安装，请安装 Node.js >= 22" -ForegroundColor Red
    exit 1
}

try {
    pnpm --version | Out-Null
    Write-Host "   ✅ pnpm 已安装" -ForegroundColor Green
} catch {
    Write-Host "   ❌ pnpm 未安装，请运行: npm install -g pnpm" -ForegroundColor Red
    exit 1
}

# 2. 更新版本标记
Write-Host "`n2️⃣ 更新部署版本号..." -ForegroundColor Yellow
node scripts/update-deploy-version.js

# 3. 构建项目
Write-Host "`n3️⃣ 构建项目..." -ForegroundColor Yellow
pnpm build

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ 构建失败" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ 构建成功" -ForegroundColor Green

# 4. 修复 middleware 文件
Write-Host "`n4️⃣ 修复 middleware 文件..." -ForegroundColor Yellow
node scripts/fix-middleware.js
Write-Host "   ✅ Middleware 修复完成" -ForegroundColor Green

# 5. 部署到 Vercel
Write-Host "`n5️⃣ 部署到 Vercel..." -ForegroundColor Yellow

if (-not $VercelToken) {
    Write-Host "   ⚠️  未提供 VERCEL_TOKEN，使用交互式登录" -ForegroundColor Yellow
    Write-Host "   请在浏览器中完成登录后继续..." -ForegroundColor Yellow
    vercel deploy --prod --yes
} else {
    Write-Host "   使用环境变量中的 token 部署..." -ForegroundColor Yellow
    vercel deploy --prod --yes --token=$VercelToken
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ 部署成功！" -ForegroundColor Green
    Write-Host "`n📋 验证步骤：" -ForegroundColor Cyan
    Write-Host "   1. 访问: https://www.zhiyingxuehai.com" -ForegroundColor Gray
    Write-Host "   2. 检查版本: https://www.zhiyingxuehai.com/deploy-test.txt" -ForegroundColor Gray
    Write-Host "   3. 强制刷新浏览器: Ctrl + Shift + R" -ForegroundColor Gray
} else {
    Write-Host "`n❌ 部署失败" -ForegroundColor Red
    exit 1
}

Write-Host "`n==============================" -ForegroundColor Cyan
