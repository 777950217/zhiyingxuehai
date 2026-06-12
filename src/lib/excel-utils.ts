import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export interface ImportResult {
  success: boolean;
  data: any[];
  errors: string[];
  rowsImported: number;
  rowsFailed: number;
}

export function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

export function validateDailyProfitData(data: any[]): ImportResult {
  const validData: any[] = [];
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    const rowNumber = index + 2;
    const errorsForRow: string[] = [];
    
    if (!row['日期'] && !row['date']) {
      errorsForRow.push('日期不能为空');
    }
    
    const revenue = row['收入'] ?? row['revenue'] ?? 0;
    const expense = row['支出'] ?? row['expense'] ?? 0;
    
    if (typeof revenue !== 'number' || isNaN(revenue)) {
      errorsForRow.push('收入必须是数字');
    }
    
    if (typeof expense !== 'number' || isNaN(expense)) {
      errorsForRow.push('支出必须是数字');
    }
    
    if (errorsForRow.length > 0) {
      errors.push(`第${rowNumber}行: ${errorsForRow.join(', ')}`);
    } else {
      validData.push({
        date: row['日期'] || row['date'],
        revenue: Number(revenue),
        expense: Number(expense),
        profit: Number(revenue) - Number(expense),
        orders: Number(row['订单数'] ?? row['orders'] ?? 0),
        avg_order_value: Number(row['客单价'] ?? row['avg_order_value'] ?? 0)
      });
    }
  });
  
  return {
    success: errors.length === 0,
    data: validData,
    errors,
    rowsImported: validData.length,
    rowsFailed: errors.length
  };
}

export function validateAccountsReceivableData(data: any[]): ImportResult {
  const validData: any[] = [];
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    const rowNumber = index + 2;
    const errorsForRow: string[] = [];
    
    if (!row['客户名称'] && !row['customer_name']) {
      errorsForRow.push('客户名称不能为空');
    }
    
    if (!row['订单编号'] && !row['order_no']) {
      errorsForRow.push('订单编号不能为空');
    }
    
    const amount = row['金额'] ?? row['amount'] ?? 0;
    
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      errorsForRow.push('金额必须是正数');
    }
    
    if (!row['到期日期'] && !row['due_date']) {
      errorsForRow.push('到期日期不能为空');
    }
    
    if (errorsForRow.length > 0) {
      errors.push(`第${rowNumber}行: ${errorsForRow.join(', ')}`);
    } else {
      validData.push({
        customer_name: row['客户名称'] || row['customer_name'],
        customer_id: row['客户ID'] || row['customer_id'] || '',
        order_no: row['订单编号'] || row['order_no'],
        amount: Number(amount),
        due_date: row['到期日期'] || row['due_date'],
        status: row['状态'] || row['status'] || 'pending'
      });
    }
  });
  
  return {
    success: errors.length === 0,
    data: validData,
    errors,
    rowsImported: validData.length,
    rowsFailed: errors.length
  };
}

export function validateAccountsPayableData(data: any[]): ImportResult {
  const validData: any[] = [];
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    const rowNumber = index + 2;
    const errorsForRow: string[] = [];
    
    if (!row['供应商名称'] && !row['supplier_name']) {
      errorsForRow.push('供应商名称不能为空');
    }
    
    if (!row['发票编号'] && !row['invoice_no']) {
      errorsForRow.push('发票编号不能为空');
    }
    
    const amount = row['金额'] ?? row['amount'] ?? 0;
    
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      errorsForRow.push('金额必须是正数');
    }
    
    if (!row['到期日期'] && !row['due_date']) {
      errorsForRow.push('到期日期不能为空');
    }
    
    if (errorsForRow.length > 0) {
      errors.push(`第${rowNumber}行: ${errorsForRow.join(', ')}`);
    } else {
      validData.push({
        supplier_name: row['供应商名称'] || row['supplier_name'],
        supplier_id: row['供应商ID'] || row['supplier_id'] || '',
        invoice_no: row['发票编号'] || row['invoice_no'],
        amount: Number(amount),
        due_date: row['到期日期'] || row['due_date'],
        status: row['状态'] || row['status'] || 'pending'
      });
    }
  });
  
  return {
    success: errors.length === 0,
    data: validData,
    errors,
    rowsImported: validData.length,
    rowsFailed: errors.length
  };
}

