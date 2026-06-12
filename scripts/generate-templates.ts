/**
 * 生成经营看板Excel模板脚本（exceljs版）
 * 生成3个文件：template_manager.xlsx / template_operation.xlsx / template_boss.xlsx
 * 要求：第1行红色背景白色字标注，第2行蓝色背景白色字列名，第3行起空白，枚举字段下拉验证
 */

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.join(__dirname, '../public/download');

// 确保输出目录存在
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// ============ 通用函数 ============

/** 设置行样式：红色背景白色字（标注行） */
function setRedRow(row: ExcelJS.Row, note: string) {
  const cell = row.getCell(1);
  cell.value = note;
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF0000' },
  };
  cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
  row.height = 35;
}

/** 设置行样式：蓝色背景白色字（列名行） */
function setBlueHeaderRow(row: ExcelJS.Row, headers: string[]) {
  headers.forEach((h, i) => {
    const cell = row.getCell(i + 1);
    cell.value = h;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  row.height = 20;
}

/** 添加下拉数据验证 */
function addDropdown(ws: ExcelJS.Worksheet, col: string, startRow: number, endRow: number, values: string[]) {
  ws.dataValidations.add(`${col}${startRow}:${col}${endRow}`, {
    type: 'list',
    allowBlank: true,
    formulae: [`"${values.join(',')}"`],
    showErrorMessage: true,
    errorStyle: 'error',
    errorTitle: '输入错误',
    error: '请从下拉列表中选择',
  });
}

// ============ 1. 主管模板 ============
async function generateManagerTemplate() {
  const wb = new ExcelJS.Workbook();

  // --- Sheet1: 审批记录 ---
  const ws1 = wb.addWorksheet('审批记录');
  ws1.columns = [
    { header: 'date', key: 'date', width: 14 },
    { header: 'applicant', key: 'applicant', width: 12 },
    { header: 'approver', key: 'approver', width: 12 },
    { header: 'amount', key: 'amount', width: 12 },
    { header: 'reason', key: 'reason', width: 20 },
    { header: 'status', key: 'status', width: 12 },
    { header: 'review_removed', key: 'review_removed', width: 14 },
    { header: 'notes', key: 'notes', width: 30 },
  ];

  // 第1行：红色标注
  setRedRow(ws1.getRow(1), '🔴 给主管：每周汇总赔付记录。赔付原因只填：质量问题/物流损坏/错发漏发/7天无理由/描述不符/安装问题/配件缺失/其他。审批状态填：待审批/已通过/已驳回。是否差评撤销填：是/否。每周五下班前提交。');
  ws1.mergeCells('A1:H1');

  // 第2行：蓝色列名
  setBlueHeaderRow(ws1.getRow(2), ['date', 'applicant', 'approver', 'amount', 'reason', 'status', 'review_removed', 'notes']);

  // 下拉验证
  addDropdown(ws1, 'E', 3, 102, ['质量问题', '物流损坏', '错发漏发', '7天无理由', '描述不符', '安装问题', '配件缺失', '其他']);
  addDropdown(ws1, 'F', 3, 102, ['待审批', '已通过', '已驳回']);
  addDropdown(ws1, 'G', 3, 102, ['是', '否']);

  // --- Sheet2: 主管周报 ---
  const ws2 = wb.addWorksheet('主管周报');
  ws2.columns = [
    { header: 'year', key: 'year', width: 8 },
    { header: 'month', key: 'month', width: 8 },
    { header: 'week', key: 'week', width: 8 },
    { header: 'platform', key: 'platform', width: 12 },
    { header: 'cs_sessions', key: 'cs_sessions', width: 14 },
    { header: 'avg_response_time', key: 'avg_response_time', width: 16 },
    { header: 'refund_amount', key: 'refund_amount', width: 14 },
    { header: 'refund_rate', key: 'refund_rate', width: 12 },
    { header: 'compensation', key: 'compensation', width: 12 },
    { header: 'notes', key: 'notes', width: 30 },
  ];

  // 第1行：红色标注
  setRedRow(ws2.getRow(1), '🔴 给主管：每周按平台分行填写客服数据。平台只填：抖音/淘宝/拼多多/京东/小红书/其他。客服接待量和响应时长从客服后台导出。每周一上午提交上周数据。');
  ws2.mergeCells('A1:J1');

  // 第2行：蓝色列名
  setBlueHeaderRow(ws2.getRow(2), ['year', 'month', 'week', 'platform', 'cs_sessions', 'avg_response_time', 'refund_amount', 'refund_rate', 'compensation', 'notes']);

  // 下拉验证
  addDropdown(ws2, 'D', 3, 102, ['抖音', '淘宝', '拼多多', '京东', '小红书', '其他']);

  await wb.xlsx.writeFile(path.join(OUT_DIR, 'template_manager.xlsx'));
  console.log('✅ template_manager.xlsx 生成成功');
}

// ============ 2. 运营模板 ============
async function generateOperationTemplate() {
  const wb = new ExcelJS.Workbook();

  // --- Sheet1: 周度经营数据 ---
  const ws1 = wb.addWorksheet('周度经营数据');
  ws1.columns = [
    { header: 'year', key: 'year', width: 8 },
    { header: 'month', key: 'month', width: 8 },
    { header: 'week', key: 'week', width: 8 },
    { header: 'platform', key: 'platform', width: 12 },
    { header: 'revenue', key: 'revenue', width: 12 },
    { header: 'orders', key: 'orders', width: 10 },
    { header: 'ad_spend', key: 'ad_spend', width: 12 },
    { header: 'customer_cost', key: 'customer_cost', width: 14 },
    { header: 'notes', key: 'notes', width: 30 },
  ];

  // 第1行：红色标注
  setRedRow(ws1.getRow(1), '🔴 给运营：每周按平台分行填写。平台只填：抖音/淘宝/拼多多/京东/小红书/其他。投流花费和获客成本从千川/直通车后台导出。每周一上午提交上周数据。');
  ws1.mergeCells('A1:I1');

  // 第2行：蓝色列名
  setBlueHeaderRow(ws1.getRow(2), ['year', 'month', 'week', 'platform', 'revenue', 'orders', 'ad_spend', 'customer_cost', 'notes']);

  // 下拉验证
  addDropdown(ws1, 'D', 3, 102, ['抖音', '淘宝', '拼多多', '京东', '小红书', '其他']);

  // --- Sheet2: 单品数据 ---
  const ws2 = wb.addWorksheet('单品数据');
  ws2.columns = [
    { header: 'year', key: 'year', width: 8 },
    { header: 'month', key: 'month', width: 8 },
    { header: 'sku', key: 'sku', width: 15 },
    { header: 'product_name', key: 'product_name', width: 20 },
    { header: 'sales_qty', key: 'sales_qty', width: 12 },
    { header: 'revenue', key: 'revenue', width: 12 },
    { header: 'cost', key: 'cost', width: 12 },
    { header: 'gross_profit', key: 'gross_profit', width: 14 },
    { header: 'gross_margin', key: 'gross_margin', width: 14 },
    { header: 'return_rate', key: 'return_rate', width: 12 },
    { header: 'after_sales_cost', key: 'after_sales_cost', width: 16 },
    { header: 'ad_roi', key: 'ad_roi', width: 10 },
    { header: 'bad_review_rate', key: 'bad_review_rate', width: 16 },
    { header: 'notes', key: 'notes', width: 30 },
  ];

  // 第1行：红色标注
  setRedRow(ws2.getRow(1), '🔴 给运营：每月按SKU填写单品数据。毛利=销售收入-成本，毛利率=毛利/销售收入。投流ROI=销售产出/投流花费。每月3号提交上月数据。');
  ws2.mergeCells('A1:N1');

  // 第2行：蓝色列名
  setBlueHeaderRow(ws2.getRow(2), ['year', 'month', 'sku', 'product_name', 'sales_qty', 'revenue', 'cost', 'gross_profit', 'gross_margin', 'return_rate', 'after_sales_cost', 'ad_roi', 'bad_review_rate', 'notes']);

  await wb.xlsx.writeFile(path.join(OUT_DIR, 'template_operation.xlsx'));
  console.log('✅ template_operation.xlsx 生成成功');
}

// ============ 3. 老板模板 ============
async function generateBossTemplate() {
  const wb = new ExcelJS.Workbook();

  // --- Sheet1: 成本明细 ---
  const ws1 = wb.addWorksheet('成本明细');
  ws1.columns = [
    { header: 'year', key: 'year', width: 8 },
    { header: 'month', key: 'month', width: 8 },
    { header: 'cost_type', key: 'cost_type', width: 16 },
    { header: 'amount', key: 'amount', width: 12 },
    { header: 'notes', key: 'notes', width: 30 },
  ];

  // 第1行：红色标注
  setRedRow(ws1.getRow(1), '🔴 给老板/财务：每月填写固定成本和变动成本。成本类型只填：房租/工资/水电/售后赔付/退货损失/平台扣点/包装费/快递费/库存占压/其他。每月5号前提交上月数据。');
  ws1.mergeCells('A1:E1');

  // 第2行：蓝色列名
  setBlueHeaderRow(ws1.getRow(2), ['year', 'month', 'cost_type', 'amount', 'notes']);

  // 下拉验证
  addDropdown(ws1, 'C', 3, 102, ['房租', '工资', '水电', '售后赔付', '退货损失', '平台扣点', '包装费', '快递费', '库存占压', '其他']);

  // --- Sheet2: ROI目标 ---
  const ws2 = wb.addWorksheet('ROI目标');
  ws2.columns = [
    { header: 'period_type', key: 'period_type', width: 12 },
    { header: 'period_label', key: 'period_label', width: 12 },
    { header: 'metric_name', key: 'metric_name', width: 16 },
    { header: 'dimension', key: 'dimension', width: 12 },
    { header: 'target_value', key: 'target_value', width: 14 },
    { header: 'actual_value', key: 'actual_value', width: 14 },
    { header: 'unit', key: 'unit', width: 10 },
    { header: 'notes', key: 'notes', width: 30 },
  ];

  // 第1行：红色标注
  setRedRow(ws2.getRow(1), '🔴 给老板：设定ROI目标和追踪实际达成。周期类型填：月/季度/年。维度填：团队/个人。每月初设定目标，月底填实际值。');
  ws2.mergeCells('A1:H1');

  // 第2行：蓝色列名
  setBlueHeaderRow(ws2.getRow(2), ['period_type', 'period_label', 'metric_name', 'dimension', 'target_value', 'actual_value', 'unit', 'notes']);

  // 下拉验证
  addDropdown(ws2, 'A', 3, 102, ['月', '季度', '年']);
  addDropdown(ws2, 'D', 3, 102, ['团队', '个人']);

  // --- Sheet3: 月度汇总 ---
  const ws3 = wb.addWorksheet('月度汇总');
  ws3.columns = [
    { header: 'year', key: 'year', width: 8 },
    { header: 'month', key: 'month', width: 8 },
    { header: 'monthly_revenue', key: 'monthly_revenue', width: 16 },
    { header: 'monthly_cost', key: 'monthly_cost', width: 14 },
    { header: 'monthly_profit', key: 'monthly_profit', width: 14 },
    { header: 'yoy_change', key: 'yoy_change', width: 12 },
    { header: 'mom_change', key: 'mom_change', width: 12 },
    { header: 'seasonality_index', key: 'seasonality_index', width: 16 },
    { header: 'inventory_turnover', key: 'inventory_turnover', width: 16 },
    { header: 'capital_cycle_days', key: 'capital_cycle_days', width: 16 },
    { header: 'notes', key: 'notes', width: 30 },
  ];

  // 第1行：红色标注
  setRedRow(ws3.getRow(1), '🔴 给老板：每月汇总经营数据。收入/成本/利润由运营+主管数据自动汇总，同比环比和库存相关指标手动补充。每月10号前完成上月汇总。');
  ws3.mergeCells('A1:K1');

  // 第2行：蓝色列名
  setBlueHeaderRow(ws3.getRow(2), ['year', 'month', 'monthly_revenue', 'monthly_cost', 'monthly_profit', 'yoy_change', 'mom_change', 'seasonality_index', 'inventory_turnover', 'capital_cycle_days', 'notes']);

  await wb.xlsx.writeFile(path.join(OUT_DIR, 'template_boss.xlsx'));
  console.log('✅ template_boss.xlsx 生成成功');
}

// ============ 主函数 ============
async function main() {
  console.log('开始生成Excel模板（exceljs版）...');
  await generateManagerTemplate();
  await generateOperationTemplate();
  await generateBossTemplate();
  console.log('🎉 所有模板生成完成！文件位置：', OUT_DIR);
}

main().catch((err) => {
  console.error('❌ 生成失败：', err);
  process.exit(1);
});
