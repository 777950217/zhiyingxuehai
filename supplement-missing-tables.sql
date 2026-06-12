-- ============================================================
-- 补充缺失表 SQL - 官方 Supabase 实例
-- 生成时间: 2025-05-25
-- 缺失表数量: 23
-- ============================================================

-- 1. kpi_assessment_details (KPI考核详情)
CREATE TABLE IF NOT EXISTS kpi_assessment_details (
  id VARCHAR(36) PRIMARY KEY,
  assessment_id VARCHAR(36) REFERENCES kpi_assessments(id),
  dimension_id TEXT,
  dimension_name TEXT,
  indicator_id TEXT,
  indicator_name TEXT,
  score DECIMAL(5,2),
  weight DECIMAL(5,2),
  evidence TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. teams (团队表)
CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  name TEXT NOT NULL,
  description TEXT,
  leader_id VARCHAR(36) REFERENCES users(id),
  member_ids JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. invitations (邀请表)
CREATE TABLE IF NOT EXISTS invitations (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  email TEXT NOT NULL,
  role TEXT DEFAULT 'staff',
  token TEXT UNIQUE NOT NULL,
  invited_by VARCHAR(36) REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. onboarding_records (入职记录)
CREATE TABLE IF NOT EXISTS onboarding_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  agent_id VARCHAR(36) REFERENCES agents(id),
  task_id VARCHAR(36),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. course_progress (课程进度)
CREATE TABLE IF NOT EXISTS course_progress (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  course_id VARCHAR(36) REFERENCES courses(id),
  lesson_id TEXT,
  status TEXT DEFAULT 'not_started',
  progress DECIMAL(5,2) DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. lesson_feedback (课时反馈)
CREATE TABLE IF NOT EXISTS lesson_feedback (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  course_id VARCHAR(36),
  lesson_id TEXT,
  rating INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. business_records (业务记录)
CREATE TABLE IF NOT EXISTS business_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  date DATE,
  type TEXT,
  category TEXT,
  amount DECIMAL(10,2),
  description TEXT,
  evidence_url TEXT,
  created_by VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. cash_flow_records (现金流记录)
CREATE TABLE IF NOT EXISTS cash_flow_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  date DATE,
  type TEXT,
  amount DECIMAL(10,2),
  category TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. finance_records (财务记录)
CREATE TABLE IF NOT EXISTS finance_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  date DATE,
  type TEXT,
  category TEXT,
  amount DECIMAL(10,2),
  description TEXT,
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. recharge_logs (充值日志)
CREATE TABLE IF NOT EXISTS recharge_logs (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  amount DECIMAL(10,2),
  credits INTEGER,
  payment_method TEXT,
  transaction_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. subscriptions (订阅表)
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  plan TEXT NOT NULL,
  period TEXT,
  start_date DATE,
  end_date DATE,
  amount DECIMAL(10,2),
  status TEXT DEFAULT 'active',
  auto_renew BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. cost_alerts (成本预警)
CREATE TABLE IF NOT EXISTS cost_alerts (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  type TEXT,
  category TEXT,
  threshold DECIMAL(10,2),
  current_value DECIMAL(10,2),
  severity TEXT DEFAULT 'warning',
  status TEXT DEFAULT 'active',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. cost_baselines (成本基线)
CREATE TABLE IF NOT EXISTS cost_baselines (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  category TEXT,
  baseline_value DECIMAL(10,2),
  period TEXT,
  set_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. cost_alert_reviews (成本预警审核)
CREATE TABLE IF NOT EXISTS cost_alert_reviews (
  id VARCHAR(36) PRIMARY KEY,
  alert_id VARCHAR(36) REFERENCES cost_alerts(id),
  reviewed_by VARCHAR(36) REFERENCES users(id),
  action TEXT,
  comment TEXT,
  reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. daily_practice (每日一练)
CREATE TABLE IF NOT EXISTS daily_practice (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  date DATE,
  questions JSONB DEFAULT '[]',
  answers JSONB DEFAULT '[]',
  score DECIMAL(5,2),
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. management_plans (管理方案)
CREATE TABLE IF NOT EXISTS management_plans (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  status TEXT DEFAULT 'draft',
  created_by VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. quality_inspections (质检记录)
CREATE TABLE IF NOT EXISTS quality_inspections (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  agent_id VARCHAR(36),
  date DATE,
  type TEXT,
  score DECIMAL(5,2),
  items JSONB DEFAULT '[]',
  notes TEXT,
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. chat_check_results (聊天检查结果)
CREATE TABLE IF NOT EXISTS chat_check_results (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  agent_id VARCHAR(36),
  session_id TEXT,
  check_type TEXT,
  result JSONB DEFAULT '{}',
  score DECIMAL(5,2),
  issues JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. health_check (健康检查)
CREATE TABLE IF NOT EXISTS health_check (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  check_type TEXT,
  status TEXT DEFAULT 'pending',
  results JSONB DEFAULT '{}',
  score DECIMAL(5,2),
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. profiles (用户档案)
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(36) PRIMARY KEY REFERENCES users(id),
  company_id VARCHAR(36) REFERENCES companies(id),
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  department TEXT,
  position TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. user_stats (用户统计)
CREATE TABLE IF NOT EXISTS user_stats (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id),
  company_id VARCHAR(36) REFERENCES companies(id),
  stat_type TEXT,
  stat_value JSONB DEFAULT '{}',
  period TEXT,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. activity_logs (活动日志)
CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. sessions (会话表)
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id),
  company_id VARCHAR(36) REFERENCES companies(id),
  token TEXT,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 启用 RLS
-- ============================================================
ALTER TABLE kpi_assessment_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE recharge_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_alert_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_practice ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_check ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- service_role 完全访问策略
-- ============================================================
CREATE POLICY "service_role_full_access" ON kpi_assessment_details FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON teams FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON invitations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON onboarding_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON course_progress FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON lesson_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON business_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON cash_flow_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON finance_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON recharge_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON cost_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON cost_baselines FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON cost_alert_reviews FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON daily_practice FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON management_plans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON quality_inspections FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON chat_check_results FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON health_check FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON user_stats FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON activity_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 验证
-- ============================================================
SELECT '补充表创建完成' AS status;
