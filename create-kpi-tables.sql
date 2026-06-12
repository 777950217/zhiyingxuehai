-- ============================================
-- KPI 相关表创建 SQL
-- 在官方 Supabase 实例执行
-- ============================================

-- 1. kpi_schemes 表
CREATE TABLE IF NOT EXISTS kpi_schemes (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL REFERENCES companies(id),
  name VARCHAR(200) NOT NULL,
  positions JSONB NOT NULL DEFAULT '[]',
  cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  scoring_system VARCHAR(20) NOT NULL DEFAULT 'percentage',
  selected_dimension_ids JSONB NOT NULL DEFAULT '[]',
  dimension_weights JSONB NOT NULL DEFAULT '{}',
  fault_tolerance JSONB NOT NULL DEFAULT '{}',
  custom_dimensions JSONB NOT NULL DEFAULT '[]',
  custom_indicators JSONB NOT NULL DEFAULT '[]',
  ai_evaluation JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  effective_period VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. kpi_plans 表
CREATE TABLE IF NOT EXISTS kpi_plans (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL REFERENCES companies(id),
  scheme_id VARCHAR(36) NOT NULL REFERENCES kpi_schemes(id),
  agent_id VARCHAR(36) NOT NULL,
  period VARCHAR(20) NOT NULL,
  targets JSONB NOT NULL DEFAULT '{}',
  weights JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. kpi_assessments 表
CREATE TABLE IF NOT EXISTS kpi_assessments (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL REFERENCES companies(id),
  scheme_id VARCHAR(36) NOT NULL REFERENCES kpi_schemes(id),
  plan_id VARCHAR(36) REFERENCES kpi_plans(id),
  agent_id VARCHAR(36) NOT NULL,
  assessor_id VARCHAR(36),
  period VARCHAR(20) NOT NULL,
  scores JSONB NOT NULL DEFAULT '{}',
  total_score DECIMAL(5,2),
  level VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. kpi_assessment_details 表
CREATE TABLE IF NOT EXISTS kpi_assessment_details (
  id VARCHAR(36) PRIMARY KEY,
  assessment_id VARCHAR(36) NOT NULL REFERENCES kpi_assessments(id),
  dimension_id VARCHAR(36) NOT NULL,
  indicator_id VARCHAR(36),
  score DECIMAL(5,2),
  weight DECIMAL(5,2),
  evidence TEXT,
  ai_score DECIMAL(5,2),
  ai_evidence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. kpi_records 表
CREATE TABLE IF NOT EXISTS kpi_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL REFERENCES companies(id),
  agent_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(50) NOT NULL,
  value DECIMAL(10,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_kpi_schemes_company ON kpi_schemes(company_id);
CREATE INDEX IF NOT EXISTS idx_kpi_plans_company ON kpi_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_kpi_plans_agent ON kpi_plans(agent_id);
CREATE INDEX IF NOT EXISTS idx_kpi_assessments_company ON kpi_assessments(company_id);
CREATE INDEX IF NOT EXISTS idx_kpi_assessments_agent ON kpi_assessments(agent_id);
CREATE INDEX IF NOT EXISTS idx_kpi_records_company ON kpi_records(company_id);
CREATE INDEX IF NOT EXISTS idx_kpi_records_agent ON kpi_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_kpi_records_date ON kpi_records(date);

-- 启用 RLS
ALTER TABLE kpi_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_assessment_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_records ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略（允许 service_role 完全访问）
CREATE POLICY "service_role_all" ON kpi_schemes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON kpi_plans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON kpi_assessments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON kpi_assessment_details FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON kpi_records FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 验证
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' AND table_name LIKE 'kpi%' 
ORDER BY table_name;
