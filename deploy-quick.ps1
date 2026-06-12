# ==============================================================================
# 职盈学海 - 快速部署脚本
# 要求：先设置 VERCEL_TOKEN 环境变量
# 获取 Token: https://vercel.com/account/tokens
# ==============================================================================

Write-Host "`n🚀 职盈学海快速部署" -ForegroundColor Cyan
Write-Host "==============================`n"

# 检查 Token
if (-not $env:VERCEL_TOKEN) {
    Write-Host "❌ 错误：未设置 VERCEL_TOKEN 环境变量" -ForegroundColor Red
    Write-Host "`n📋 获取 Token 的步骤：" -ForegroundColor Yellow
    Write-Host "   1. 访问: https://vercel.com/account/tokens" -ForegroundColor Gray
    Write-Host "   2. 点击 'Create Token'" -ForegroundColor Gray
    Write-Host "   3. 输入名称（如 zhiyingxuehai-deploy）" -ForegroundColor Gray
    Write-Host "   4. 复制生成的 Token" -ForegroundColor Gray
    Write-Host "   5. 设置环境变量:" -ForegroundColor Gray
    Write-Host "      `$env:VERCEL_TOKEN='your-token-here'" -ForegroundColor Gray
    Write-Host "`n💡 示例:" -ForegroundColor Yellow
    Write-Host "   `$env:VERCEL_TOKEN='vercel_xxxxxxxxxxxxxxxx'" -ForegroundColor Gray
    Write-Host "   .\deploy-quick.ps1" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ VERCEL_TOKEN 已设置" -ForegroundColor Green

# 更新版本标记
Write-Host "`n1️⃣ 更新部署版本..." -ForegroundColor Yellow
node scripts/update-deploy-version.js

# 构建项目
Write-Host "`n2️⃣ 构建项目..." -ForegroundColor Yellow
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 构建失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 构建成功" -ForegroundColor Green

# 修复 middleware
Write-Host "`n3️⃣ 修复 middleware..." -ForegroundColor Yellow
node scripts/fix-middleware.js
Write-Host "✅ Middleware 修复完成" -ForegroundColor Green

# 部署
Write-Host "`n4️⃣ 部署到 Vercel..." -ForegroundColor Yellow
vercel deploy --prod --yes --token=$env:VERCEL_TOKEN

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🎉 部署成功！" -ForegroundColor Green
    Write-Host "`n📋 验证步骤：" -ForegroundColor Cyan
    Write-Host "   1. 访问: https://www.zhiyingxuehai.com" -ForegroundColor Gray
    Write-Host "   2. 强制刷新: Ctrl + Shift + R" -ForegroundColor Gray
} else {
    Write-Host "`n❌ 部署失败" -ForegroundColor Red
    exit 1
}

Write-Host "`n==============================" -ForegroundColor Cyan
