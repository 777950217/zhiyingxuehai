-- ==========================================
-- P0-8 投诉升级功能 - 数据库迁移
-- ==========================================

-- 创建投诉升级表
CREATE TABLE IF NOT EXISTS public.complaint_escalations (
  id SERIAL PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  customer_name TEXT,
  customer_phone TEXT,
  order_id TEXT,
  issue_type TEXT NOT NULL, -- 投诉类型（态度/质量/物流/价格/其他）
  issue_description TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- low/normal/high/urgent
  status TEXT DEFAULT 'pending', -- pending(待处理)/processing(处理中)/resolved(已解决)/closed(已关闭)
  evidence_urls TEXT[], -- 证据图片URL数组
  resolution_notes TEXT, -- 处理结果说明
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_complaint_company ON public.complaint_escalations(company_id);
CREATE INDEX IF NOT EXISTS idx_complaint_status ON public.complaint_escalations(status);
CREATE INDEX IF NOT EXISTS idx_complaint_assigned ON public.complaint_escalations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaint_created ON public.complaint_escalations(created_by);
CREATE INDEX IF NOT EXISTS idx_complaint_time ON public.complaint_escalations(created_at DESC);

-- RLS
ALTER TABLE public.complaint_escalations ENABLE ROW LEVEL SECURITY;

-- 查询策略：同企业用户可见
DROP POLICY IF EXISTS "complaint_select_policy" ON public.complaint_escalations;
CREATE POLICY "complaint_select_policy" ON public.complaint_escalations
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 插入策略：任意企业员工可提交
DROP POLICY IF EXISTS "complaint_insert_policy" ON public.complaint_escalations;
CREATE POLICY "complaint_insert_policy" ON public.complaint_escalations
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid() AND status = 'active'
    )
  );

-- 更新策略：主管/经理可更新分配和处理结果
DROP POLICY IF EXISTS "complaint_update_policy" ON public.complaint_escalations;
CREATE POLICY "complaint_update_policy" ON public.complaint_escalations
  FOR UPDATE USING (
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    auth.uid() IN (
      SELECT id FROM public.users WHERE company_id = complaint_escalations.company_id AND role IN ('admin', 'manager', 'super_admin')
    )
  );

-- 完成提示
SELECT 'P0-8 投诉升级表创建完成！' AS result;
