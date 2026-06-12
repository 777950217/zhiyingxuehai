-- ============================================
-- 官方 Supabase 实例表结构重建 SQL
-- 执行位置: Supabase Dashboard SQL Editor
-- 警告: 会删除现有表和数据！
-- ============================================

-- Step 1: 删除旧表（如果存在）
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Step 2: 创建 companies 表
CREATE TABLE companies (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  industry TEXT DEFAULT '卫浴',
  team_size INTEGER DEFAULT 1,
  contact_name TEXT,
  contact_phone TEXT,
  plan TEXT DEFAULT 'basic',
  plan_expires_at TIMESTAMPTZ,
  ai_credits_remaining INTEGER DEFAULT 3,
  service_level TEXT DEFAULT 'self',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  plan_start TIMESTAMPTZ,
  plan_end TIMESTAMPTZ,
  plan_period TEXT DEFAULT 'monthly',
  brand_name TEXT,
  categories TEXT DEFAULT '[]',
  price_range TEXT,
  platforms TEXT DEFAULT '[]',
  daily_consultations TEXT,
  pain_points TEXT DEFAULT '[]',
  supply_type TEXT,
  install_service BOOLEAN DEFAULT false,
  return_policy TEXT,
  profile_completed BOOLEAN DEFAULT false,
  seat_limit INTEGER DEFAULT 1,
  seat_used INTEGER DEFAULT 1,
  trial_end_at TIMESTAMPTZ
);

-- Step 3: 创建 users 表
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL REFERENCES companies(id),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL DEFAULT 'auth_managed',
  display_name TEXT,
  role TEXT DEFAULT 'agent',
  user_type TEXT DEFAULT 'small',
  ai_credits_remaining INTEGER DEFAULT 3,
  status TEXT DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  remaining_credits INTEGER DEFAULT 3,
  industry VARCHAR(50),
  team_size VARCHAR(20),
  gender VARCHAR(10) DEFAULT '保密',
  bio TEXT DEFAULT '',
  position VARCHAR(20),
  industry_profile_completed BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  UNIQUE(email)
);

-- Step 4: 创建索引
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_companies_plan ON companies(plan);

-- Step 5: 启用 RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 6: 创建 RLS 策略（允许 service_role 完全访问）
CREATE POLICY "service_role_all_companies" ON companies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_users" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Step 7: 插入 admin 用户的公司
INSERT INTO companies (id, name, plan, seat_limit, seat_used, status, service_level, created_at, updated_at)
VALUES ('7cdfb7e3-1958-4d73-9b3a-136e1786d98a', '777.', 'flagship', 999, 1, 'active', 'premium', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET plan = 'flagship', seat_limit = 999;

-- Step 8: 插入 admin 用户
INSERT INTO users (id, company_id, email, role, user_type, status, remaining_credits, display_name, created_at, updated_at)
VALUES ('8cb7ef07-1686-40dc-8f9e-b6edf3273db9', '7cdfb7e3-1958-4d73-9b3a-136e1786d98a', '1051202571@qq.com', 'admin', 'admin', 'active', 9999, '777', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET role = 'admin', user_type = 'admin', remaining_credits = 9999;

-- Step 9: 插入专业版主管的企业和用户
INSERT INTO companies (id, name, plan, seat_limit, seat_used, status, service_level, trial_end_at, created_at, updated_at)
VALUES ('71ffe0ef-8465-423a-b47b-93567d57e8da', '达屋智能科技有限公司', 'pro', 5, 1, 'active', 'standard', '2027-12-31 23:59:59+08', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, company_id, email, role, user_type, status, remaining_credits, display_name, created_at, updated_at)
VALUES ('041b98e0-afd0-4554-8b26-671b0339e62b', '71ffe0ef-8465-423a-b47b-93567d57e8da', '305858255@qq.com', 'enterprise_manager', 'manager', 'active', 100, '专业版内测号', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Step 10: 验证结果
SELECT '=== Companies ===' as info;
SELECT id, name, plan, seat_limit, status FROM companies;

SELECT '=== Users ===' as info;
SELECT u.id, u.email, u.role, u.user_type, c.name as company, c.plan as company_plan 
FROM users u 
JOIN companies c ON u.company_id = c.id;
