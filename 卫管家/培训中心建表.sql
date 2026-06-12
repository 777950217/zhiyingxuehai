-- =============================================
-- 卫管家 - 培训中心建表（三Tab版本）
-- =============================================

-- 1. 培训课程表
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50) DEFAULT '基础培训',
  description TEXT DEFAULT '',
  feishu_doc_url VARCHAR(500) DEFAULT '',
  is_preset BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE courses IS '培训课程表';
COMMENT ON COLUMN courses.category IS '分类: 基础培训/产品知识/售前技能/售后技能/大促专题';

-- 2. 培训进度表（学员-课程关联）
CREATE TABLE IF NOT EXISTS training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID,
  module_id VARCHAR(100) NOT NULL,
  current_step INT DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, module_id)
);
COMMENT ON TABLE training_progress IS '培训进度表';

-- 3. 考试记录表
CREATE TABLE IF NOT EXISTS exam_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID,
  score INT DEFAULT 0,
  answers JSONB DEFAULT '[]'::jsonb,
  passed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE exam_records IS '考试记录表';

-- 4. 入职记录表
CREATE TABLE IF NOT EXISTS onboarding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  agent_id UUID,
  user_name VARCHAR(100) DEFAULT '',
  step1_status VARCHAR(20) DEFAULT '待分配',
  step2_status VARCHAR(20) DEFAULT '未开始',
  step3_status VARCHAR(20) DEFAULT '未开始',
  step4_status VARCHAR(20) DEFAULT '未开始',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE onboarding_records IS '入职记录表';
COMMENT ON COLUMN onboarding_records.step1_status IS '分配账号: 待分配/已完成';
COMMENT ON COLUMN onboarding_records.step2_status IS '完成课程: 未开始/进行中/已完成/通过';
COMMENT ON COLUMN onboarding_records.step3_status IS '跟班实习: 未开始/进行中/已完成';
COMMENT ON COLUMN onboarding_records.step4_status IS '考核上岗: 未开始/通过/未通过';

-- =============================================
-- 索引
-- =============================================
CREATE INDEX IF NOT EXISTS idx_courses_company ON courses(company_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_user ON training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_company ON training_progress(company_id);
CREATE INDEX IF NOT EXISTS idx_exam_records_user ON exam_records(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_records_company ON onboarding_records(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_records_user ON onboarding_records(user_id);
