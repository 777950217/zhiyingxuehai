Write-Host "=== 职盈学海部署 ==="

if (-not $env:VERCEL_TOKEN) {
    Write-Host "请先设置 VERCEL_TOKEN 环境变量"
    Write-Host "示例: `$env:VERCEL_TOKEN='vercel_xxx'"
    exit 1
}

Write-Host "1. 更新版本号..."
node scripts/update-deploy-version.js

Write-Host "2. 构建项目..."
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "构建失败"
    exit 1
}

Write-Host "3. 修复 middleware..."
node scripts/fix-middleware.js

Write-Host "4. 部署到 Vercel..."
vercel deploy --prod --yes --token=$env:VERCEL_TOKEN

if ($LASTEXITCODE -eq 0) {
    Write-Host "部署成功!"
} else {
    Write-Host "部署失败"
    exit 1
}
