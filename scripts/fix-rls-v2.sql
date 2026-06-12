-- 修复：company_id 是 varchar，需要显式转换
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company members" ON users;

CREATE POLICY "Users can view own company members"
  ON users
  FOR SELECT
  USING (company_id::text = (SELECT company_id::text FROM users WHERE id = auth.uid()));
