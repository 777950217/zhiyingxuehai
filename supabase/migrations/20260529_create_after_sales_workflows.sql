-- P0修复：创建 after_sales_workflows 表，持久化售后攻略数据
-- 执行此SQL在 Supabase SQL Editor 中

CREATE TABLE IF NOT EXISTS after_sales_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_preset BOOLEAN NOT NULL DEFAULT false,
  is_training_material BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: 用户只能访问自己的工作流程
ALTER TABLE after_sales_workflows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own workflows" ON after_sales_workflows;
CREATE POLICY "Users can manage own workflows" ON after_sales_workflows
  FOR ALL USING (auth.uid() = user_id);

-- 索引
CREATE INDEX IF NOT EXISTS idx_after_sales_workflows_user_id ON after_sales_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_after_sales_workflows_category ON after_sales_workflows(category);

-- 注释
COMMENT ON TABLE after_sales_workflows IS '售后攻略工作流程，替代localStorage持久化';
COMMENT ON COLUMN after_sales_workflows.steps IS 'JSON数组：{id, name, description, script, order}';
COMMENT ON COLUMN after_sales_workflows.results IS 'JSON数组：{id, label, type, action, script}';
