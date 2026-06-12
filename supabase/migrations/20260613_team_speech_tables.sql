-- ==========================================
-- 创建团队话术模块数据表
-- 创建时间: 2026-06-13
-- ==========================================

CREATE TABLE IF NOT EXISTS speech_push_log (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar(36),
  company_id varchar(36) NOT NULL,
  phrase_id varchar(36) NOT NULL,
  phrase_title text NOT NULL,
  pushed_by varchar(36) NOT NULL,
  pushed_by_name text NOT NULL,
  pushed_at timestamp DEFAULT now(),
  status text DEFAULT 'pending',
  created_at timestamp DEFAULT now()
);

ALTER TABLE IF EXISTS speech_push_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "speech_push_log_company_isolation" ON speech_push_log;
CREATE POLICY "speech_push_log_company_isolation" ON speech_push_log
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_speech_push_log_company ON speech_push_log(company_id);
CREATE INDEX IF NOT EXISTS idx_speech_push_log_phrase ON speech_push_log(phrase_id);
CREATE INDEX IF NOT EXISTS idx_speech_push_log_status ON speech_push_log(status);

CREATE TABLE IF NOT EXISTS speech_push_confirm (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar(36),
  push_log_id varchar(36) NOT NULL,
  user_id varchar(36) NOT NULL,
  user_name text NOT NULL,
  confirmed boolean DEFAULT false,
  confirmed_at timestamp,
  created_at timestamp DEFAULT now(),
  UNIQUE(push_log_id, user_id)
);

ALTER TABLE IF EXISTS speech_push_confirm ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "speech_push_confirm_company_isolation" ON speech_push_confirm;
CREATE POLICY "speech_push_confirm_company_isolation" ON speech_push_confirm
  FOR ALL USING ((SELECT company_id::text FROM speech_push_log WHERE id = push_log_id) = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_speech_push_confirm_push ON speech_push_confirm(push_log_id);
CREATE INDEX IF NOT EXISTS idx_speech_push_confirm_user ON speech_push_confirm(user_id);
CREATE INDEX IF NOT EXISTS idx_speech_push_confirm_confirmed ON speech_push_confirm(confirmed);

CREATE TABLE IF NOT EXISTS speech_usage_log (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar(36),
  company_id varchar(36) NOT NULL,
  phrase_id varchar(36) NOT NULL,
  phrase_title text NOT NULL,
  user_id varchar(36) NOT NULL,
  user_name text NOT NULL,
  used_at timestamp DEFAULT now(),
  conversation_id varchar(36),
  created_at timestamp DEFAULT now()
);

ALTER TABLE IF EXISTS speech_usage_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "speech_usage_log_company_isolation" ON speech_usage_log;
CREATE POLICY "speech_usage_log_company_isolation" ON speech_usage_log
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_speech_usage_log_company ON speech_usage_log(company_id);
CREATE INDEX IF NOT EXISTS idx_speech_usage_log_phrase ON speech_usage_log(phrase_id);
CREATE INDEX IF NOT EXISTS idx_speech_usage_log_user ON speech_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_speech_usage_log_date ON speech_usage_log(used_at);

SELECT '团队话术模块数据表创建完成！' AS result;