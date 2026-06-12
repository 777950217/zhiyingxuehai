export interface BalanceSheetItem {
  name: string;
  value: number;
  previousValue?: number;
  children?: BalanceSheetItem[];
  total?: number;
}

export interface BalanceSheetCategory {
  title: string;
  items: BalanceSheetItem[];
  total: number;
  previousTotal?: number;
}

export interface BalanceSheetData {
  period: string;
  periodType: 'month' | 'quarter' | 'year';
  assets: BalanceSheetCategory;
  liabilities: BalanceSheetCategory;
  equity: BalanceSheetCategory;
}

export interface ComparisonData {
  type: 'month' | 'year' | 'none';
  previousPeriod: string;
  changes: {
    assets: { amount: number; percentage: number };
    liabilities: { amount: number; percentage: number };
    equity: { amount: number; percentage: number };
  };
}

export interface BalanceSheetQueryParams {
  companyId: string;
  period?: string;
  periodType?: 'month' | 'quarter' | 'year';
  compareType?: 'month' | 'year' | 'none';
}

export interface BalanceSheetCreateParams {
  companyId: string;
  period: string;
  periodType?: 'month' | 'quarter' | 'year';
  data: {
    assets: {
      current: Record<string, number>;
      nonCurrent: Record<string, number>;
    };
    liabilities: {
      current: Record<string, number>;
      nonCurrent: Record<string, number>;
    };
    equity: Record<string, number>;
  };
}

export interface BalanceSheetResponse {
  success: boolean;
  data?: BalanceSheetData;
  comparison?: ComparisonData;
  error?: string;
}

export interface ProfitFunnelItem {
  stage: string;
  amount: number;
  percentage: number;
  previousAmount?: number;
  previousPercentage?: number;
}

export interface ProfitFunnelData {
  period: string;
  periodType: 'month' | 'quarter' | 'year';
  totalRevenue: number;
  items: ProfitFunnelItem[];
}

export interface ProfitFunnelResponse {
  success: boolean;
  data?: ProfitFunnelData;
  error?: string;
}

export interface CostBaselineItem {
  category: string;
  budget: number;
  actual: number;
  variance: number;
  variancePercentage: number;
}

export interface CostBaselineData {
  period: string;
  periodType: 'month' | 'quarter' | 'year';
  totalBudget: number;
  totalActual: number;
  items: CostBaselineItem[];
}

export interface CostBaselineResponse {
  success: boolean;
  data?: CostBaselineData;
  error?: string;
}