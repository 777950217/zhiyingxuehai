-- ==========================================
-- P1 业务表 - 数据库迁移
-- 创建时间: 2026-06-11
-- ==========================================

-- 1. work_orders 工单表
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  user_id UUID,
  order_no TEXT UNIQUE,
  customer_name TEXT,
  customer_phone TEXT,
  product_model TEXT,
  issue_type TEXT CHECK (issue_type IN ('installation', 'repair', 'maintenance', 'complaint')),
  status TEXT DEFAULT 'pending', -- pending/processing/completed/canceled
  priority TEXT DEFAULT 'normal', -- low/normal/high/urgent
  assigned_to UUID,
  description TEXT,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_work_orders_company ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_user ON work_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);

-- 2. orders 订单表
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  user_id UUID,
  order_no TEXT UNIQUE,
  customer_name TEXT,
  customer_phone TEXT,
  product_name TEXT,
  product_model TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2),
  total_amount DECIMAL(12,2),
  status TEXT DEFAULT 'pending', -- pending/paid/shipped/delivered/returned
  payment_method TEXT CHECK (payment_method IN ('bank', 'alipay', 'wechat', 'cash')),
  shipping_address TEXT,
  tracking_no TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_company ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 3. communications 客服沟通表
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  user_id UUID,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  channel TEXT CHECK (channel IN ('wechat', 'phone', 'email', 'platform')),
  content TEXT,
  response TEXT,
  sentiment TEXT DEFAULT 'neutral', -- positive/neutral/negative
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_communications_company ON communications(company_id);
CREATE INDEX IF NOT EXISTS idx_communications_user ON communications(user_id);
CREATE INDEX IF NOT EXISTS idx_communications_order ON communications(order_id);
CREATE INDEX IF NOT EXISTS idx_communications_work_order ON communications(work_order_id);

-- 4. parts_claims 配件申领表
CREATE TABLE IF NOT EXISTS parts_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  user_id UUID,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  part_name TEXT,
  part_code TEXT,
  quantity INTEGER DEFAULT 1,
  reason TEXT,
  status TEXT DEFAULT 'pending', -- pending/approved/shipped/received
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parts_claims_company ON parts_claims(company_id);
CREATE INDEX IF NOT EXISTS idx_parts_claims_work_order ON parts_claims(work_order_id);
CREATE INDEX IF NOT EXISTS idx_parts_claims_status ON parts_claims(status);

-- 5. dispatches 上门派单表
CREATE TABLE IF NOT EXISTS dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  technician_id UUID,
  technician_name TEXT,
  scheduled_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled', -- scheduled/arrived/completed/canceled
  service_type TEXT CHECK (service_type IN ('installation', 'repair', 'maintenance')),
  signature_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dispatches_company ON dispatches(company_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_work_order ON dispatches(work_order_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_technician ON dispatches(technician_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_status ON dispatches(status);

-- ==========================================
-- RLS 行级安全策略
-- ==========================================

-- work_orders RLS
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_orders_select" ON work_orders;
CREATE POLICY "work_orders_select" ON work_orders
  FOR SELECT USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));
DROP POLICY IF EXISTS "work_orders_insert" ON work_orders;
CREATE POLICY "work_orders_insert" ON work_orders
  FOR INSERT WITH CHECK (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));
DROP POLICY IF EXISTS "work_orders_update" ON work_orders;
CREATE POLICY "work_orders_update" ON work_orders
  FOR UPDATE USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));
DROP POLICY IF EXISTS "work_orders_delete" ON work_orders;
CREATE POLICY "work_orders_delete" ON work_orders
  FOR DELETE USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

-- orders RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_select" ON orders;
CREATE POLICY "orders_select" ON orders
  FOR SELECT USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));
DROP POLICY IF EXISTS "orders_insert" ON orders;
CREATE POLICY "orders_insert" ON orders
  FOR INSERT WITH CHECK (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));
DROP POLICY IF EXISTS "orders_update" ON orders;
CREATE POLICY "orders_update" ON orders
  FOR UPDATE USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));
DROP POLICY IF EXISTS "orders_delete" ON orders;
CREATE POLICY "orders_delete" ON orders
  FOR DELETE USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

-- communications RLS
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "communications_select" ON communications;
CREATE POLICY "communications_select" ON communications
  FOR SELECT USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));
DROP POLICY IF EXISTS "communications_insert" ON communications;
CREATE POLICY "communications_insert" ON communications
  FOR INSERT WITH CHECK (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));
DROP POLICY IF EXISTS "communications_update" ON communications;
CREATE POLICY "communications_update" ON communications
  FOR UPDATE USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

-- parts_claims RLS
ALTER TABLE parts_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parts_claims_select" ON parts_claims;
CREATE POLICY "parts_claims_select" ON parts_claims
  FOR SELECT USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));
DROP POLICY IF EXISTS "parts_claims_insert" ON parts_claims;
CREATE POLICY "parts_claims_insert" ON parts_claims
  FOR INSERT WITH CHECK (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));
DROP POLICY IF EXISTS "parts_claims_update" ON parts_claims;
CREATE POLICY "parts_claims_update" ON parts_claims
  FOR UPDATE USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

-- dispatches RLS
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dispatches_select" ON dispatches;
CREATE POLICY "dispatches_select" ON dispatches
  FOR SELECT USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));
DROP POLICY IF EXISTS "dispatches_insert" ON dispatches;
CREATE POLICY "dispatches_insert" ON dispatches
  FOR INSERT WITH CHECK (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));
DROP POLICY IF EXISTS "dispatches_update" ON dispatches;
CREATE POLICY "dispatches_update" ON dispatches
  FOR UPDATE USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

-- ==========================================
-- updated_at 触发器
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- work_orders
DROP TRIGGER IF EXISTS update_work_orders_updated_at ON work_orders;
CREATE TRIGGER update_work_orders_updated_at
BEFORE UPDATE ON work_orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- orders
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- parts_claims
DROP TRIGGER IF EXISTS update_parts_claims_updated_at ON parts_claims;
CREATE TRIGGER update_parts_claims_updated_at
BEFORE UPDATE ON parts_claims
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- dispatches
DROP TRIGGER IF EXISTS update_dispatches_updated_at ON dispatches;
CREATE TRIGGER update_dispatches_updated_at
BEFORE UPDATE ON dispatches
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'P1 业务表创建完成！' AS result;
