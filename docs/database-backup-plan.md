# 数据库备份方案（P0-2修复）

**创建时间**：2026-06-07  
**目的**：防止数据库丢失导致业务中断  
**执行方**：苏飘蓉（手动）或设置自动备份  

---

## 方案一：Supabase Dashboard 手动备份（推荐，立即执行）

### 步骤
1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择项目 `ojolpkzgeivgbokotaap`
3. 左侧菜单 → **Settings** → **Database**
4. 点击 **Create a backup** 按钮
5. 输入备份名称（如 `manual-backup-20260607`）
6. 点击 **Create**

### 频率
- **每周1次**（建议周一上午）
- **重大更新前**（部署前必须备份）

### 保留策略
- 保留最近 **4周** 的备份
- 超过4周的手动删除

---

## 方案二：自动每日备份（推荐，设置一次终身受益）

### 方法A：Supabase Pro计划（付费，最简单）

1. 升级到 Supabase Pro（$25/月）
2. 自动每日备份 + 支持PITR（时间点恢复）
3. **推荐**，因为 $25/月 相比数据丢失风险微不足道

### 方法B：GitHub Actions 自动备份（免费，稍复杂）

#### 步骤1：创建备份脚本

创建文件 `scripts/backup-database.js`：

```javascript
// scripts/backup-database.js
// 用法：node scripts/backup-database.js

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const DB_URL = process.env.DATABASE_URL; // Supabase 数据库连接串
const BACKUP_DIR = path.join(__dirname, '../backups');
const DATE = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const BACKUP_FILE = path.join(BACKUP_DIR, `backup-${DATE}.sql`);

// 创建备份目录
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// 执行 pg_dump
const cmd = `pg_dump ${DB_URL} > ${BACKUP_FILE}`;
exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error('备份失败:', error);
    process.exit(1);
  }
  console.log('备份成功:', BACKUP_FILE);
  
  // 删除超过30天的备份
  fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql'))
    .forEach(f => {
      const filePath = path.join(BACKUP_DIR, f);
      const stats = fs.statSync(filePath);
      const daysOld = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      if (daysOld > 30) {
        fs.unlinkSync(filePath);
        console.log('删除旧备份:', f);
      }
    });
});
```

#### 步骤2：创建 GitHub Actions 工作流

创建文件 `.github/workflows/daily-backup.yml`：

```yaml
name: Daily Database Backup

on:
  schedule:
    - cron: '0 2 * * *' # 每天凌晨2点（UTC+8=上午10点）
  workflow_dispatch: # 支持手动触发

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install -g pg_dump # 需要安装 postgresql-client
      - name: Run backup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: node scripts/backup-database.js
      - name: Upload backup to artifact
        uses: actions/upload-artifact@v3
        with:
          name: database-backup-${{ github.run_id }}
          path: backups/
```

#### 步骤3：在 GitHub 设置 secrets

1. 进入 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret**
3. Name: `DATABASE_URL`
4. Value: 从 Supabase Dashboard → **Settings** → **Database** → **Connection string** 复制

---

## 方案三：本地定时备份（最省钱，最麻烦）

### Windows 任务计划程序

1. 打开 **任务计划程序**（搜索 `taskschd.msc`）
2. 创建基本任务 → 名称：`职盈学海数据库每日备份`
3. 触发器：**每日** → 时间：`02:00`
4. 操作：**启动程序** → 程序：`powershell.exe`
5. 参数：
```
-File "C:\备份脚本\backup-database.ps1"
```

### 备份脚本 `backup-database.ps1`

```powershell
# backup-database.ps1
$env:PGPASSWORD = "Yingde0929."
$date = Get-Date -Format "yyyy-MM-dd"
$backupFile = "C:\备份\backup-$date.sql"

# 执行 pg_dump
& "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" `
  -h db.ojolpkzgeivgbokotaap.supabase.co `
  -p 5432 `
  -U postgres `
  -d postgres `
  -f $backupFile

# 删除超过30天的备份
Get-ChildItem "C:\备份\*.sql" | Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-30) } | Remove-Item
```

---

## 推荐方案

| 方案 | 成本 | 可靠性 | 复杂度 | 推荐度 |
|------|------|--------|--------|--------|
| **方案一：手动备份** | 免费 | ⭐⭐ | 简单 | ⭐⭐⭐（临时方案） |
| **方案二A：Supabase Pro** | $25/月 | ⭐⭐⭐⭐⭐ | 极简 | ⭐⭐⭐⭐⭐（强烈推荐） |
| **方案二B：GitHub Actions** | 免费 | ⭐⭐⭐⭐ | 中等 | ⭐⭐⭐⭐ |
| **方案三：本地定时** | 免费 | ⭐⭐ | 复杂 | ⭐⭐ |

**最终推荐**：**方案二A（Supabase Pro $25/月）**

理由：
1. 自动每日备份 + PITR（时间点恢复）
2. 高可用性 SLA 99.9%
3. 更大的数据库容量（8GB vs 500MB）
4. 更快的支持响应

---

## 立即执行（今天必须完成）

### 临时方案（今天）：手动备份一次

1. 登录 Supabase Dashboard
2. Settings → Database → **Create a backup**
3. 名称：`manual-backup-20260607`
4. 点击 Create

### 长期方案（本周内）：升级 Supabase Pro

1. 登录 Supabase Dashboard
2. 项目设置 → **Billing**
3. 点击 **Upgrade to Pro**
4. 选择 **Monthly $25**
5. 完成支付

---

## 备份验证（每月1次）

1. 从备份恢复到一个**新的临时数据库**
2. 检查数据完整性（表数量、行数）
3. 确认无数据丢失

---

## 责任人

- **备份执行**：苏飘蓉
- **备份检查**：每月1日
- **恢复演练**：每季度1次

---

**文档版本**：v1.0  
**最后更新**：2026-06-07  
**更新人**：AI助手（橙子 🍊）
