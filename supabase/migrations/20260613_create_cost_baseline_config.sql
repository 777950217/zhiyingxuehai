-- ==========================================
-- 创建成本基线配置表
-- 创建时间: 2026-06-13
-- ==========================================

CREATE TABLE IF NOT EXISTS cost_baseline_config (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar(36),
  company_id varchar(36) NOT NULL,
  cost_type text NOT NULL,
  baseline_value numeric(10,2) DEFAULT 0,
  warning_threshold numeric(10,2) DEFAULT 20,
  updated_at timestamp DEFAULT now(),
  UNIQUE(company_id, cost_type)
);

ALTER TABLE IF EXISTS cost_baseline_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cost_baseline_config_company_isolation" ON cost_baseline_config;
CREATE POLICY "cost_baseline_config_company_isolation" ON cost_baseline_config
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_cost_baseline_config_company ON cost_baseline_config(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_baseline_config_type ON cost_baseline_config(cost_type);

DROP TRIGGER IF EXISTS update_cost_baseline_config_updated_at ON cost_baseline_config;
CREATE TRIGGER update_cost_baseline_config_updated_at
BEFORE UPDATE ON cost_baseline_config
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT '成本基线配置表创建完成！' AS result;