-- ==========================================
-- 补充经营看板所需表和字段
-- 创建时间: 2026-06-13
-- ==========================================

-- 1. 为 work_orders 添加 completed_at 字段
ALTER TABLE IF EXISTS work_orders 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS work_orders 
ADD COLUMN IF NOT EXISTS response_time INTEGER;

ALTER TABLE IF EXISTS work_orders 
ADD COLUMN IF NOT EXISTS satisfaction_score INTEGER DEFAULT 0;

-- 2. 创建 kpi_scores 表
CREATE TABLE IF NOT EXISTS kpi_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT,
  date DATE NOT NULL,
  work_order_count INTEGER DEFAULT 0,
  avg_response_time INTEGER DEFAULT 0,
  satisfaction_avg DECIMAL(5,2) DEFAULT 0,
  score INTEGER DEFAULT 0,
  rank INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kpi_scores_company ON kpi_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_kpi_scores_user ON kpi_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_kpi_scores_date ON kpi_scores(date);

-- 3. RLS 策略
ALTER TABLE kpi_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kpi_scores_select" ON kpi_scores;
CREATE POLICY "kpi_scores_select" ON kpi_scores
  FOR SELECT USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));
DROP POLICY IF EXISTS "kpi_scores_insert" ON kpi_scores;
CREATE POLICY "kpi_scores_insert" ON kpi_scores
  FOR INSERT WITH CHECK (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));
DROP POLICY IF EXISTS "kpi_scores_update" ON kpi_scores;
CREATE POLICY "kpi_scores_update" ON kpi_scores
  FOR UPDATE USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

-- 4. updated_at 触发器
DROP TRIGGER IF EXISTS update_kpi_scores_updated_at ON kpi_scores;
CREATE TRIGGER update_kpi_scores_updated_at
BEFORE UPDATE ON kpi_scores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'KPI表创建完成！' AS result;