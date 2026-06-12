-- receivables 应收账款表
CREATE TABLE IF NOT EXISTS receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  user_id UUID,
  customer_name TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'overdue', 'paid')) DEFAULT 'pending',
  invoice_no TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_receivables_company ON receivables(company_id);
CREATE INDEX idx_receivables_customer ON receivables(customer_name);
CREATE INDEX idx_receivables_status ON receivables(status);
CREATE INDEX idx_receivables_due ON receivables(due_date);

-- payables 应付账款表
CREATE TABLE IF NOT EXISTS payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  supplier_name TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'overdue', 'paid')) DEFAULT 'pending',
  invoice_no TEXT,
  payment_method TEXT CHECK (payment_method IN ('bank', 'alipay', 'wechat', 'cash', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payables_company ON payables(company_id);
CREATE INDEX idx_payables_supplier ON payables(supplier_name);
CREATE INDEX idx_payables_status ON payables(status);
CREATE INDEX idx_payables_due ON payables(due_date);

-- refunds 退款申请表
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  user_id UUID,
  user_name TEXT,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'processing')) DEFAULT 'pending',
  within_7_days BOOLEAN DEFAULT true,
  no_workorder BOOLEAN DEFAULT true,
  no_data_import BOOLEAN DEFAULT true,
  no_ai_usage BOOLEAN DEFAULT true,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_refunds_company ON refunds(company_id);
CREATE INDEX idx_refunds_user ON refunds(user_id);
CREATE INDEX idx_refunds_status ON refunds(status);

-- ai_usage_log AI使用日志表
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  user_id UUID,
  feature TEXT NOT NULL CHECK (feature IN ('ai_assistant', 'emergency', 'inspection', 'other')),
  usage_count INTEGER DEFAULT 1,
  cost DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ai_usage_company ON ai_usage_log(company_id);
CREATE INDEX idx_ai_usage_user ON ai_usage_log(user_id);
CREATE INDEX idx_ai_usage_created ON ai_usage_log(created_at);

-- RLS 行级安全
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "公司级隔离-receivables" ON receivables;
CREATE POLICY "公司级隔离-receivables" ON receivables FOR ALL
  USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

DROP POLICY IF EXISTS "公司级隔离-payables" ON payables;
CREATE POLICY "公司级隔离-payables" ON payables FOR ALL
  USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

DROP POLICY IF EXISTS "公司级隔离-refunds" ON refunds;
CREATE POLICY "公司级隔离-refunds" ON refunds FOR ALL
  USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

DROP POLICY IF EXISTS "公司级隔离-ai_usage_log" ON ai_usage_log;
CREATE POLICY "公司级隔离-ai_usage_log" ON ai_usage_log FOR ALL
  USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

-- updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_receivables_updated_at ON receivables;
CREATE TRIGGER update_receivables_updated_at
BEFORE UPDATE ON receivables
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payables_updated_at ON payables;
CREATE TRIGGER update_payables_updated_at
BEFORE UPDATE ON payables
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_refunds_updated_at ON refunds;
CREATE TRIGGER update_refunds_updated_at
BEFORE UPDATE ON refunds
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