export function validateAdvertisingData(data: any[]): ImportResult {
  const validData: any[] = [];
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    const rowNumber = index + 2;
    const errorsForRow: string[] = [];
    
    if (!row['平台'] && !row['platform']) {
      errorsForRow.push('平台不能为空');
    }
    
    if (!row['活动名称'] && !row['campaign_name']) {
      errorsForRow.push('活动名称不能为空');
    }
    
    const spend = row['花费'] ?? row['spend'] ?? 0;
    
    if (typeof spend !== 'number' || isNaN(spend) || spend < 0) {
      errorsForRow.push('花费必须是非负数');
    }
    
    if (!row['投放日期'] && !row['date']) {
      errorsForRow.push('投放日期不能为空');
    }
    
    if (errorsForRow.length > 0) {
      errors.push(`第${rowNumber}行: ${errorsForRow.join(', ')}`);
    } else {
      validData.push({
        platform: row['平台'] || row['platform'],
        campaign_name: row['活动名称'] || row['campaign_name'],
        spend: Number(spend),
        clicks: Number(row['点击量'] ?? row['clicks'] ?? 0),
        impressions: Number(row['展现量'] ?? row['impressions'] ?? 0),
        conversions: Number(row['转化'] ?? row['conversions'] ?? 0),
        date: row['投放日期'] || row['date']
      });
    }
  });
  
  return {
    success: errors.length === 0,
    data: validData,
    errors,
    rowsImported: validData.length,
    rowsFailed: errors.length
  };
}

export function validateRefundCompensationData(data: any[]): ImportResult {
  const validData: any[] = [];
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    const rowNumber = index + 2;
    const errorsForRow: string[] = [];
    
    if (!row['订单编号'] && !row['order_no']) {
      errorsForRow.push('订单编号不能为空');
    }
    
    const type = row['类型'] || row['type'];
    if (!['退款', '赔付', '退货', 'refund', 'compensation', 'return'].includes(type || '')) {
      errorsForRow.push('类型必须是退款、赔付或退货');
    }
    
    const amount = row['金额'] ?? row['amount'] ?? 0;
    
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      errorsForRow.push('金额必须是正数');
    }
    
    if (!row['原因'] && !row['reason']) {
      errorsForRow.push('原因不能为空');
    }
    
    if (errorsForRow.length > 0) {
      errors.push(`第${rowNumber}行: ${errorsForRow.join(', ')}`);
    } else {
      const typeMap: Record<string, string> = {
        '退款': 'refund',
        '赔付': 'compensation',
        '退货': 'return'
      };
      
      validData.push({
        order_no: row['订单编号'] || row['order_no'],
        type: typeMap[type] || type || 'refund',
        amount: Number(amount),
        reason: row['原因'] || row['reason'],
        status: row['状态'] || row['status'] || 'pending'
      });
    }
  });
  
  return {
    success: errors.length === 0,
    data: validData,
    errors,
    rowsImported: validData.length,
    rowsFailed: errors.length
  };
}

export function validateCostControlData(data: any[]): ImportResult {
  const validData: any[] = [];
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    const rowNumber = index + 2;
    const errorsForRow: string[] = [];
    
    if (!row['成本类别'] && !row['category']) {
      errorsForRow.push('成本类别不能为空');
    }
    
    const budget = row['预算'] ?? row['budget'] ?? 0;
    const actual = row['实际'] ?? row['actual'] ?? 0;
    
    if (typeof budget !== 'number' || isNaN(budget) || budget < 0) {
      errorsForRow.push('预算必须是非负数');
    }
    
    if (typeof actual !== 'number' || isNaN(actual) || actual < 0) {
      errorsForRow.push('实际支出必须是非负数');
    }
    
    if (!row['月份'] && !row['month']) {
      errorsForRow.push('月份不能为空');
    }
    
    if (errorsForRow.length > 0) {
      errors.push(`第${rowNumber}行: ${errorsForRow.join(', ')}`);
    } else {
      validData.push({
        category: row['成本类别'] || row['category'],
        budget: Number(budget),
        actual: Number(actual),
        variance: Number(actual) - Number(budget),
        month: row['月份'] || row['month']
      });
    }
  });
  
  return {
    success: errors.length === 0,
    data: validData,
    errors,
    rowsImported: validData.length,
    rowsFailed: errors.length
  };
}

