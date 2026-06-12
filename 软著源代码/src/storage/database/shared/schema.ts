import { pgTable, text, timestamp, boolean, integer, jsonb, numeric, varchar, uuid, serial, index } from 'drizzle-orm/pg-core';

// ===================== 核心业务表 =====================

export const companies = pgTable('companies', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  industry: text('industry').default('卫浴'),
  teamSize: integer('team_size').default(1),
  contactName: text('contact_name'),
  contactPhone: text('contact_phone'),
  plan: text('plan').default('basic'),
  planExpiresAt: timestamp('plan_expires_at', { withTimezone: true }),
  aiCreditsRemaining: integer('ai_credits_remaining').default(3),
  serviceLevel: text('service_level').default('self'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  planStart: timestamp('plan_start', { withTimezone: true }),
  planEnd: timestamp('plan_end', { withTimezone: true }),
  planPeriod: text('plan_period').default('monthly'),
  brandName: text('brand_name'),
  categories: text('categories').default('[]'),
  priceRange: text('price_range'),
  platforms: text('platforms').default('[]'),
  dailyConsultations: text('daily_consultations'),
  painPoints: text('pain_points').default('[]'),
  supplyType: text('supply_type'),
  installService: boolean('install_service').default(false),
  returnPolicy: text('return_policy'),
  profileCompleted: boolean('profile_completed').default(false),
  seatLimit: integer('seat_limit').default(1),
  seatUsed: integer('seat_used').default(1),
  trialEndAt: timestamp('trial_end_at', { withTimezone: true }),
});

