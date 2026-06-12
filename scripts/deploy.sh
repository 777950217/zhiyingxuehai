#!/bin/bash

set -e

echo "🚀 Starting deployment..."

# 1. 更新部署版本号
echo "1️⃣ Updating deploy version..."
node scripts/update-deploy-version.js

# 2. 构建项目
echo "2️⃣ Building project..."
pnpm build

# 3. 修复 middleware 文件
echo "3️⃣ Fixing middleware files..."
node scripts/fix-middleware.js

echo ""
echo "✅ Build completed successfully"
echo ""
echo "📝 Next steps:"
echo "   1. Deploy: npx vercel --prod --yes"
echo "   2. Verify: node scripts/verify-deploy.js [URL]"
echo ""
echo "💡 Example:"
echo "   npx vercel --prod --yes"
echo "   node scripts/verify-deploy.js https://zhiyingxuehai.vercel.app"