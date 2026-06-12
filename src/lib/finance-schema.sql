-- 每日盈亏表
CREATE TABLE IF NOT EXISTS daily_profit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  date DATE NOT NULL,
  revenue NUMERIC(12, 2) DEFAULT 0,
  expense NUMERIC(12, 2) DEFAULT 0,
  profit NUMERIC(12, 2) DEFAULT 0,
  orders INTEGER DEFAULT 0,
  avg_order_value NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, date)
);

-- 应收管理表
CREATE TABLE IF NOT EXISTS accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_id TEXT,
  order_no TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 应付管理表
CREATE TABLE IF NOT EXISTS accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_id TEXT,
  invoice_no TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 退款赔付表
CREATE TABLE IF NOT EXISTS refund_compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  order_no TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approval_id TEXT,
  approver_id TEXT,
  approver_name TEXT,
  approval_status TEXT DEFAULT 'pending',
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 财务配置表
CREATE TABLE IF NOT EXISTS finance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  refund_rate_threshold NUMERIC(5, 2) DEFAULT 15,
  ad_roi_threshold NUMERIC(5, 2) DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id)
);

-- 广告投流表
CREATE TABLE IF NOT EXISTS advertising_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  spend NUMERIC(12, 2) DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 成本管控表
CREATE TABLE IF NOT EXISTS cost_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  category TEXT NOT NULL,
  budget NUMERIC(12, 2) DEFAULT 0,
  actual NUMERIC(12, 2) DEFAULT 0,
  variance NUMERIC(12, 2) DEFAULT 0,
  month TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, category, month)
);

-- 仓储履约表
CREATE TABLE IF NOT EXISTS warehouse_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  unit_cost NUMERIC(10, 2) DEFAULT 0,
  total_cost NUMERIC(12, 2) DEFAULT 0,
  location TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 月度结账表
CREATE TABLE IF NOT EXISTS monthly_close (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  status TEXT DEFAULT 'open',
  total_revenue NUMERIC(12, 2) DEFAULT 0,
  total_expense NUMERIC(12, 2) DEFAULT 0,
  net_profit NUMERIC(12, 2) DEFAULT 0,
  close_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, year, month)
);

-- 经营财务分析表
CREATE TABLE IF NOT EXISTS financial_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  revenue NUMERIC(12, 2) DEFAULT 0,
  expense NUMERIC(12, 2) DEFAULT 0,
  profit NUMERIC(12, 2) DEFAULT 0,
  profit_margin NUMERIC(8, 2) DEFAULT 0,
  roi NUMERIC(8, 2) DEFAULT 0,
  cash_flow NUMERIC(12, 2) DEFAULT 0,
  analysis_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, year, month)
);

-- 数据导入日志表
CREATE TABLE IF NOT EXISTS data_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  import_type TEXT NOT NULL,
  rows_imported INTEGER DEFAULT 0,
  rows_failed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);