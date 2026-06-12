/**
 * AI体检站 - 模板下载 & 表格导入 工具
 * 每个体检类型有独立的列头和示例数据
 * 个人版/效率版 → 通用电商示例
 * 专业版/旗舰版 → 卫浴行业示例
 */
import * as XLSX from 'xlsx';

// ── 模板定义 ──
interface TemplateDef {
  headers: string[];
  personalExamples: string[][];
  enterpriseExamples: string[][];
}

const TEMPLATES: Record<string, TemplateDef> = {
  speech: {
    headers: ['客户问题', '当前话术', '产品类型', '渠道来源'],
    personalExamples: [
      ['商品有瑕疵怎么处理？', '您好，很抱歉给您带来不便，马上为您处理', '服装/鞋帽', '淘宝'],
      ['物流太慢了想退款', '理解您的焦急，我这边帮您催促或办理退款', '食品/生鲜', '京东'],
    ],
    enterpriseExamples: [
      ['马桶冲水无力怎么回？', '您好建议您检查水箱', '卫浴/马桶', '抖音电商'],
      ['花洒出水不均匀', '建议您拆下花洒头清理水垢', '卫浴/花洒', '天猫'],
    ],
  },
  sop: {
    headers: ['流程环节', '当前操作', '耗时(分钟)', '问题类型'],
    personalExamples: [
      ['退货申请处理', '先核实订单再引导退换', '5', '流程缺失'],
      ['差评回复', '了解原因后提供补偿方案', '10', '响应慢'],
    ],
    enterpriseExamples: [
      ['退货申请处理', '先核实订单再引导退换', '5', '流程缺失'],
      ['卫浴安装预约', '记录地址安排师傅上门', '15', '流程不规范'],
    ],
  },
  case: {
    headers: ['售后案例', '处理过程', '客户反馈', '解决结果'],
    personalExamples: [
      ['商品与描述不符', '拍照核实后补发或退款', '满意', '退款'],
      ['发错货了', '核实后补发正确商品', '基本满意', '补发'],
    ],
    enterpriseExamples: [
      ['马桶安装后漏水', '安排师傅上门检查', '不满意', '退货'],
      ['花洒配件缺失', '核实后补发配件', '满意', '补发配件'],
    ],
  },
  quality: {
    headers: ['客服姓名', '对话内容', '质检维度', '评分(1-10)'],
    personalExamples: [
      ['张小明', '您好请问有什么帮您', '开场白规范性', '8'],
      ['李小红', '这边帮您查一下', '服务态度', '7'],
    ],
    enterpriseExamples: [
      ['张小明', '您好请问有什么帮您', '开场白规范性', '8'],
      ['李小红', '这边帮您查一下订单', '服务态度', '7'],
    ],
  },
  plan: {
    headers: ['问题类型', '当前方案', '预期目标', '团队规模'],
    personalExamples: [
      ['退货率偏高', '加强质检', '降低到5%', '3人'],
      ['响应慢', '增加排班', '30秒响应率80%', '5人'],
    ],
    enterpriseExamples: [
      ['退货率偏高', '加强质检', '降低到5%', '5人'],
      ['安装投诉多', '规范预约流程', '投诉降30%', '8人'],
    ],
  },
};

/**
 * 下载体检模板 xlsx
 */
export function downloadCheckupTemplate(type: string, isEnterprise: boolean) {
  const tpl = TEMPLATES[type];
  if (!tpl) return;

  const examples = isEnterprise ? tpl.enterpriseExamples : tpl.personalExamples;
  const data = [tpl.headers, ...examples];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // 列宽
  ws['!cols'] = tpl.headers.map(() => ({ wch: 22 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '体检数据');

  const typeName: Record<string, string> = {
    speech: '话术体检', sop: 'SOP体检', case: '案例体检',
    quality: '质检体检', plan: '方案体检',
  };
  XLSX.writeFile(wb, `${typeName[type] || type}模板.xlsx`);
}

/**
 * 导入体检表格 xlsx → 返回解析后的行数据（对象数组）
 */
export async function importCheckupSheet(
  file: File,
  type: string,
): Promise<Record<string, string>[]> {
  const tpl = TEMPLATES[type];
  if (!tpl) return [];

  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (rows.length < 2) return []; // 只有表头没有数据

  const headers = rows[0];
  const result: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const obj: Record<string, string> = {};
    tpl.headers.forEach((h, idx) => {
      // 优先用模板列头匹配，兼容用户自定义列头
      const colIdx = headers.indexOf(h);
      obj[h] = String(row[colIdx >= 0 ? colIdx : idx] || '');
    });

    // 跳过全空行
    if (Object.values(obj).some(v => v.trim())) {
      result.push(obj);
    }
  }

  return result;
}

/**
 * 获取模板列头定义
 */
export function getCheckupHeaders(type: string): string[] {
  return TEMPLATES[type]?.headers || [];
}