export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  role: text('role').default('agent'),
  userType: text('user_type').default('small'),
  aiCreditsRemaining: integer('ai_credits_remaining').default(3),
  status: text('status').default('active'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  remainingCredits: integer('remaining_credits').default(3),
  industry: varchar('industry', { length: 255 }),
  teamSize: varchar('team_size', { length: 255 }),
  gender: varchar('gender', { length: 50 }).default('保密'),
  bio: text('bio').default(''),
  position: varchar('position', { length: 255 }),
  industryProfileCompleted: boolean('industry_profile_completed').default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

export const agents = pgTable('agents', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  name: text('name').notNull(),
  employeeId: text('employee_id'),
  hireDate: timestamp('hire_date', { withTimezone: true }),
  position: text('position').default('售中客服'),
  trainingStage: text('training_stage').default('基础'),
  status: text('status').default('在职'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  teamId: varchar('team_id', { length: 36 }),
  roleTag: text('role_tag').default('售前'),
  skillTags: text('skill_tags').default('{}'),
  userId: uuid('user_id'),
});

// ===================== KPI 考核表 =====================

export const kpiSchemes = pgTable('kpi_schemes', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  name: text('name').notNull(),
  positions: jsonb('positions').notNull().default([]),
  cycle: varchar('cycle', { length: 50 }).notNull().default('monthly'),
  scoringSystem: varchar('scoring_system', { length: 50 }).notNull().default('percentage'),
  selectedDimensionIds: jsonb('selected_dimension_ids').notNull().default([]),
  dimensionWeights: jsonb('dimension_weights').notNull().default({}),
  faultTolerance: jsonb('fault_tolerance').notNull().default({}),
  customDimensions: jsonb('custom_dimensions').notNull().default([]),
  customIndicators: jsonb('custom_indicators').notNull().default([]),
  aiEvaluation: jsonb('ai_evaluation'),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  effectivePeriod: varchar('effective_period', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const kpiAssessments = pgTable('kpi_assessments', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  schemeId: varchar('scheme_id', { length: 36 }).notNull(),
  agentId: varchar('agent_id', { length: 36 }).notNull(),
  period: varchar('period', { length: 100 }).notNull(),
  totalScore: numeric('total_score'),
  totalDeduction: numeric('total_deduction').default('0'),
  totalBonus: numeric('total_bonus').default('0'),
  salaryEffect: text('salary_effect'),
  hrAction: text('hr_action'),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const kpiAssessmentDetails = pgTable('kpi_assessment_details', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  assessmentId: varchar('assessment_id', { length: 36 }).notNull(),
  dimensionId: varchar('dimension_id', { length: 36 }).notNull(),
  indicatorId: varchar('indicator_id', { length: 36 }).notNull(),
  indicatorName: varchar('indicator_name', { length: 255 }).notNull(),
  targetValue: varchar('target_value', { length: 255 }).notNull(),
  actualValue: varchar('actual_value', { length: 255 }),
  isAchieved: boolean('is_achieved'),
  scoreChange: numeric('score_change').default('0'),
  faultToleranceUsed: boolean('fault_tolerance_used').default(false),
  faultToleranceReason: text('fault_tolerance_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const kpiPlans = pgTable('kpi_plans', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  schemeId: varchar('scheme_id', { length: 36 }).notNull(),
  name: text('name').notNull(),
  period: varchar('period', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const kpiRecords = pgTable('kpi_records', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  agentId: varchar('agent_id', { length: 36 }).notNull(),
  assessmentId: varchar('assessment_id', { length: 36 }),
  score: numeric('score'),
  period: varchar('period', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== 话术库表 =====================

export const phraseLibrary = pgTable('phrase_library', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }),
  category: varchar('category', { length: 100 }).notNull(),
  content: text('content').notNull(),
  isPreset: boolean('is_preset').default(true),
  useCount: integer('use_count').default(0),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  isCase: boolean('is_case').default(false),
  sourceId: varchar('source_id', { length: 36 }),
  scene: text('scene'),
  question: text('question'),
  answer: text('answer'),
  tags: text('tags'),
  reviewStatus: varchar('review_status', { length: 50 }).default('待审核'),
  reviewNote: text('review_note'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewedBy: varchar('reviewed_by', { length: 36 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  freshnessStatus: varchar('freshness_status', { length: 50 }).default('normal'),
});

// ===================== SOP 模板表 =====================

export const sopTemplates = pgTable('sop_templates', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }),
  category: text('category').notNull(),
  name: text('name').notNull(),
  scenario: text('scenario'),
  stepsJson: text('steps_json').default('[]'),
  role: text('role').default('售中客服'),
  isPreset: boolean('is_preset').default(false),
  needsUpdate: boolean('needs_update').default(false),
  version: integer('version').default(1),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ===================== 工单表 =====================

export const workOrders = pgTable('work_orders', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }),
  userId: varchar('user_id', { length: 36 }),
  customerName: varchar('customer_name', { length: 255 }),
  customerPhone: varchar('customer_phone', { length: 50 }),
  query: text('query'),
  category: varchar('category', { length: 100 }),
  aiJudgment: text('ai_judgment'),
  aiScript: text('ai_script'),
  priority: varchar('priority', { length: 50 }).default('普通'),
  status: varchar('status', { length: 50 }).default('待处理'),
  result: text('result'),
  sourceType: varchar('source_type', { length: 50 }).default('ai_generate'),
  problemSolutionId: uuid('problem_solution_id'),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
  orderNo: varchar('order_no', { length: 50 }),
});

// ===================== 培训表 =====================

export const courses = pgTable('courses', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }),
  title: text('title').notNull(),
  category: varchar('category', { length: 100 }),
  description: text('description'),
  content: text('content').default('[]'),
  isPreset: boolean('is_preset').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  feishuDocUrl: text('feishu_doc_url'),
});

export const courseLessons = pgTable('course_lessons', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  courseId: varchar('course_id', { length: 36 }).notNull(),
  title: text('title').notNull(),
  content: text('content'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const courseHighlights = pgTable('course_highlights', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  courseId: varchar('course_id', { length: 36 }).notNull(),
  title: text('title').notNull(),
  content: text('content'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const learningRecords = pgTable('learning_records', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  courseId: varchar('course_id', { length: 36 }).notNull(),
  lessonId: varchar('lesson_id', { length: 36 }),
  progress: integer('progress').default(0),
  completed: boolean('completed').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const trainingProgress = pgTable('training_progress', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  agentId: varchar('agent_id', { length: 36 }).notNull(),
  stage: text('stage').notNull(),
  progress: integer('progress').default(0),
  status: varchar('status', { length: 50 }).default('in_progress'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ===================== 产品档案表 =====================

export const productProfiles = pgTable('product_profiles', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  name: text('name').notNull(),
  category: varchar('category', { length: 100 }),
  specifications: jsonb('specifications'),
  features: jsonb('features'),
  manualUrl: text('manual_url'),
  videoUrl: text('video_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ===================== AI 相关表 =====================

export const aiChatHistory = pgTable('ai_chat_history', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  sessionType: varchar('session_type', { length: 50 }),
  question: text('question').notNull(),
  answer: text('answer'),
  feedback: text('feedback'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const aiCheckupSubmissions = pgTable('ai_checkup_submissions', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  checkupType: varchar('checkup_type', { length: 100 }).notNull(),
  input: text('input').notNull(),
  result: text('result'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const healthCheck = pgTable('health_check', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  checkType: varchar('check_type', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  result: jsonb('result'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== 质量反馈表 =====================

export const qualityFeedbacks = pgTable('quality_feedbacks', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  targetType: varchar('target_type', { length: 50 }).notNull(),
  targetId: varchar('target_id', { length: 36 }).notNull(),
  rating: integer('rating'),
  feedback: text('feedback'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const qualityInspections = pgTable('quality_inspections', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  agentId: varchar('agent_id', { length: 36 }).notNull(),
  inspectionType: varchar('inspection_type', { length: 100 }).notNull(),
  score: numeric('score'),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const chatCheckResults = pgTable('chat_check_results', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  agentId: varchar('agent_id', { length: 36 }).notNull(),
  chatId: varchar('chat_id', { length: 36 }),
  result: jsonb('result'),
  score: numeric('score'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== 成本表 =====================

export const costRecords = pgTable('cost_records', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  amount: numeric('amount').notNull(),
  description: text('description'),
  recordedAt: timestamp('recorded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const costBaselines = pgTable('cost_baselines', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  baselineAmount: numeric('baseline_amount').notNull(),
  alertThreshold: numeric('alert_threshold'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const costAlertReviews = pgTable('cost_alert_reviews', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  costRecordId: varchar('cost_record_id', { length: 36 }).notNull(),
  reviewedBy: varchar('reviewed_by', { length: 36 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== 财务表 =====================

export const paymentOrders = pgTable('payment_orders', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  orderNo: varchar('order_no', { length: 50 }).notNull(),
  plan: varchar('plan', { length: 50 }).notNull(),
  amount: numeric('amount').notNull(),
  period: varchar('period', { length: 50 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }),
  screenshotUrl: text('screenshot_url'),
  status: varchar('status', { length: 50 }).default('pending'),
  remark: text('remark'),
  confirmedBy: varchar('confirmed_by', { length: 36 }),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  plan: varchar('plan', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('active'),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const rechargeLogs = pgTable('recharge_logs', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  amount: numeric('amount').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const businessRecords = pgTable('business_records', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  amount: numeric('amount'),
  description: text('description'),
  recordedAt: timestamp('recorded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cashFlowRecords = pgTable('cash_flow_records', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  amount: numeric('amount').notNull(),
  category: varchar('category', { length: 100 }),
  description: text('description'),
  recordedAt: timestamp('recorded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const financeRecords = pgTable('finance_records', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  amount: numeric('amount').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  description: text('description'),
  recordedAt: timestamp('recorded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== 团队表 =====================

export const teams = pgTable('teams', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  leaderId: varchar('leader_id', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const invitations = pgTable('invitations', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  email: text('email').notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: varchar('invited_by', { length: 36 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  token: varchar('token', { length: 255 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== 入职表 =====================

export const onboardingTasks = pgTable('onboarding_tasks', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  sortOrder: integer('sort_order').default(0),
  isRequired: boolean('is_required').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const onboardingRecords = pgTable('onboarding_records', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  agentId: varchar('agent_id', { length: 36 }).notNull(),
  taskId: varchar('task_id', { length: 36 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== 通知表 =====================

export const notifications = pgTable('notifications', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  title: text('title').notNull(),
  content: text('content'),
  isRead: boolean('is_read').default(false),
  link: text('link'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== 日程表 =====================

export const schedules = pgTable('schedules', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  type: varchar('type', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== 兑换码表 =====================

export const redemptionCodes = pgTable('redemption_codes', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: varchar('code', { length: 100 }).notNull(),
  plan: varchar('plan', { length: 50 }).notNull(),
  period: varchar('period', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('unused'),
  usedBy: varchar('used_by', { length: 36 }),
  usedAt: timestamp('used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== 客户记录表 =====================

export const customerRecords = pgTable('customer_records', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  agentId: varchar('agent_id', { length: 36 }),
  customerName: varchar('customer_name', { length: 255 }),
  customerPhone: varchar('customer_phone', { length: 50 }),
  customerWechat: varchar('customer_wechat', { length: 100 }),
  query: text('query'),
  result: text('result'),
  category: varchar('category', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== 每日练习表 =====================

export const dailyPractice = pgTable('daily_practice', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  question: text('question').notNull(),
  answer: text('answer'),
  isCorrect: boolean('is_correct'),
  score: integer('score'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== 知识库表 =====================

export const customKnowledge = pgTable('custom_knowledge', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 100 }),
  tags: text('tags'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const industryKnowledge = pgTable('industry_knowledge', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 100 }),
  tags: text('tags'),
  isPreset: boolean('is_preset').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const knowledgeNotes = pgTable('knowledge_notes', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  knowledgeId: varchar('knowledge_id', { length: 36 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== 审计日志表 =====================

export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }),
  userId: varchar('user_id', { length: 36 }),
  action: varchar('action', { length: 100 }).notNull(),
  targetType: varchar('target_type', { length: 100 }),
  targetId: varchar('target_id', { length: 36 }),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== 用户统计表 =====================

export const userStats = pgTable('user_stats', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 }).notNull(),
  statType: varchar('stat_type', { length: 100 }).notNull(),
  statValue: varchar('stat_value', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ===================== 活动日志表 =====================

export const activityLogs = pgTable('activity_logs', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }),
  userId: varchar('user_id', { length: 36 }),
  action: varchar('action', { length: 100 }).notNull(),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== 会话表 =====================

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== 报表表 =====================

export const reports = pgTable('reports', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  period: varchar('period', { length: 100 }).notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const weeklyReports = pgTable('weekly_reports', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  weekStart: timestamp('week_start', { withTimezone: true }).notNull(),
  weekEnd: timestamp('week_end', { withTimezone: true }).notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const monthlyReports = pgTable('monthly_reports', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  month: varchar('month', { length: 7 }).notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const dailyReports = pgTable('daily_reports', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== 其他辅助表 =====================

export const profiles = pgTable('profiles', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 }).notNull(),
  avatarUrl: text('avatar_url'),
  nickname: text('nickname'),
  preferences: jsonb('preferences'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const lessonFeedback = pgTable('lesson_feedback', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  lessonId: varchar('lesson_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  rating: integer('rating'),
  feedback: text('feedback'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const courseProgress = pgTable('course_progress', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  courseId: varchar('course_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  progress: integer('progress').default(0),
  completed: boolean('completed').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const managementPlans = pgTable('management_plans', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  title: text('title').notNull(),
  content: text('content'),
  status: varchar('status', { length: 50 }).default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const wrongQuestions = pgTable('wrong_questions', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 }).notNull(),
  questionId: varchar('question_id', { length: 36 }).notNull(),
  count: integer('count').default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable('orders', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  orderNo: varchar('order_no', { length: 50 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  amount: numeric('amount').notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 导出所有表
export const tables = {
  companies,
  users,
  agents,
  kpiSchemes,
  kpiAssessments,
  kpiAssessmentDetails,
  kpiPlans,
  kpiRecords,
  phraseLibrary,
  sopTemplates,
  workOrders,
  courses,
  courseLessons,
  courseHighlights,
  learningRecords,
  trainingProgress,
  productProfiles,
  aiChatHistory,
  aiCheckupSubmissions,
  healthCheck,
  qualityFeedbacks,
  qualityInspections,
  chatCheckResults,
  costRecords,
  costBaselines,
  costAlertReviews,
  paymentOrders,
  subscriptions,
  rechargeLogs,
  businessRecords,
  cashFlowRecords,
  financeRecords,
  teams,
  invitations,
  onboardingTasks,
  onboardingRecords,
  notifications,
  schedules,
  redemptionCodes,
  customerRecords,
  dailyPractice,
  customKnowledge,
  industryKnowledge,
  knowledgeNotes,
  auditLogs,
  userStats,
  activityLogs,
  sessions,
  reports,
  weeklyReports,
  monthlyReports,
  dailyReports,
  profiles,
  lessonFeedback,
  courseProgress,
  managementPlans,
  wrongQuestions,
  orders,
};
