-- 扩展 finance_daily 表 - 添加15项成本字段
ALTER TABLE IF EXISTS finance_daily
ADD COLUMN IF NOT EXISTS commission decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_payout decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_fee decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS insurance_fee decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS damage_cost decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS install_fee decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS repair_fee decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS parts_fee_sold decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS parts_fee_gift decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS parts_fee_warranty decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS after_sales_fee decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS warranty_shipping decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ad_spend decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS warehouse_fee decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_profit decimal(12,2) DEFAULT 0;

-- 新建 finance_cost_item 表
CREATE TABLE IF NOT EXISTS finance_cost_item (
  id varchar(36) PRIMARY KEY,
  company_id varchar(36) NOT NULL REFERENCES companies(id),
  date date NOT NULL,
  cost_type text NOT NULL,
  amount decimal(12,2) NOT NULL,
  order_id varchar(36),
  description text,
  created_at timestamp DEFAULT now()
);

-- 为 finance_cost_item 添加索引
CREATE INDEX IF NOT EXISTS idx_finance_cost_item_company_date ON finance_cost_item(company_id, date);
CREATE INDEX IF NOT EXISTS idx_finance_cost_item_company_type ON finance_cost_item(company_id, cost_type);

-- 启用 RLS
ALTER TABLE finance_cost_item ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
DROP POLICY IF EXISTS "公司级隔离-finance_cost_item" ON finance_cost_item;
CREATE POLICY "公司级隔离-finance_cost_item" ON finance_cost_item
FOR ALL USING (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));

DROP POLICY IF EXISTS "公司级隔离-finance_cost_item_insert" ON finance_cost_item;
CREATE POLICY "公司级隔离-finance_cost_item_insert" ON finance_cost_item
FOR INSERT WITH CHECK (company_id::text = (SELECT company_id::text FROM users WHERE id::text = auth.uid()::text));