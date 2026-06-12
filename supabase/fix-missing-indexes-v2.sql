-- ============================================
-- P0-1修复：添加缺失的数据库索引（修正版 v2）
-- 创建时间：2026-06-07
-- 基于实际表结构修正列名
-- ============================================

-- ============================================
-- 1. users 表索引（用户表，高频查询）
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON public.users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- ============================================
-- 2. companies 表索引（公司表，高频查询）
-- ============================================
CREATE INDEX IF NOT EXISTS idx_companies_plan ON public.companies(plan);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON public.companies(created_at DESC);

-- ============================================
-- 3. courses 表索引（修正：is_published -> is_preset）
-- ============================================
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_is_preset ON public.courses(is_preset);  -- 修正列名
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON public.courses(created_at DESC);

-- ============================================
-- 4. user_course_progress 表索引（用户课程进度，高频查询）
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_course_progress_user_id ON public.user_course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_progress_course_id ON public.user_course_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_user_course_progress_user_course ON public.user_course_progress(user_id, course_id);

-- ============================================
-- 5. ai_usage_logs 表索引（AI使用日志，已创建但确保完整）
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created ON public.ai_usage_logs(user_id, created_at);

-- ============================================
-- 6. after_sales_workflows 表索引（售后流程）
-- ============================================
CREATE INDEX IF NOT EXISTS idx_after_sales_workflows_company_id ON public.after_sales_workflows(company_id);
CREATE INDEX IF NOT EXISTS idx_after_sales_workflows_created_at ON public.after_sales_workflows(created_at DESC);

-- ============================================
-- 7. company_business_data 表索引（企业业务数据）
-- ============================================
CREATE INDEX IF NOT EXISTS idx_company_business_data_company_id ON public.company_business_data(company_id);
CREATE INDEX IF NOT EXISTS idx_company_business_data_data_type ON public.company_business_data(company_id, data_type);

-- ============================================
-- 8. product_videos 表索引（产品视频）
-- ============================================
CREATE INDEX IF NOT EXISTS idx_product_videos_company_id ON public.product_videos(company_id);
CREATE INDEX IF NOT EXISTS idx_product_videos_category ON public.product_videos(category);

-- ============================================
-- 执行完成提示
-- ============================================
-- 验证：SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;