export function validateWarehouseData(data: any[]): ImportResult {
  const validData: any[] = [];
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    const rowNumber = index + 2;
    const errorsForRow: string[] = [];
    
    if (!row['SKU编号'] && !row['sku']) {
      errorsForRow.push('SKU编号不能为空');
    }
    
    if (!row['商品名称'] && !row['product_name']) {
      errorsForRow.push('商品名称不能为空');
    }
    
    const quantity = row['数量'] ?? row['quantity'] ?? 0;
    const unitCost = row['单价'] ?? row['unit_cost'] ?? 0;
    
    if (!Number.isInteger(quantity) || isNaN(quantity) || quantity < 0) {
      errorsForRow.push('数量必须是非负整数');
    }
    
    if (typeof unitCost !== 'number' || isNaN(unitCost) || unitCost < 0) {
      errorsForRow.push('单价必须是非负数');
    }
    
    if (errorsForRow.length > 0) {
      errors.push(`第${rowNumber}行: ${errorsForRow.join(', ')}`);
    } else {
      const qty = Number(quantity);
      const uc = Number(unitCost);
      validData.push({
        sku: row['SKU编号'] || row['sku'],
        product_name: row['商品名称'] || row['product_name'],
        quantity: qty,
        unit_cost: uc,
        total_cost: qty * uc,
        location: row['存放位置'] || row['location'] || ''
      });
    }
  });
  
  return {
    success: errors.length === 0,
    data: validData,
    errors,
    rowsImported: validData.length,
    rowsFailed: errors.length
  };
}

export function exportToExcel(data: any[], sheetName: string, filename: string): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// 基础模板（核心4项：营收、退款、广告花费、采购成本）
export const BASIC_TEMPLATE = [
  { '日期(必填)': '2024-01-01', '营收金额(必填/数字)': 10000, '退款金额(必填/数字)': 500, '广告花费(必填/数字)': 2000, '采购成本(必填/数字)': 3000 },
  { '日期(必填)': '2024-01-02', '营收金额(必填/数字)': 12000, '退款金额(必填/数字)': 800, '广告花费(必填/数字)': 2500, '采购成本(必填/数字)': 3500 },
  { '日期(必填)': '2024-01-03', '营收金额(必填/数字)': 8000, '退款金额(必填/数字)': 300, '广告花费(必填/数字)': 1800, '采购成本(必填/数字)': 2800 },
];

// 补充模板（应收、应付、客户、供应商）
export const SUPPLEMENTARY_TEMPLATE = {
  '应收账款': [
    { '客户名称': '客户A', '客户ID': 'C001', '订单编号': 'DD20240101001', '金额': 10000, '到期日期': '2024-01-15', '状态': '未收款' },
    { '客户名称': '客户B', '客户ID': 'C002', '订单编号': 'DD20240102001', '金额': 5000, '到期日期': '2024-01-20', '状态': '未收款' },
  ],
  '应付账款': [
    { '供应商名称': '供应商A', '供应商ID': 'S001', '发票编号': 'FP20240101001', '金额': 8000, '到期日期': '2024-01-25', '状态': '未付款' },
    { '供应商名称': '供应商B', '供应商ID': 'S002', '发票编号': 'FP20240102001', '金额': 3000, '到期日期': '2024-02-01', '状态': '未付款' },
  ],
  '客户信息': [
    { '客户名称': '客户A', '客户ID': 'C001', '联系人': '张三', '联系电话': '13800138001', '地址': '北京市朝阳区' },
    { '客户名称': '客户B', '客户ID': 'C002', '联系人': '李四', '联系电话': '13800138002', '地址': '上海市浦东新区' },
  ],
  '供应商信息': [
    { '供应商名称': '供应商A', '供应商ID': 'S001', '联系人': '王五', '联系电话': '13800138003', '地址': '广州市天河区' },
    { '供应商名称': '供应商B', '供应商ID': 'S002', '联系人': '赵六', '联系电话': '13800138004', '地址': '深圳市南山区' },
  ],
};

