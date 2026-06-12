/**
 * 生成经营看板Excel模板脚本
 * 生成3个文件：template_manager.xlsx / template_operation.xlsx / template_boss.xlsx
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '../public/download');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// 通用：创建带说明的sheet
function makeSheet(headers, noteLines) {
  const data = [headers];
  noteLines.forEach(line => data.push([line]));
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = headers.map(() => ({ wch: 20 }));
  return ws;
}

// 1. 主管模板
function buildManager() {
  const wb = XLSX.utils.book_new();

  // Sheet1: 审批记录
  const ws1 = makeSheet(
    ['日期', '申请人', '审批人', '赔付金额', '赔付原因', '审批状态', '差评撤销', '备注'],
    [
      '【填写说明】',
      '日期：格式 YYYY-MM-DD，如 2024-06-01',
      '申请人：申请人姓名（客服）',
      '审批人：审批人姓名（主管/老板）',
      '赔付金额：赔付金额（元），填数字',
      '赔付原因：填 质量问题 / 物流损坏 / 错发漏发 / 7天无理由 / 描述不符 / 安装问题 / 配件缺失 / 其他',
      '审批状态：填 待审批 / 已通过 / 已驳回',
      '差评撤销：填 是 / 否',
      '备注：补充说明（可选）',
      '【提交节奏】每周五下班前提交本周数据',
    ]
  );
  XLSX.utils.book_append_sheet(wb, ws1, '审批记录');

  // Sheet2: 主管周报
  const ws2 = makeSheet(
    ['年份', '月份', '周次', '平台', '客服接待量', '平均响应时长', '退款金额', '退款率', '赔付金额', '备注'],
    [
      '【填写说明】',
      '年份/月份/周次：如 2024 / 6 / 1',
      '平台：填 抖音 / 淘宝 / 拼多多 / 京东 / 小红书 / 其他',
      '客服接待量：客服接待人次（数字）',
      '平均响应时长：平均响应时长（秒）',
      '退款金额：退款金额（元）',
      '退款率：退款率（%），如 3.5',
      '赔付金额：赔付金额（元）',
      '备注：补充说明（可选）',
      '【提交节奏】每周一上午提交上周数据',
    ]
  );
  XLSX.utils.book_append_sheet(wb, ws2, '主管周报');

  return wb;
}

// 2. 运营模板
function buildOperation() {
  const wb = XLSX.utils.book_new();

  // Sheet1: 周度经营数据
  const ws1 = makeSheet(
    ['年份', '月份', '周次', '平台', '销售收入', '订单数', '投流花费', '获客成本', '备注'],
    [
      '【填写说明】',
      '年份/月份/周次：如 2024 / 6 / 1',
      '平台：填 抖音 / 淘宝 / 拼多多 / 京东 / 小红书 / 其他。一行 = 一个平台一周',
      '销售收入：销售收入（元）',
      '订单数：订单数量',
      '投流花费：投流花费（元）',
      '获客成本：获客成本（元/单）',
      '备注：补充说明（可选）',
      '【提交节奏】每周一上午提交上周数据',
    ]
  );
  XLSX.utils.book_append_sheet(wb, ws1, '周度经营数据');

  // Sheet2: 单品数据
  const ws2 = makeSheet(
    ['年份', '月份', '商品编码', '产品名称', '销量', '销售收入', '成本', '毛利', '毛利率', '退货率', '售后成本', '投流ROI', '差评率', '备注'],
    [
      '【填写说明】',
      '年份/月份：如 2024 / 6',
      '商品编码：SKU编码',
      '产品名称：产品名称',
      '销量：销量（件）',
      '销售收入：销售收入（元）',
      '成本：成本（元）',
      '毛利：毛利（元）= 销售收入 - 成本',
      '毛利率：毛利率（%）= 毛利 / 销售收入',
      '退货率：退货率（%）= 退货件数 / 销量',
      '售后成本：售后成本（元）',
      '投流ROI：投流ROI = 投流产出 / 投流花费',
      '差评率：差评率（%）',
      '备注：补充说明（可选）',
      '【提交节奏】每月3号提交上月数据',
    ]
  );
  XLSX.utils.book_append_sheet(wb, ws2, '单品数据');

  return wb;
}

// 3. 老板模板
function buildBoss() {
  const wb = XLSX.utils.book_new();

  // Sheet1: 成本明细
  const ws1 = makeSheet(
    ['年份', '月份', '成本类型', '金额', '备注'],
    [
      '【填写说明】',
      '年份/月份：如 2024 / 6',
      '成本类型：填 房租 / 工资 / 水电 / 售后赔付 / 退货损失 / 平台扣点 / 包装费 / 快递费 / 库存占压 / 其他',
      '金额：金额（元）',
      '备注：补充说明（可选）',
      '【提交节奏】每月5号前提交上月数据',
    ]
  );
  XLSX.utils.book_append_sheet(wb, ws1, '成本明细');

  // Sheet2: ROI目标
  const ws2 = makeSheet(
    ['周期类型', '周期标签', '指标名称', '维度', '目标值', '实际值', '单位', '备注'],
    [
      '【填写说明】',
      '周期类型：填 月 / 季度 / 年',
      '周期标签：如 2024-Q1 或 2024-03',
      '指标名称：如 整体ROI / 降本金额 / AI提效时长 / 赔付降幅 / 退款率',
      '维度：填 团队 / 个人',
      '目标值：目标值',
      '实际值：实际值（月底填）',
      '单位：如 % / 元 / 小时',
      '备注：补充说明（可选）',
      '【提交节奏】每月初设定目标，月底填实际值',
    ]
  );
  XLSX.utils.book_append_sheet(wb, ws2, 'ROI目标');

  // Sheet3: 月度汇总
  const ws3 = makeSheet(
    ['年份', '月份', '月度收入', '月度成本', '月度利润', '同比变化', '环比变化', '季节性系数', '库存周转率', '资金占用周期', '备注'],
    [
      '【填写说明】',
      '年份/月份：如 2024 / 6',
      '月度收入：月度收入（元）',
      '月度成本：月度成本（元）',
      '月度利润：月度利润（元）',
      '同比变化：同比变化（%）',
      '环比变化：环比变化（%）',
      '季节性系数：季节性系数',
      '库存周转率：库存周转率（%）',
      '资金占用周期：资金占用周期（天）',
      '备注：补充说明（可选）',
      '【提交节奏】每月10号前完成上月汇总',
    ]
  );
  XLSX.utils.book_append_sheet(wb, ws3, '月度汇总');

  return wb;
}

// 执行
XLSX.writeFile(buildManager(), path.join(OUT_DIR, 'template_manager.xlsx'));
console.log('✅ template_manager.xlsx 完成');

XLSX.writeFile(buildOperation(), path.join(OUT_DIR, 'template_operation.xlsx'));
console.log('✅ template_operation.xlsx 完成');

XLSX.writeFile(buildBoss(), path.join(OUT_DIR, 'template_boss.xlsx'));
console.log('✅ template_boss.xlsx 完成');

console.log('📁 文件位置：', OUT_DIR);
