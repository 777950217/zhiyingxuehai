-- 官方 Supabase 实例完整建表脚本
-- 基于火山引擎实例表结构 + Drizzle Schema 定义
-- 执行方式：Supabase Dashboard SQL Editor

-- ===================== 核心业务表 =====================

CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  industry TEXT DEFAULT '卫浴',
  team_size INTEGER DEFAULT 1,
  contact_name TEXT,
  contact_phone TEXT,
  plan TEXT DEFAULT 'basic',
  plan_expires_at TIMESTAMPTZ,
  ai_credits_remaining INTEGER DEFAULT 3,
  service_level TEXT DEFAULT 'self',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  plan_start TIMESTAMPTZ,
  plan_end TIMESTAMPTZ,
  plan_period TEXT DEFAULT 'monthly',
  brand_name TEXT,
  categories TEXT DEFAULT '[]',
  price_range TEXT,
  platforms TEXT DEFAULT '[]',
  daily_consultations TEXT,
  pain_points TEXT DEFAULT '[]',
  supply_type TEXT,
  install_service BOOLEAN DEFAULT false,
  return_policy TEXT,
  profile_completed BOOLEAN DEFAULT false,
  seat_limit INTEGER DEFAULT 1,
  seat_used INTEGER DEFAULT 1,
  trial_end_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'agent',
  user_type TEXT DEFAULT 'small',
  ai_credits_remaining INTEGER DEFAULT 3,
  status TEXT DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  remaining_credits INTEGER DEFAULT 3,
  industry VARCHAR(255),
  team_size VARCHAR(255),
  gender VARCHAR(50) DEFAULT '保密',
  bio TEXT DEFAULT '',
  position VARCHAR(255),
  industry_profile_completed BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  name TEXT NOT NULL,
  employee_id TEXT,
  hire_date TIMESTAMPTZ,
  position TEXT DEFAULT '售中客服',
  training_stage TEXT DEFAULT '基础',
  status TEXT DEFAULT '在职',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  team_id VARCHAR(36),
  role_tag TEXT DEFAULT '售前',
  skill_tags TEXT DEFAULT '{}',
  user_id UUID
);

-- ===================== KPI 考核表 =====================

CREATE TABLE IF NOT EXISTS kpi_schemes (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  name TEXT NOT NULL,
  positions JSONB NOT NULL DEFAULT '[]',
  cycle VARCHAR(50) NOT NULL DEFAULT 'monthly',
  scoring_system VARCHAR(50) NOT NULL DEFAULT 'percentage',
  selected_dimension_ids JSONB NOT NULL DEFAULT '[]',
  dimension_weights JSONB NOT NULL DEFAULT '{}',
  fault_tolerance JSONB NOT NULL DEFAULT '{}',
  custom_dimensions JSONB NOT NULL DEFAULT '[]',
  custom_indicators JSONB NOT NULL DEFAULT '[]',
  ai_evaluation JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  effective_period VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kpi_assessments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  scheme_id VARCHAR(36) NOT NULL,
  agent_id VARCHAR(36) NOT NULL,
  period VARCHAR(100) NOT NULL,
  total_score NUMERIC,
  total_deduction NUMERIC DEFAULT 0,
  total_bonus NUMERIC DEFAULT 0,
  salary_effect TEXT,
  hr_action TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kpi_assessment_details (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  assessment_id VARCHAR(36) NOT NULL,
  dimension_id VARCHAR(36) NOT NULL,
  indicator_id VARCHAR(36) NOT NULL,
  indicator_name VARCHAR(255) NOT NULL,
  target_value VARCHAR(255) NOT NULL,
  actual_value VARCHAR(255),
  is_achieved BOOLEAN,
  score_change NUMERIC DEFAULT 0,
  fault_tolerance_used BOOLEAN DEFAULT false,
  fault_tolerance_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kpi_plans (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  scheme_id VARCHAR(36) NOT NULL,
  name TEXT NOT NULL,
  period VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kpi_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  agent_id VARCHAR(36) NOT NULL,
  assessment_id VARCHAR(36),
  score NUMERIC,
  period VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 话术库表 =====================

CREATE TABLE IF NOT EXISTS phrase_library (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36),
  category VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  is_preset BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_case BOOLEAN DEFAULT false,
  source_id VARCHAR(36),
  scene TEXT,
  question TEXT,
  answer TEXT,
  tags TEXT,
  review_status VARCHAR(50) DEFAULT '待审核',
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by VARCHAR(36),
  expires_at TIMESTAMPTZ,
  freshness_status VARCHAR(50) DEFAULT 'normal'
);

-- ===================== SOP 模板表 =====================

CREATE TABLE IF NOT EXISTS sop_templates (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  scenario TEXT,
  steps_json TEXT DEFAULT '[]',
  role TEXT DEFAULT '售中客服',
  is_preset BOOLEAN DEFAULT false,
  needs_update BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== 工单表 =====================

CREATE TABLE IF NOT EXISTS work_orders (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36),
  user_id VARCHAR(36),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  query TEXT,
  category VARCHAR(100),
  ai_judgment TEXT,
  ai_script TEXT,
  priority VARCHAR(50) DEFAULT '普通',
  status VARCHAR(50) DEFAULT '待处理',
  result TEXT,
  source_type VARCHAR(50) DEFAULT 'ai_generate',
  problem_solution_id UUID,
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT now(),
  order_no VARCHAR(50)
);

-- ===================== 培训表 =====================

CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36),
  title TEXT NOT NULL,
  category VARCHAR(100),
  description TEXT,
  content TEXT DEFAULT '[]',
  is_preset BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  feishu_doc_url TEXT
);

