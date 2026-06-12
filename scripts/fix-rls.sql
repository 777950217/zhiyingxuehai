-- 检查 users 表是否启用了 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略（避免重复）
DROP POLICY IF EXISTS "Users can view own company members" ON users;

-- 创建新策略：用户可以查看同公司的所有成员
CREATE POLICY "Users can view own company members"
  ON users
  FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
