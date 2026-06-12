-- ==========================================
-- 创建知识管理模块数据表
-- 创建时间: 2026-06-13
-- ==========================================

CREATE TABLE IF NOT EXISTS knowledge_guides (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar(36),
  company_id varchar(36) NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  tags text[],
  views integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(company_id, title)
);

ALTER TABLE IF EXISTS knowledge_guides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "knowledge_guides_company_isolation" ON knowledge_guides;
CREATE POLICY "knowledge_guides_company_isolation" ON knowledge_guides
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_knowledge_guides_company ON knowledge_guides(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_guides_category ON knowledge_guides(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_guides_tags ON knowledge_guides USING gin(tags);

CREATE TABLE IF NOT EXISTS phrase_library (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar(36),
  company_id varchar(36) NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  source text DEFAULT '手动录入',
  tags text[],
  favorites integer DEFAULT 0,
  likes integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE IF EXISTS phrase_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "phrase_library_company_isolation" ON phrase_library;
CREATE POLICY "phrase_library_company_isolation" ON phrase_library
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_phrase_library_company ON phrase_library(company_id);
CREATE INDEX IF NOT EXISTS idx_phrase_library_category ON phrase_library(category);
CREATE INDEX IF NOT EXISTS idx_phrase_library_tags ON phrase_library USING gin(tags);

CREATE TABLE IF NOT EXISTS sop_optimization_log (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar(36),
  company_id varchar(36) NOT NULL,
  user_id varchar(36) NOT NULL,
  optimization_type text NOT NULL,
  input_content text,
  output_content text,
  suggestions text[],
  saved boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

ALTER TABLE IF EXISTS sop_optimization_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sop_optimization_log_company_isolation" ON sop_optimization_log;
CREATE POLICY "sop_optimization_log_company_isolation" ON sop_optimization_log
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_sop_optimization_log_company ON sop_optimization_log(company_id);
CREATE INDEX IF NOT EXISTS idx_sop_optimization_log_user ON sop_optimization_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sop_optimization_log_type ON sop_optimization_log(optimization_type);

DROP TRIGGER IF EXISTS update_knowledge_guides_updated_at ON knowledge_guides;
CREATE TRIGGER update_knowledge_guides_updated_at
BEFORE UPDATE ON knowledge_guides
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_phrase_library_updated_at ON phrase_library;
CREATE TRIGGER update_phrase_library_updated_at
BEFORE UPDATE ON phrase_library
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT '知识管理模块数据表创建完成！' AS result;