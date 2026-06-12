-- ============================================
-- 官方 Supabase 实例表结构迁移 SQL
-- 问题: users.id 是 bigint 不是 uuid, companies 缺少 plan 等列
-- 解决: 删除旧表并重建正确结构
-- ============================================

-- Step 1: 备份现有数据（可选）
-- CREATE TABLE users_backup AS SELECT * FROM users;
-- CREATE TABLE companies_backup AS SELECT * FROM companies;

-- Step 2: 删除旧表
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS _drizzle_migrations CASCADE;

-- Step 3: 创建 companies 表 (uuid + 新列)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  industry TEXT DEFAULT '卫浴',
  team_size INTEGER DEFAULT 1,
  contact_name TEXT,
  contact_phone TEXT,
  plan TEXT DEFAULT 'basic',
  plan_expires_at TIMESTAMPTZ,
  ai_credits_remaining INTEGER DEFAULT 3,
  service_level TEXT DEFAULT 'self',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  plan_start TIMESTAMPTZ,
  plan_end TIMESTAMPTZ,
  plan_period TEXT DEFAULT 'monthly',
  brand_name TEXT,
  categories TEXT[] DEFAULT '{}',
  price_range TEXT[] DEFAULT '{}',
  platforms TEXT[] DEFAULT '{}',
  daily_consultations INTEGER,
  pain_points TEXT[] DEFAULT '{}',
  supply_type TEXT,
  install_service TEXT,
  return_policy TEXT,
  profile_completed BOOLEAN DEFAULT false,
  seat_limit INTEGER DEFAULT 1,
  seat_used INTEGER DEFAULT 0,
  trial_end_at TIMESTAMPTZ
);

-- Step 4: 创建 users 表 (uuid + 新列)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  email TEXT UNIQUE,
  password_hash TEXT DEFAULT 'auth_managed',
  display_name TEXT,
  role TEXT DEFAULT 'staff',
  user_type TEXT,
  ai_credits_remaining INTEGER DEFAULT 3,
  status TEXT DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  remaining_credits INTEGER DEFAULT 0,
  industry TEXT,
  team_size TEXT,
  gender TEXT DEFAULT '保密',
  bio TEXT,
  position TEXT,
  industry_profile_completed BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ
);

-- Step 5: 启用 RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 6: 创建 RLS 策略
CREATE POLICY "service_role_all_companies" ON companies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_users" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Step 7: 插入 admin 用户数据
INSERT INTO companies (id, name, plan, seat_limit, seat_used, status, trial_end_at)
VALUES ('7cdfb7e3-1958-4d73-9b3a-136e1786d98a', '777.', 'flagship', 999, 1, 'active', '2027-12-31 23:59:59+08');

INSERT INTO users (id, company_id, email, role, user_type, status, remaining_credits, display_name)
VALUES ('8cb7ef07-1686-40dc-8f9e-b6edf3273db9', '7cdfb7e3-1958-4d73-9b3a-136e1786d98a', '1051202571@qq.com', 'admin', 'admin', 'active', 9999, '777');

-- Step 8: 验证
SELECT 'Companies' as table_name, COUNT(*) as count FROM companies
UNION ALL
SELECT 'Users', COUNT(*) FROM users;

SELECT u.id, u.email, u.role, u.user_type, c.name as company_name, c.plan as company_plan 
FROM users u 
JOIN companies c ON u.company_id = c.id 
WHERE u.email = '1051202571@qq.com';
