-- 创建AI使用日志表（修复P0-1：AI使用次数跟踪从localStorage迁移到服务器端）
-- 创建时间：2026-06-06
-- 目的：跟踪每次AI API调用，用于服务器端使用次数限制

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT, -- TEXT类型，兼容companies.id的VARCHAR类型
  api_endpoint TEXT NOT NULL,
  query_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created ON ai_usage_logs(user_id, created_at);

-- 添加表注释
COMMENT ON TABLE ai_usage_logs IS 'AI使用日志表 - 跟踪每次AI API调用，用于服务器端使用次数限制';
COMMENT ON COLUMN ai_usage_logs.user_id IS '用户ID';
COMMENT ON COLUMN ai_usage_logs.company_id IS '公司ID';
COMMENT ON COLUMN ai_usage_logs.api_endpoint IS 'API端点路径';
COMMENT ON COLUMN ai_usage_logs.query_text IS '用户查询内容（前500字符）';
COMMENT ON COLUMN ai_usage_logs.created_at IS '创建时间';

-- 启用Row Level Security
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的使用日志
DROP POLICY IF EXISTS "Users can view own ai usage logs" ON ai_usage_logs;
CREATE POLICY "Users can view own ai usage logs" 
  ON ai_usage_logs FOR SELECT 
  USING (auth.uid() = user_id);

-- 用户只能插入自己的使用日志（通过API）
DROP POLICY IF EXISTS "Users can insert own ai usage logs" ON ai_usage_logs;
CREATE POLICY "Users can insert own ai usage logs" 
  ON ai_usage_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 服务角色（后端）可以完全访问
DROP POLICY IF EXISTS "Service role has full access to ai_usage_logs" ON ai_usage_logs;
CREATE POLICY "Service role has full access to ai_usage_logs" 
  ON ai_usage_logs FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 添加updated_at自动更新触发器
CREATE OR REPLACE FUNCTION update_ai_usage_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_usage_logs_updated_at
  BEFORE UPDATE ON ai_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_usage_logs_updated_at();
