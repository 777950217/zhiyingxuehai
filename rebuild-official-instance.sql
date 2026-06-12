-- ============================================
-- 官方 Supabase 实例表结构重建 SQL
-- 执行位置: Supabase Dashboard SQL Editor
-- 警告: 会删除现有表和数据！
-- ============================================

-- 删除旧表（如果存在）
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- 创建 companies 表
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
  trial_end_at TIMESTAMPTZ,
  seat_limit INTEGER DEFAULT 1,
  seat_used INTEGER DEFAULT 0
);

-- 创建 users 表
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
  remaining_credits INTEGER DEFAULT 0
);

-- 启用 RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略（允许 service_role 完全访问）
CREATE POLICY "service_role_all" ON companies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 插入 admin 用户的公司
INSERT INTO companies (id, name, plan, seat_limit, seat_used, status)
VALUES ('7cdfb7e3-1958-4d73-9b3a-136e1786d98a', '777.', 'flagship', 999, 1, 'active');

-- 插入 admin 用户
INSERT INTO users (id, company_id, email, role, user_type, status, remaining_credits, display_name)
VALUES ('8cb7ef07-1686-40dc-8f9e-b6edf3273db9', '7cdfb7e3-1958-4d73-9b3a-136e1786d98a', '1051202571@qq.com', 'admin', 'admin', 'active', 9999, '777');

-- 验证
SELECT u.id, u.email, u.role, u.user_type, c.name, c.plan 
FROM users u 
JOIN companies c ON u.company_id = c.id 
WHERE u.email = '1051202571@qq.com';
