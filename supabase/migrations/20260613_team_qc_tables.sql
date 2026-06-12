-- ==========================================
-- 创建AI质检模块数据表
-- 创建时间: 2026-06-13
-- ==========================================

CREATE TABLE IF NOT EXISTS qc_reports (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar(36),
  company_id varchar(36) NOT NULL,
  report_name text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_count integer DEFAULT 0,
  issue_count integer DEFAULT 0,
  overall_score numeric(10,2) DEFAULT 0,
  generated_by varchar(36) NOT NULL,
  generated_by_name text NOT NULL,
  generated_at timestamp DEFAULT now(),
  status text DEFAULT 'completed',
  created_at timestamp DEFAULT now()
);

ALTER TABLE IF EXISTS qc_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "qc_reports_company_isolation" ON qc_reports;
CREATE POLICY "qc_reports_company_isolation" ON qc_reports
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_qc_reports_company ON qc_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_qc_reports_date ON qc_reports(generated_at);
CREATE INDEX IF NOT EXISTS idx_qc_reports_status ON qc_reports(status);

CREATE TABLE IF NOT EXISTS qc_issues (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar(36),
  report_id varchar(36) NOT NULL,
  company_id varchar(36) NOT NULL,
  communication_id varchar(36),
  user_id varchar(36),
  user_name text,
  issue_type text NOT NULL,
  severity text DEFAULT 'medium',
  summary text,
  suggestion text,
  created_at timestamp DEFAULT now()
);

ALTER TABLE IF EXISTS qc_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "qc_issues_company_isolation" ON qc_issues;
CREATE POLICY "qc_issues_company_isolation" ON qc_issues
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_qc_issues_report ON qc_issues(report_id);
CREATE INDEX IF NOT EXISTS idx_qc_issues_user ON qc_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_qc_issues_type ON qc_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_qc_issues_severity ON qc_issues(severity);

CREATE TABLE IF NOT EXISTS training_tasks (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar(36),
  company_id varchar(36) NOT NULL,
  user_id varchar(36) NOT NULL,
  user_name text NOT NULL,
  issue_type text NOT NULL,
  deadline date,
  status text DEFAULT 'pending',
  completed_at timestamp,
  review_note text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE IF EXISTS training_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "training_tasks_company_isolation" ON training_tasks;
CREATE POLICY "training_tasks_company_isolation" ON training_tasks
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_training_tasks_company ON training_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_training_tasks_user ON training_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_training_tasks_status ON training_tasks(status);

CREATE TABLE IF NOT EXISTS qc_rules (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar(36),
  company_id varchar(36) NOT NULL,
  dimension text NOT NULL,
  enabled boolean DEFAULT true,
  sensitivity text DEFAULT 'medium',
  keywords text[],
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(company_id, dimension)
);

ALTER TABLE IF EXISTS qc_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "qc_rules_company_isolation" ON qc_rules;
CREATE POLICY "qc_rules_company_isolation" ON qc_rules
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_qc_rules_company ON qc_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_qc_rules_dimension ON qc_rules(dimension);

DROP TRIGGER IF EXISTS update_training_tasks_updated_at ON training_tasks;
CREATE TRIGGER update_training_tasks_updated_at
BEFORE UPDATE ON training_tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_qc_rules_updated_at ON qc_rules;
CREATE TRIGGER update_qc_rules_updated_at
BEFORE UPDATE ON qc_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'AI质检模块数据表创建完成！' AS result;