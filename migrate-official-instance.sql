-- ============================================
-- 官方 Supabase 实例表结构迁移 SQL
-- 执行位置: Supabase Dashboard SQL Editor
-- ============================================

-- 1. companies 表添加缺失的列
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'basic';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_end_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS seat_limit INTEGER DEFAULT 1;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS seat_used INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS service_level TEXT DEFAULT 'self';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_start TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_end TIMESTAMPTZ;

-- 2. users 表添加缺失的列
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS remaining_credits INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_credits_remaining INTEGER DEFAULT 0;

-- 3. 插入 admin 用户的公司
INSERT INTO companies (id, name, plan, seat_limit, seat_used, status)
VALUES ('7cdfb7e3-1958-4d73-9b3a-136e1786d98a', '777.', 'flagship', 999, 1, 'active')
ON CONFLICT (id) DO UPDATE SET plan='flagship', seat_limit=999;

-- 4. 插入 admin 用户
INSERT INTO users (id, company_id, email, role, user_type, status, remaining_credits, display_name)
VALUES ('8cb7ef07-1686-40dc-8f9e-b6edf3273db9', '7cdfb7e3-1958-4d73-9b3a-136e1786d98a', '1051202571@qq.com', 'admin', 'admin', 'active', 9999, '777')
ON CONFLICT (id) DO UPDATE SET role='admin', user_type='admin', status='active', remaining_credits=9999;

-- 5. 验证
SELECT u.id, u.email, u.role, u.user_type, c.name, c.plan 
FROM users u 
JOIN companies c ON u.company_id = c.id 
WHERE u.email = '1051202571@qq.com';
