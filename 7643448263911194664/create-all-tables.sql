-- ============================================
-- 官方 Supabase 实例 - 所有缺失表创建脚本
-- 生成时间: 2026-05-25
-- 说明: 在 Supabase Dashboard SQL Editor 中执行此脚本
-- ============================================

-- ========================================
-- 第一部分: 核心业务表
-- ========================================

-- 1. kpi_schemes (KPI方案表)
CREATE TABLE IF NOT EXISTS kpi_schemes (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  name TEXT NOT NULL,
  positions JSONB DEFAULT '[]',
  cycle TEXT DEFAULT 'monthly',
  scoring_system TEXT DEFAULT 'percentage',
  selected_dimension_ids JSONB DEFAULT '[]',
  dimension_weights JSONB DEFAULT '{}',
  fault_tolerance JSONB DEFAULT '{}',
  custom_dimensions JSONB DEFAULT '[]',
  custom_indicators JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. kpi_plans (KPI计划表)
CREATE TABLE IF NOT EXISTS kpi_plans (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  scheme_id VARCHAR(36) REFERENCES kpi_schemes(id),
  name TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. kpi_assessments (KPI考核表)
CREATE TABLE IF NOT EXISTS kpi_assessments (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  plan_id VARCHAR(36) REFERENCES kpi_plans(id),
  agent_id VARCHAR(36),
  assessor_id VARCHAR(36),
  period TEXT,
  status TEXT DEFAULT 'pending',
  total_score DECIMAL(5,2),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. kpi_assessment_details (KPI考核明细表)
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

-- 5. kpi_records (KPI记录表)
CREATE TABLE IF NOT EXISTS kpi_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  agent_id VARCHAR(36),
  date DATE,
  metric_name TEXT,
  metric_value DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. phrase_library (话术库表)
CREATE TABLE IF NOT EXISTS phrase_library (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  category TEXT,
  content TEXT NOT NULL,
  is_preset BOOLEAN DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_case BOOLEAN DEFAULT FALSE,
  source_id VARCHAR(36),
  scene TEXT,
  question TEXT,
  answer TEXT,
  tags JSONB DEFAULT '[]',
  review_status TEXT DEFAULT '待审核',
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by VARCHAR(36),
  expires_at TIMESTAMPTZ,
  freshness_status TEXT DEFAULT 'normal'
);

-- 7. ai_chat_history (AI聊天历史表)
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  session_id VARCHAR(36),
  role TEXT NOT NULL,
  content TEXT,
  model TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. quality_feedbacks (质量反馈表)
CREATE TABLE IF NOT EXISTS quality_feedbacks (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  agent_id VARCHAR(36),
  customer_id VARCHAR(36),
  order_id VARCHAR(36),
  rating INTEGER,
  feedback TEXT,
  category TEXT,
  status TEXT DEFAULT 'pending',
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. cost_records (成本记录表)
CREATE TABLE IF NOT EXISTS cost_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  date DATE,
  category TEXT,
  amount DECIMAL(10,2),
  description TEXT,
  evidence_url TEXT,
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. redemption_codes (兑换码表)
CREATE TABLE IF NOT EXISTS redemption_codes (
  id VARCHAR(36) PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL,
  period TEXT,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  used_by VARCHAR(36),
  company_id VARCHAR(36) REFERENCES companies(id),
  status TEXT DEFAULT 'active'
);

-- 11. work_orders (工单表)
CREATE TABLE IF NOT EXISTS work_orders (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  agent_id VARCHAR(36),
  customer_name TEXT,
  customer_phone TEXT,
  order_type TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  description TEXT,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- 12. sop_templates (SOP模板表)
CREATE TABLE IF NOT EXISTS sop_templates (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  category TEXT,
  name TEXT NOT NULL,
  scenario TEXT,
  steps_json JSONB DEFAULT '[]',
  role TEXT,
  is_preset BOOLEAN DEFAULT FALSE,
  needs_update BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,
  updated_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. ai_checkup_submissions (AI体检提交表)
CREATE TABLE IF NOT EXISTS ai_checkup_submissions (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  checkup_type TEXT,
  responses JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. agents (客服表) - 如果不存在
CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  name TEXT NOT NULL,
  employee_id TEXT,
  hire_date DATE,
  position TEXT,
  training_stage TEXT,
  status TEXT DEFAULT '在职',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. notifications (通知表)
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  type TEXT,
  title TEXT,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. schedules (日程表)
CREATE TABLE IF NOT EXISTS schedules (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  type TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. payment_orders (付款订单表)
CREATE TABLE IF NOT EXISTS payment_orders (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  order_no TEXT UNIQUE,
  plan TEXT,
  amount DECIMAL(10,2),
  period TEXT,
  payment_method TEXT,
  screenshot_url TEXT,
  status TEXT DEFAULT 'pending',
  remark TEXT,
  confirmed_by VARCHAR(36),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. subscriptions (订阅表)
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  plan TEXT,
  status TEXT DEFAULT 'active',
  current_period_start DATE,
  current_period_end DATE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. recharge_logs (充值日志表)
CREATE TABLE IF NOT EXISTS recharge_logs (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  amount DECIMAL(10,2),
  type TEXT,
  description TEXT,
  balance_before DECIMAL(10,2),
  balance_after DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. invitations (邀请表)
CREATE TABLE IF NOT EXISTS invitations (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  email TEXT NOT NULL,
  role TEXT,
  token TEXT UNIQUE,
  invited_by VARCHAR(36) REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. teams (团队表)
CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  name TEXT NOT NULL,
  description TEXT,
  leader_id VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. product_profiles (产品档案表)
CREATE TABLE IF NOT EXISTS product_profiles (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  name TEXT NOT NULL,
  category TEXT,
  specifications JSONB DEFAULT '{}',
  price DECIMAL(10,2),
  description TEXT,
  images JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. custom_knowledge (自定义知识表)
CREATE TABLE IF NOT EXISTS custom_knowledge (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  tags JSONB DEFAULT '[]',
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. industry_knowledge (行业知识表)
CREATE TABLE IF NOT EXISTS industry_knowledge (
  id VARCHAR(36) PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  tags JSONB DEFAULT '[]',
  author_id VARCHAR(36),
  likes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. cost_baselines (成本基线表)
CREATE TABLE IF NOT EXISTS cost_baselines (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  category TEXT,
  baseline_amount DECIMAL(10,2),
  period TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. cost_alert_reviews (成本预警审核表)
CREATE TABLE IF NOT EXISTS cost_alert_reviews (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  alert_id VARCHAR(36),
  reviewed_by VARCHAR(36),
  action TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 27. audit_logs (审计日志表)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36),
  action TEXT,
  entity_type TEXT,
  entity_id VARCHAR(36),
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 28. daily_reports (日报表)
CREATE TABLE IF NOT EXISTS daily_reports (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  date DATE,
  content JSONB DEFAULT '{}',
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 29. weekly_reports (周报表)
CREATE TABLE IF NOT EXISTS weekly_reports (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  week_start DATE,
  week_end DATE,
  content JSONB DEFAULT '{}',
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 30. monthly_reports (月报表)
CREATE TABLE IF NOT EXISTS monthly_reports (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  month TEXT,
  content JSONB DEFAULT '{}',
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 31. learning_records (学习记录表)
CREATE TABLE IF NOT EXISTS learning_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  course_id VARCHAR(36),
  lesson_id VARCHAR(36),
  progress DECIMAL(5,2) DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 32. courses (课程表)
CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  thumbnail_url TEXT,
  lessons_count INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 33. course_lessons (课程课时表)
CREATE TABLE IF NOT EXISTS course_lessons (
  id VARCHAR(36) PRIMARY KEY,
  course_id VARCHAR(36) REFERENCES courses(id),
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 34. course_highlights (课程亮点表)
CREATE TABLE IF NOT EXISTS course_highlights (
  id VARCHAR(36) PRIMARY KEY,
  course_id VARCHAR(36) REFERENCES courses(id),
  content TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 35. newbie_training_progress (新人培训进度表)
CREATE TABLE IF NOT EXISTS newbie_training_progress (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  stage TEXT,
  progress DECIMAL(5,2) DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 36. practical_tasks (实践任务表)
CREATE TABLE IF NOT EXISTS practical_tasks (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  difficulty TEXT,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 37. daily_practice (每日一练表)
CREATE TABLE IF NOT EXISTS daily_practice (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  date DATE,
  question TEXT,
  answer TEXT,
  options JSONB DEFAULT '[]',
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 38. wrong_questions (错题表)
CREATE TABLE IF NOT EXISTS wrong_questions (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  question_id VARCHAR(36),
  user_answer TEXT,
  correct_answer TEXT,
  reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 39. exam_records (考试记录表)
CREATE TABLE IF NOT EXISTS exam_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  exam_id VARCHAR(36),
  score DECIMAL(5,2),
  answers JSONB DEFAULT '{}',
  passed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 40. knowledge_notes (知识笔记表)
CREATE TABLE IF NOT EXISTS knowledge_notes (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 41. knowledge_update_reminders (知识更新提醒表)
CREATE TABLE IF NOT EXISTS knowledge_update_reminders (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  knowledge_id VARCHAR(36),
  remind_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 42. item_feedback (项目反馈表)
CREATE TABLE IF NOT EXISTS item_feedback (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  item_type TEXT,
  item_id VARCHAR(36),
  rating INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 43. item_enhancements (项目增强表)
CREATE TABLE IF NOT EXISTS item_enhancements (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  item_type TEXT,
  item_id VARCHAR(36),
  enhancement_type TEXT,
  content TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by VARCHAR(36),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 44. incentive_rules (激励规则表)
CREATE TABLE IF NOT EXISTS incentive_rules (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  name TEXT NOT NULL,
  description TEXT,
  condition_json JSONB DEFAULT '{}',
  reward_type TEXT,
  reward_value DECIMAL(10,2),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 45. incentive_records (激励记录表)
CREATE TABLE IF NOT EXISTS incentive_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  rule_id VARCHAR(36) REFERENCES incentive_rules(id),
  reward_value DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 46. incentive_redemptions (激励兑换表)
CREATE TABLE IF NOT EXISTS incentive_redemptions (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  item_type TEXT,
  item_id VARCHAR(36),
  points_used INTEGER,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 47. management_plans (管理计划表)
CREATE TABLE IF NOT EXISTS management_plans (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  title TEXT NOT NULL,
  description TEXT,
  plan_type TEXT,
  content JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 48. problem_solutions (问题解决方案表)
CREATE TABLE IF NOT EXISTS problem_solutions (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  problem TEXT NOT NULL,
  solution TEXT,
  category TEXT,
  tags JSONB DEFAULT '[]',
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 49. scripts (脚本表)
CREATE TABLE IF NOT EXISTS scripts (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  name TEXT NOT NULL,
  content TEXT,
  script_type TEXT,
  status TEXT DEFAULT 'active',
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 50. self_check_items (自查项表)
CREATE TABLE IF NOT EXISTS self_check_items (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  frequency TEXT DEFAULT 'daily',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 51. self_check_records (自查记录表)
CREATE TABLE IF NOT EXISTS self_check_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  item_id VARCHAR(36) REFERENCES self_check_items(id),
  checked BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 52. self_check_reminders (自查提醒表)
CREATE TABLE IF NOT EXISTS self_check_reminders (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  remind_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 53. keyword_alert_configs (关键词预警配置表)
CREATE TABLE IF NOT EXISTS keyword_alert_configs (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  keyword TEXT NOT NULL,
  category TEXT,
  alert_type TEXT,
  threshold INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 54. keyword_alert_records (关键词预警记录表)
CREATE TABLE IF NOT EXISTS keyword_alert_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  config_id VARCHAR(36) REFERENCES keyword_alert_configs(id),
  content TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 55. insight_notifications (洞察通知表)
CREATE TABLE IF NOT EXISTS insight_notifications (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  insight_type TEXT,
  title TEXT,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 56. notification_feedback (通知反馈表)
CREATE TABLE IF NOT EXISTS notification_feedback (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  notification_id VARCHAR(36) REFERENCES notifications(id),
  user_id VARCHAR(36) REFERENCES users(id),
  feedback TEXT,
  rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 57. onboarding_tasks (入职任务表)
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  order_index INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 58. onboarding_records (入职记录表)
CREATE TABLE IF NOT EXISTS onboarding_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  task_id VARCHAR(36) REFERENCES onboarding_tasks(id),
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 59. user_industry_profiles (用户行业档案表)
CREATE TABLE IF NOT EXISTS user_industry_profiles (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  industry TEXT,
  profile_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 60. user_read_log (用户阅读日志表)
CREATE TABLE IF NOT EXISTS user_read_log (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  content_type TEXT,
  content_id VARCHAR(36),
  read_at TIMESTAMPTZ DEFAULT NOW()
);

-- 61. user_stats (用户统计表)
CREATE TABLE IF NOT EXISTS user_stats (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  stat_type TEXT,
  stat_value DECIMAL(10,2),
  period TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 62. template_usage (模板使用表)
CREATE TABLE IF NOT EXISTS template_usage (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  template_id VARCHAR(36),
  user_id VARCHAR(36) REFERENCES users(id),
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- 63. training_progress (培训进度表)
CREATE TABLE IF NOT EXISTS training_progress (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  training_id VARCHAR(36),
  progress DECIMAL(5,2) DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 64. user_course_progress (用户课程进度表)
CREATE TABLE IF NOT EXISTS user_course_progress (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  course_id VARCHAR(36) REFERENCES courses(id),
  lesson_id VARCHAR(36) REFERENCES course_lessons(id),
  progress DECIMAL(5,2) DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 65. personal_reports (个人报表表)
CREATE TABLE IF NOT EXISTS personal_reports (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  report_type TEXT,
  period TEXT,
  content JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 66. personal_learning_progress (个人学习进度表)
CREATE TABLE IF NOT EXISTS personal_learning_progress (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  total_courses INTEGER DEFAULT 0,
  completed_courses INTEGER DEFAULT 0,
  total_hours DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 67. personal_data_records (个人数据记录表)
CREATE TABLE IF NOT EXISTS personal_data_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  data_type TEXT,
  data_value JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 68. personal_feature_trials (个人功能试用表)
CREATE TABLE IF NOT EXISTS personal_feature_trials (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  feature_name TEXT,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 69. industry_trends (行业趋势表)
CREATE TABLE IF NOT EXISTS industry_trends (
  id VARCHAR(36) PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  source TEXT,
  published_at DATE,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 70. rule_updates (规则更新表)
CREATE TABLE IF NOT EXISTS rule_updates (
  id VARCHAR(36) PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  effective_date DATE,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 71. certificates (证书表)
CREATE TABLE IF NOT EXISTS certificates (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  certificate_type TEXT,
  certificate_no TEXT UNIQUE,
  issued_at DATE,
  expires_at DATE,
  status TEXT DEFAULT 'valid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 72. orders (订单表)
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  order_no TEXT UNIQUE,
  customer_name TEXT,
  customer_phone TEXT,
  amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 73. customer_records (客户记录表)
CREATE TABLE IF NOT EXISTS customer_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  name TEXT,
  phone TEXT,
  email TEXT,
  source TEXT,
  status TEXT DEFAULT 'new',
  agent_id VARCHAR(36),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 74. quality_inspections (质量检查表)
CREATE TABLE IF NOT EXISTS quality_inspections (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  inspection_type TEXT,
  target_id VARCHAR(36),
  result TEXT,
  score DECIMAL(5,2),
  inspector_id VARCHAR(36),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 75. chat_check_results (聊天检查结果表)
CREATE TABLE IF NOT EXISTS chat_check_results (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  chat_id VARCHAR(36),
  check_type TEXT,
  result JSONB DEFAULT '{}',
  score DECIMAL(5,2),
  issues JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 76. business_records (业务记录表)
CREATE TABLE IF NOT EXISTS business_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  record_type TEXT,
  content JSONB DEFAULT '{}',
  amount DECIMAL(10,2),
  date DATE,
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 77. cash_flow_records (现金流记录表)
CREATE TABLE IF NOT EXISTS cash_flow_records (
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

-- 78. finance_records (财务记录表)
CREATE TABLE IF NOT EXISTS finance_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  date DATE,
  type TEXT,
  amount DECIMAL(10,2),
  category TEXT,
  description TEXT,
  evidence_url TEXT,
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 79. product_profit_records (产品盈利记录表)
CREATE TABLE IF NOT EXISTS product_profit_records (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  product_id VARCHAR(36),
  date DATE,
  revenue DECIMAL(10,2),
  cost DECIMAL(10,2),
  profit DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 80. monthly_totals (月度汇总表)
CREATE TABLE IF NOT EXISTS monthly_totals (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  month TEXT,
  metric_type TEXT,
  metric_value DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 81. cda_credits (CDA积分表)
CREATE TABLE IF NOT EXISTS cda_credits (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  credits INTEGER DEFAULT 0,
  used_credits INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 82. approval_flows (审批流程表)
CREATE TABLE IF NOT EXISTS approval_flows (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  name TEXT NOT NULL,
  flow_type TEXT,
  steps JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 83. approval_thresholds (审批阈值表)
CREATE TABLE IF NOT EXISTS approval_thresholds (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  threshold_type TEXT,
  min_value DECIMAL(10,2),
  max_value DECIMAL(10,2),
  approver_roles JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 84. accessory_gallery (配件画廊表)
CREATE TABLE IF NOT EXISTS accessory_gallery (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  name TEXT NOT NULL,
  image_url TEXT,
  category TEXT,
  tags JSONB DEFAULT '[]',
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 85. custom_training_content (自定义培训内容表)
CREATE TABLE IF NOT EXISTS custom_training_content (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  title TEXT NOT NULL,
  content TEXT,
  content_type TEXT,
  category TEXT,
  created_by VARCHAR(36),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 86. health_check (健康检查表)
CREATE TABLE IF NOT EXISTS health_check (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  check_type TEXT,
  status TEXT,
  details JSONB DEFAULT '{}',
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 87. reports (报表表)
CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  report_type TEXT,
  period TEXT,
  content JSONB DEFAULT '{}',
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 88. report_views (报表视图表)
CREATE TABLE IF NOT EXISTS report_views (
  id VARCHAR(36) PRIMARY KEY,
  report_id VARCHAR(36) REFERENCES reports(id),
  viewer_id VARCHAR(36) REFERENCES users(id),
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 89. profiles (用户档案表)
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(36) PRIMARY KEY REFERENCES users(id),
  company_id VARCHAR(36) REFERENCES companies(id),
  display_name TEXT,
  avatar_url TEXT,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 90. onboarding_progress (入职进度表)
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  task_id VARCHAR(36),
  status TEXT DEFAULT 'pending',
  progress DECIMAL(5,2) DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 91. quality_scores (质量评分表)
CREATE TABLE IF NOT EXISTS quality_scores (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  agent_id VARCHAR(36),
  score DECIMAL(5,2),
  category TEXT,
  period TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 92. course_progress (课程进度表)
CREATE TABLE IF NOT EXISTS course_progress (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  course_id VARCHAR(36) REFERENCES courses(id),
  progress DECIMAL(5,2) DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 93. cost_alerts (成本预警表)
CREATE TABLE IF NOT EXISTS cost_alerts (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  type TEXT,
  threshold DECIMAL(10,2),
  current_value DECIMAL(10,2),
  status TEXT DEFAULT 'active',
  triggered_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 94. tickets (工单/票务表)
CREATE TABLE IF NOT EXISTS tickets (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'open',
  assigned_to VARCHAR(36),
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- 95. lesson_feedback (课时反馈表)
CREATE TABLE IF NOT EXISTS lesson_feedback (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) REFERENCES companies(id),
  user_id VARCHAR(36) REFERENCES users(id),
  lesson_id VARCHAR(36) REFERENCES course_lessons(id),
  rating INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 第二部分: 创建索引
-- ========================================

CREATE INDEX IF NOT EXISTS idx_kpi_schemes_company ON kpi_schemes(company_id);
CREATE INDEX IF NOT EXISTS idx_phrase_library_company ON phrase_library(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user ON ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_quality_feedbacks_company ON quality_feedbacks(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_company ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_sop_templates_company ON sop_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_agents_company ON agents(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_company ON payment_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_user ON learning_records(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_company ON courses(company_id);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_code ON redemption_codes(code);

-- ========================================
-- 第三部分: 启用 RLS
-- ========================================

-- 为所有表启用 RLS
ALTER TABLE kpi_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_assessment_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE phrase_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_checkup_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recharge_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_alert_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE newbie_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE practical_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_practice ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrong_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_update_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_enhancements ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentive_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentive_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentive_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_check_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_check_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_check_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_alert_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_industry_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_read_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_data_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_feature_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_profit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_totals ENABLE ROW LEVEL SECURITY;
ALTER TABLE cda_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessory_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_training_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_check ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_feedback ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 第四部分: 创建 RLS 策略
-- ========================================

-- 为所有表创建 service_role 完全访问策略
-- service_role 可以绕过 RLS，用于后端 API 调用

CREATE POLICY "service_role_all" ON kpi_schemes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON kpi_plans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON kpi_assessments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON kpi_assessment_details FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON kpi_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON phrase_library FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON ai_chat_history FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON quality_feedbacks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON cost_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON redemption_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON work_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON sop_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON ai_checkup_submissions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON agents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON schedules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON payment_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON recharge_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON invitations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON teams FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON product_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON custom_knowledge FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON industry_knowledge FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON cost_baselines FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON cost_alert_reviews FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON daily_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON weekly_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON monthly_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON learning_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON courses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON course_lessons FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON course_highlights FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON newbie_training_progress FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON practical_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON daily_practice FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON wrong_questions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON exam_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON knowledge_notes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON knowledge_update_reminders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON item_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON item_enhancements FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON incentive_rules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON incentive_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON incentive_redemptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON management_plans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON problem_solutions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON scripts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON self_check_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON self_check_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON self_check_reminders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON keyword_alert_configs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON keyword_alert_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON insight_notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON notification_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON onboarding_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON onboarding_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON user_industry_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON user_read_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON user_stats FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON template_usage FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON training_progress FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON user_course_progress FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON personal_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON personal_learning_progress FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON personal_data_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON personal_feature_trials FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON industry_trends FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON rule_updates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON certificates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON customer_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON quality_inspections FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON chat_check_results FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON business_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON cash_flow_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON finance_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON product_profit_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON monthly_totals FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON cda_credits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON approval_flows FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON approval_thresholds FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON accessory_gallery FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON custom_training_content FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON health_check FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON report_views FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON onboarding_progress FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON quality_scores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON course_progress FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON cost_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON tickets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON lesson_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ========================================
-- 完成
-- ========================================

-- 验证表数量
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema='public' AND table_type='BASE TABLE';
