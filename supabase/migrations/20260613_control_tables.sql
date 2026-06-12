-- ==========================================
-- 创建管控看板模块数据表
-- 创建时间: 2026-06-13
-- ==========================================

CREATE TABLE IF NOT EXISTS quality_feedback (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar(36),
  company_id varchar(36) NOT NULL,
  work_order_id varchar(36),
  user_id varchar(36) NOT NULL,
  user_name text NOT NULL,
  violation_type text NOT NULL,
  deduction integer DEFAULT 0,
  chat_summary text,
  violation_note text,
  feedback_time timestamp DEFAULT now(),
  created_at timestamp DEFAULT now()
);

ALTER TABLE IF EXISTS quality_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quality_feedback_company_isolation" ON quality_feedback;
CREATE POLICY "quality_feedback_company_isolation" ON quality_feedback
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_quality_feedback_company ON quality_feedback(company_id);
CREATE INDEX IF NOT EXISTS idx_quality_feedback_user ON quality_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_quality_feedback_type ON quality_feedback(violation_type);

CREATE TABLE IF NOT EXISTS self_check_results (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar(36),
  company_id varchar(36) NOT NULL,
  user_id varchar(36) NOT NULL,
  user_name text NOT NULL,
  check_date date NOT NULL,
  dimension_scores jsonb,
  total_score integer DEFAULT 0,
  created_at timestamp DEFAULT now()
);

ALTER TABLE IF EXISTS self_check_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "self_check_results_company_isolation" ON self_check_results;
CREATE POLICY "self_check_results_company_isolation" ON self_check_results
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_self_check_results_company ON self_check_results(company_id);
CREATE INDEX IF NOT EXISTS idx_self_check_results_user ON self_check_results(user_id);
CREATE INDEX IF NOT EXISTS idx_self_check_results_date ON self_check_results(check_date);

SELECT '管控看板模块数据表创建完成！' AS result;