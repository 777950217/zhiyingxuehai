export interface DailyProfit {
  id: string;
  company_id: string;
  date: string;
  revenue: number;
  expense: number;
  profit: number;
  orders: number;
  avg_order_value: number;
  created_at: string;
}

export interface AccountsReceivable {
  id: string;
  company_id: string;
  customer_name: string;
  customer_id: string;
  order_no: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  created_at: string;
  updated_at: string;
}

export interface AccountsPayable {
  id: string;
  company_id: string;
  supplier_name: string;
  supplier_id: string;
  invoice_no: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  created_at: string;
  updated_at: string;
}

export interface RefundCompensation {
  id: string;
  company_id: string;
  order_no: string;
  type: 'refund' | 'compensation' | 'return';
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approval_id?: string;
  approver_id?: string;
  approver_name?: string;
  approval_status?: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdvertisingRecord {
  id: string;
  company_id: string;
  platform: string;
  campaign_name: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  date: string;
  created_at: string;
}

export interface CostControl {
  id: string;
  company_id: string;
  category: string;
  budget: number;
  actual: number;
  variance: number;
  month: string;
  created_at: string;
}

export interface WarehouseRecord {
  id: string;
  company_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  location: string;
  last_updated: string;
  created_at: string;
}

export interface MonthlyClose {
  id: string;
  company_id: string;
  year: number;
  month: number;
  status: 'open' | 'closing' | 'closed';
  total_revenue: number;
  total_expense: number;
  net_profit: number;
  close_date?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialAnalysis {
  id: string;
  company_id: string;
  year: number;
  month: number;
  revenue: number;
  expense: number;
  profit: number;
  profit_margin: number;
  roi: number;
  cash_flow: number;
  analysis_note?: string;
  created_at: string;
}

export interface DataImportLog {
  id: string;
  company_id: string;
  file_name: string;
  import_type: string;
  rows_imported: number;
  rows_failed: number;
  status: 'success' | 'partial' | 'failed';
  error_message?: string;
  created_at: string;
}