export function exportBasicTemplate(): void {
  const worksheet = XLSX.utils.json_to_sheet(BASIC_TEMPLATE);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '核心财务数据');
  
  const instructions = [
    { '字段名': '日期(必填)', '格式要求': 'YYYY-MM-DD', '示例': '2024-01-15', '说明': '财务数据所属日期' },
    { '字段名': '营收金额(必填)', '格式要求': '数字', '示例': '125000', '说明': '当日所有订单收入总和，不含货币符号' },
    { '字段名': '退款金额(必填)', '格式要求': '数字', '示例': '5000', '说明': '当日退款金额总和，不含货币符号' },
    { '字段名': '广告花费(必填)', '格式要求': '数字', '示例': '25000', '说明': '当日各平台广告投放总花费' },
    { '字段名': '采购成本(必填)', '格式要求': '数字', '示例': '35000', '说明': '当日采购商品的总成本' },
    { '字段名': '', '格式要求': '', '示例': '', '说明': '' },
    { '字段名': '填写规则', '格式要求': '', '示例': '', '说明': '' },
    { '字段名': '1. 所有金额字段必须为纯数字，不要添加货币符号或千分位分隔符', '格式要求': '', '示例': '', '说明': '' },
    { '字段名': '2. 日期必须严格按照 YYYY-MM-DD 格式填写', '格式要求': '', '示例': '', '说明': '' },
    { '字段名': '3. 必填字段不能为空，否则将无法通过数据验证', '格式要求': '', '示例': '', '说明': '' },
    { '字段名': '4. 示例行仅供参考，请删除后填写真实数据', '格式要求': '', '示例': '', '说明': '' },
  ];
  const instructionSheet = XLSX.utils.json_to_sheet(instructions);
  XLSX.utils.book_append_sheet(workbook, instructionSheet, '填写说明');
  
  XLSX.writeFile(workbook, '财务基础数据模板.xlsx');
}

export function exportSupplementaryTemplate(): void {
  const workbook = XLSX.utils.book_new();
  
  const templatesWithHints = {
    '应收账款': [
      { '客户名称(必填)': '客户A', '客户ID': 'C001', '订单编号(必填)': 'DD20240101001', '金额(必填/数字)': 10000, '到期日期(必填/YYYY-MM-DD)': '2024-01-15', '状态': '未收款' },
      { '客户名称(必填)': '客户B', '客户ID': 'C002', '订单编号(必填)': 'DD20240102001', '金额(必填/数字)': 5000, '到期日期(必填/YYYY-MM-DD)': '2024-01-20', '状态': '未收款' },
    ],
    '应付账款': [
      { '供应商名称(必填)': '供应商A', '供应商ID': 'S001', '发票编号(必填)': 'FP20240101001', '金额(必填/数字)': 8000, '到期日期(必填/YYYY-MM-DD)': '2024-01-25', '状态': '未付款' },
      { '供应商名称(必填)': '供应商B', '供应商ID': 'S002', '发票编号(必填)': 'FP20240102001', '金额(必填/数字)': 3000, '到期日期(必填/YYYY-MM-DD)': '2024-02-01', '状态': '未付款' },
    ],
    '客户信息': [
      { '客户名称(必填)': '客户A', '客户ID': 'C001', '联系人(必填)': '张三', '联系电话(必填)': '13800138001', '地址(必填)': '北京市朝阳区' },
      { '客户名称(必填)': '客户B', '客户ID': 'C002', '联系人(必填)': '李四', '联系电话(必填)': '13800138002', '地址(必填)': '上海市浦东新区' },
    ],
    '供应商信息': [
      { '供应商名称(必填)': '供应商A', '供应商ID': 'S001', '联系人(必填)': '王五', '联系电话(必填)': '13800138003', '地址(必填)': '广州市天河区' },
      { '供应商名称(必填)': '供应商B', '供应商ID': 'S002', '联系人(必填)': '赵六', '联系电话(必填)': '13800138004', '地址(必填)': '深圳市南山区' },
    ],
  };
  
  Object.entries(templatesWithHints).forEach(([sheetName, data]) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });
  
  const instructions = [
    { '表格名称': '应收账款', '用途': '记录客户欠款信息', '关键字段': '客户名称、订单编号、金额、到期日期' },
    { '表格名称': '应付账款', '用途': '记录欠供应商款项信息', '关键字段': '供应商名称、发票编号、金额、到期日期' },
    { '表格名称': '客户信息', '用途': '客户基本信息档案', '关键字段': '客户名称、联系人、联系电话、地址' },
    { '表格名称': '供应商信息', '用途': '供应商基本信息档案', '关键字段': '供应商名称、联系人、联系电话、地址' },
    { '表格名称': '', '用途': '', '关键字段': '' },
    { '表格名称': '格式规范', '用途': '', '关键字段': '' },
    { '表格名称': '日期格式：YYYY-MM-DD', '用途': '示例: 2024-01-15', '关键字段': '日期必须严格按此格式填写' },
    { '表格名称': '金额格式：纯数字', '用途': '示例: 12500', '关键字段': '不要添加货币符号或千分位' },
    { '表格名称': '电话格式：11位手机号', '用途': '示例: 13800138000', '关键字段': '仅支持中国大陆手机号' },
    { '表格名称': '', '用途': '', '关键字段': '' },
    { '表格名称': '填写规则', '用途': '', '关键字段': '' },
    { '表格名称': '1. 标记(必填)的字段必须填写，否则无法通过验证', '用途': '', '关键字段': '' },
    { '表格名称': '2. ID字段可留空，系统会自动生成唯一ID', '用途': '', '关键字段': '' },
    { '表格名称': '3. 示例行仅供参考，请删除后填写真实数据', '用途': '', '关键字段': '' },
    { '表格名称': '4. 状态字段请按系统预设值填写', '用途': '', '关键字段': '' },
  ];
  const instructionSheet = XLSX.utils.json_to_sheet(instructions);
  XLSX.utils.book_append_sheet(workbook, instructionSheet, '填写说明');
  
  XLSX.writeFile(workbook, '财务补充数据模板.xlsx');
}