CREATE TABLE IF NOT EXISTS course_lessons (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  course_id VARCHAR(36) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_highlights (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  course_id VARCHAR(36) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  course_id VARCHAR(36) NOT NULL,
  lesson_id VARCHAR(36),
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_progress (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  agent_id VARCHAR(36) NOT NULL,
  stage TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== 产品档案表 =====================

CREATE TABLE IF NOT EXISTS product_profiles (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  name TEXT NOT NULL,
  category VARCHAR(100),
  specifications JSONB,
  features JSONB,
  manual_url TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== AI 相关表 =====================

CREATE TABLE IF NOT EXISTS ai_chat_history (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  session_type VARCHAR(50),
  question TEXT NOT NULL,
  answer TEXT,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_checkup_submissions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  checkup_type VARCHAR(100) NOT NULL,
  input TEXT NOT NULL,
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS health_check (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  check_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 质量反馈表 =====================

CREATE TABLE IF NOT EXISTS quality_feedbacks (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  rating INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quality_inspections (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  agent_id VARCHAR(36) NOT NULL,
  inspection_type VARCHAR(100) NOT NULL,
  score NUMERIC,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_check_results (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  agent_id VARCHAR(36) NOT NULL,
  chat_id VARCHAR(36),
  result JSONB,
  score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 成本表 =====================

CREATE TABLE IF NOT EXISTS cost_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cost_baselines (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  category VARCHAR(100) NOT NULL,
  baseline_amount NUMERIC NOT NULL,
  alert_threshold NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cost_alert_reviews (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  cost_record_id VARCHAR(36) NOT NULL,
  reviewed_by VARCHAR(36) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 财务表 =====================

CREATE TABLE IF NOT EXISTS payment_orders (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  order_no VARCHAR(50) NOT NULL,
  plan VARCHAR(50) NOT NULL,
  amount NUMERIC NOT NULL,
  period VARCHAR(50) NOT NULL,
  payment_method VARCHAR(50),
  screenshot_url TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  remark TEXT,
  confirmed_by VARCHAR(36),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  plan VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recharge_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  amount NUMERIC NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  amount NUMERIC,
  description TEXT,
  recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cash_flow_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  amount NUMERIC NOT NULL,
  category VARCHAR(100),
  description TEXT,
  recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount NUMERIC NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 团队表 =====================

CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  leader_id VARCHAR(36),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invitations (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  email TEXT NOT NULL,
  role VARCHAR(50) NOT NULL,
  invited_by VARCHAR(36) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  token VARCHAR(255),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 入职表 =====================

CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS onboarding_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  agent_id VARCHAR(36) NOT NULL,
  task_id VARCHAR(36) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 通知表 =====================

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  type VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 日程表 =====================

CREATE TABLE IF NOT EXISTS schedules (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  type VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 兑换码表 =====================

CREATE TABLE IF NOT EXISTS redemption_codes (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code VARCHAR(100) NOT NULL,
  plan VARCHAR(50) NOT NULL,
  period VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'unused',
  used_by VARCHAR(36),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 客户记录表 =====================

CREATE TABLE IF NOT EXISTS customer_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  agent_id VARCHAR(36),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_wechat VARCHAR(100),
  query TEXT,
  result TEXT,
  category VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 每日练习表 =====================

CREATE TABLE IF NOT EXISTS daily_practice (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  is_correct BOOLEAN,
  score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 知识库表 =====================

CREATE TABLE IF NOT EXISTS custom_knowledge (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  tags TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS industry_knowledge (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  tags TEXT,
  is_preset BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_notes (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  knowledge_id VARCHAR(36) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 审计日志表 =====================

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36),
  user_id VARCHAR(36),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(100),
  target_id VARCHAR(36),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 用户统计表 =====================

CREATE TABLE IF NOT EXISTS user_stats (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL,
  stat_type VARCHAR(100) NOT NULL,
  stat_value VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== 活动日志表 =====================

CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36),
  user_id VARCHAR(36),
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 会话表 =====================

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 报表表 =====================

CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  period VARCHAR(100) NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weekly_reports (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  week_start TIMESTAMPTZ NOT NULL,
  week_end TIMESTAMPTZ NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_reports (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  month VARCHAR(7) NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_reports (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 其他辅助表 =====================

CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL,
  avatar_url TEXT,
  nickname TEXT,
  preferences JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lesson_feedback (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lesson_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  rating INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_progress (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  course_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS management_plans (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wrong_questions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL,
  question_id VARCHAR(36) NOT NULL,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) NOT NULL,
  order_no VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  amount NUMERIC NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 索引 =====================

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_agents_company_id ON agents(company_id);
CREATE INDEX IF NOT EXISTS idx_kpi_schemes_company_id ON kpi_schemes(company_id);
CREATE INDEX IF NOT EXISTS idx_kpi_assessments_company_id ON kpi_assessments(company_id);
CREATE INDEX IF NOT EXISTS idx_kpi_assessments_scheme_id ON kpi_assessments(scheme_id);
CREATE INDEX IF NOT EXISTS idx_kpi_assessment_details_assessment_id ON kpi_assessment_details(assessment_id);
CREATE INDEX IF NOT EXISTS idx_phrase_library_company_id ON phrase_library(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_company_id ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_courses_company_id ON courses(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_company_id ON payment_orders(company_id);

-- ===================== RLS 策略 =====================

-- 启用 RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_assessment_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE phrase_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_checkup_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_check ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_alert_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recharge_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_practice ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrong_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- service_role 完全访问策略
CREATE POLICY "service_role_all_access" ON companies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON agents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON kpi_schemes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON kpi_assessments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON kpi_assessment_details FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON kpi_plans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON kpi_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON phrase_library FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON sop_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON work_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON courses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON course_lessons FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON course_highlights FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON learning_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON training_progress FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON product_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON ai_chat_history FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON ai_checkup_submissions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON health_check FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON quality_feedbacks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON quality_inspections FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON chat_check_results FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON cost_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON cost_baselines FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON cost_alert_reviews FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON payment_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON recharge_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON business_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON cash_flow_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON finance_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON teams FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON invitations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON onboarding_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON onboarding_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON schedules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON redemption_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON customer_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON daily_practice FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON custom_knowledge FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON industry_knowledge FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON knowledge_notes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON user_stats FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON activity_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON weekly_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON monthly_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON daily_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON lesson_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON course_progress FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON management_plans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON wrong_questions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access" ON orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 验证
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';
