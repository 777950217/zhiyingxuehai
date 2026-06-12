-- 经营看板数据导入表
-- 用于存储老板/主管/运营导入的Excel数据（JSON格式）
-- 创建时间：2026-06-02
-- 修正：所有id字段都是VARCHAR(36)，外键用text比较

CREATE TABLE IF NOT EXISTS company_business_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(36) NOT NULL,
  data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('weekly','cost','product','approval','roi','monthly','manager_weekly')),
  data_json JSONB NOT NULL,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  imported_by VARCHAR(36),
  CONSTRAINT unique_company_data_type UNIQUE (company_id, data_type)
);

-- 启用RLS（行级安全）
ALTER TABLE company_business_data ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能访问自己公司的数据
-- 用 subquery 直接比较 company_id，避免 IN 子查询类型不匹配
DROP POLICY IF EXISTS "company_business_data_select" ON company_business_data;
CREATE POLICY "company_business_data_select" ON company_business_data
  FOR SELECT USING (
    company_id = (SELECT u.company_id FROM users u WHERE u.id = auth.uid()::text LIMIT 1)
  );

DROP POLICY IF EXISTS "company_business_data_insert" ON company_business_data;
CREATE POLICY "company_business_data_insert" ON company_business_data
  FOR INSERT WITH CHECK (
    company_id = (SELECT u.company_id FROM users u WHERE u.id = auth.uid()::text LIMIT 1)
  );

DROP POLICY IF EXISTS "company_business_data_update" ON company_business_data;
CREATE POLICY "company_business_data_update" ON company_business_data
  FOR UPDATE USING (
    company_id = (SELECT u.company_id FROM users u WHERE u.id = auth.uid()::text LIMIT 1)
  );

DROP POLICY IF EXISTS "company_business_data_delete" ON company_business_data;
CREATE POLICY "company_business_data_delete" ON company_business_data
  FOR DELETE USING (
    company_id = (SELECT u.company_id FROM users u WHERE u.id = auth.uid()::text LIMIT 1)
  );

-- 索引
CREATE INDEX IF NOT EXISTS idx_company_business_data_company_type
  ON company_business_data(company_id, data_type);

-- 通知Supabase刷新schema缓存
NOTIFY pgrst, 'reload schema';