export function exportReportToExcel(data: any[], sheetName: string, reportName: string, companyName: string = '企业'): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  const now = new Date();
  const dateStr = format(now, 'yyyyMMdd');
  const filename = `${reportName}_${companyName}_${dateStr}.xlsx`;
  
  XLSX.writeFile(workbook, filename);
}

export const IMPORT_TYPE_CONFIG: Record<string, { 
  name: string; 
  validate: (data: any[]) => ImportResult;
  template: any[];
}> = {
  'daily-profit': {
    name: '每日盈亏',
    validate: validateDailyProfitData,
    template: [
      { '日期': '2024-01-01', '收入': 10000, '支出': 5000, '订单数': 50, '客单价': 200 }
    ]
  },
  'accounts-receivable': {
    name: '应收管理',
    validate: validateAccountsReceivableData,
    template: [
      { '客户名称': '测试客户', '客户ID': '', '订单编号': 'DD20240101001', '金额': 10000, '到期日期': '2024-01-15', '状态': 'pending' }
    ]
  },
  'accounts-payable': {
    name: '应付管理',
    validate: validateAccountsPayableData,
    template: [
      { '供应商名称': '测试供应商', '供应商ID': '', '发票编号': 'FP20240101001', '金额': 5000, '到期日期': '2024-01-20', '状态': 'pending' }
    ]
  },
  'advertising': {
    name: '广告投流',
    validate: validateAdvertisingData,
    template: [
      { '平台': '抖音', '活动名称': '测试活动', '花费': 1000, '点击量': 100, '展现量': 1000, '转化': 5, '投放日期': '2024-01-01' }
    ]
  },
  'refund-compensation': {
    name: '退款赔付',
    validate: validateRefundCompensationData,
    template: [
      { '订单编号': 'DD20240101001', '类型': '退款', '金额': 100, '原因': '客户申请退款', '状态': 'pending' }
    ]
  },
  'cost-control': {
    name: '成本管控',
    validate: validateCostControlData,
    template: [
      { '成本类别': '广告投放', '预算': 50000, '实际': 45000, '月份': '2024-01' }
    ]
  },
  'warehouse': {
    name: '仓储履约',
    validate: validateWarehouseData,
    template: [
      { 'SKU编号': 'SKU001', '商品名称': '测试商品', '数量': 100, '单价': 50, '存放位置': 'A区-01货架' }
    ]
  }
};
