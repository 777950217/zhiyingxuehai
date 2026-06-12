import { NextResponse } from 'next/server';

/**
 * 行业规则库 API
 * 从 solve/diagnose 路由的 SYSTEM_PROMPT 中提取的 72 条判断链规则
 */

interface Rule {
  id: number;
  title: string;
  category: string;
  summary: string;
  responsibleParty: string;
}

const RULES: Rule[] = [
  // ─── 售前 ───
  { id: 1, title: '客户咨询产品参数', category: '售前', summary: '根据客户需求推荐合适产品，确认坑距/水压/安装条件', responsibleParty: '售前客服' },
  { id: 2, title: '价格异议处理', category: '售前', summary: '对比竞品突出性价比，强调安装/售后等服务价值', responsibleParty: '售前客服' },
  { id: 3, title: '促单成交话术', category: '售前', summary: '限时优惠/库存紧张/赠品策略推动下单', responsibleParty: '售前客服' },
  { id: 4, title: '竞品对比', category: '售前', summary: '不贬低竞品，客观对比材质/工艺/售后差异', responsibleParty: '售前客服' },
  { id: 5, title: '赠品/赠速确认', category: '售前', summary: '只允许赠送小礼品/消耗品，不赠送主机和核心配件', responsibleParty: '售前客服' },
  { id: 6, title: '多渠道比价', category: '售前', summary: '不同平台价格差异以活动解释，不承诺最低价', responsibleParty: '售前客服' },
  { id: 7, title: '预售/缺货/到货时间', category: '售前', summary: '确认库存状态，预估到货时间留缓冲', responsibleParty: '售前客服' },
  { id: 8, title: '套餐推荐/搭配建议', category: '售前', summary: '根据卫生间面积/风格推荐马桶+花洒+浴室柜套餐', responsibleParty: '售前客服' },
  { id: 9, title: '客户质疑非正品', category: '售前', summary: '提供授权书/防伪码/质检报告等正品的证明', responsibleParty: '售前客服' },
  { id: 10, title: '赠品与消耗品赠送边界', category: '售前', summary: '只允许赠送小礼品/消耗品安抚挽留，禁止赠送主机/核心配件', responsibleParty: '售前客服' },
  { id: 11, title: '退差价判断', category: '售前', summary: '7天内可退差价，超过7天不退，活动价以页面为准', responsibleParty: '售前客服' },
  { id: 12, title: '质疑非正品要求补偿', category: '售前', summary: '提供正品证明，补偿仅限消耗品/小礼品，不返现', responsibleParty: '售前客服' },

  // ─── 签收 ───
  { id: 13, title: '师傅上门安装问题判断', category: '签收', summary: '确认是否在安装服务范围内，预约时间，师傅资质', responsibleParty: '安装调度' },
  { id: 14, title: '超7天无理由退货判断', category: '签收', summary: '超7天不支持无理由退货，质量问题走售后', responsibleParty: '售后客服' },
  { id: 15, title: '自行安装损坏判断', category: '签收', summary: '自行安装导致的损坏不在质保范围，提醒客户专业安装', responsibleParty: '售后客服' },
  { id: 16, title: '误判故障判断', category: '签收', summary: '先远程排查确认是否真正故障，避免误判导致不必要的上门', responsibleParty: '售后客服' },
  { id: 17, title: '已安装使用后退货判断', category: '签收', summary: '已安装使用影响二次销售不支持退货，质量问题走售后维修', responsibleParty: '售后客服' },
  { id: 20, title: '外箱完好内部缺配件判断', category: '签收', summary: '外箱完好内部缺配件→补发配件，外箱破损→拒签/物流理赔', responsibleParty: '售后客服' },
  { id: 21, title: '恶意拒收判断', category: '签收', summary: '无正当理由拒收需承担往返运费，多次恶意拒收可拉黑', responsibleParty: '售后客服' },
  { id: 32, title: '快递签收拆开马桶釉面裂纹磕碰掉瓷', category: '签收', summary: '签收24小时内拍照报损→物流理赔/补发，超时需协商', responsibleParty: '售后客服' },
  { id: 33, title: '多件套餐只到一部分少配件无法安装', category: '签收', summary: '确认缺少件数→紧急补发+安装延期通知，赠小礼品安抚', responsibleParty: '安装调度' },

  // ─── 安装 ───
  { id: 18, title: '水压异常判断', category: '安装', summary: '确认水压是否在产品要求范围内，偏低推荐无水压限制款', responsibleParty: '安装师傅' },
  { id: 24, title: '师傅上门安装失败判断链', category: '安装', summary: '安装失败→确认原因(环境/产品/师傅)→协商方案(改约/换型号/退款)', responsibleParty: '安装调度' },
  { id: 25, title: '安装完成客户反馈功能不正常判断链', category: '安装', summary: '现场调试→排除安装问题→故障报修→48小时内二次上门', responsibleParty: '安装师傅' },
  { id: 26, title: '客户要求改安装位置/移位安装', category: '安装', summary: '移位安装需额外收费(管道改造)，确认客户同意后再施工', responsibleParty: '安装师傅' },
  { id: 27, title: '脚感冲水不灵敏/离座不冲水', category: '安装', summary: '检查感应器设置/电池电量/遮挡物，非硬件问题可远程指导', responsibleParty: '安装师傅' },
  { id: 28, title: '拆旧时发现下水管/排污口问题', category: '安装', summary: '下水管问题不在安装范围→建议联系物业，提供改造建议', responsibleParty: '安装师傅' },
  { id: 29, title: '马桶安装一周底座边缘持续渗水', category: '安装', summary: '判断法兰圈/排污口/安装工艺问题→48小时内回访处理', responsibleParty: '安装师傅' },
  { id: 30, title: '客户投诉安装师傅态度差/施工粗糙/拒绝收尾', category: '安装', summary: '先安抚客户→核实情况→道歉+更换师傅/补偿小礼品', responsibleParty: '主管' },
  { id: 37, title: '没及时上门安装客户扬言差评平台投诉', category: '安装', summary: '诚恳道歉→确认最快上门时间→赠送消耗品补偿→跟进完成', responsibleParty: '安装调度' },
  { id: 56, title: '售前安装条件确认', category: '安装', summary: '确认坑距(305/400mm)/水压/电路/排污管/空间尺寸', responsibleParty: '售前客服' },
  { id: 62, title: '安装预约/催安装/改约/爽约重约', category: '安装', summary: '预约24h内确认→催单优先安排→改约不超过2次→爽约记录', responsibleParty: '安装调度' },

  // ─── 故障 ───
  { id: 19, title: '质疑非正品判断', category: '故障', summary: '提供正品证明(授权/防伪/质检)，不接受仅凭怀疑退货', responsibleParty: '售后客服' },
  { id: 31, title: '冲水后水箱一直嗡嗡响客户判定机器故障', category: '故障', summary: '正常补水声音→解释原理→如确实异常则安排检修', responsibleParty: '售后客服' },
  { id: 34, title: '夜间马桶咕咚流水异响怀疑破裂暗漏', category: '故障', summary: '检查进水阀/浮球/溢水管→远程指导调整→异常安排上门', responsibleParty: '售后客服' },
  { id: 35, title: '冲水时刺耳摩擦声客户要求换货', category: '故障', summary: '检查盖板铰链/缓降装置→润滑/更换配件→非整机问题不换货', responsibleParty: '售后客服' },
  { id: 36, title: '进水阀补水滋滋声客户误以为异常', category: '故障', summary: '补水正常现象→解释原理→如声音过大可调低进水阀压力', responsibleParty: '售后客服' },
  { id: 44, title: '智能马桶面板按键没反应触摸失灵', category: '故障', summary: '断电重启→检查童锁/面板膜→如硬件故障安排维修', responsibleParty: '售后客服' },
  { id: 45, title: '遥控器时而能用时而失灵', category: '故障', summary: '检查电池/信号干扰/配对→换电池→仍异常则更换遥控器', responsibleParty: '售后客服' },
  { id: 46, title: '面板显示乱码黑屏指示灯不亮', category: '故障', summary: '断电重启→检查电源连接→如硬件故障更换面板', responsibleParty: '售后客服' },
  { id: 47, title: '自动翻盖感应功能失效', category: '故障', summary: '检查感应器设置/遮挡物/电源→重置感应→仍异常安排检修', responsibleParty: '售后客服' },
  { id: 48, title: '马桶水箱一直上水关不住水', category: '故障', summary: '检查进水阀/浮球/溢水管位置→调整/更换配件→远程指导优先', responsibleParty: '售后客服' },
  { id: 54, title: '使用阶段清洗/加热/烘干功能故障', category: '故障', summary: '逐项排查(水路/电路/加热模块)→远程指导→硬件故障上门', responsibleParty: '售后客服' },
  { id: 55, title: '内部管路漏水VS底座渗漏VS配件漏水VS盖板座圈松动缓降失效', category: '故障', summary: '定位漏水点→管路漏水更换管路/底座渗漏重新安装/配件漏水更换配件', responsibleParty: '售后客服' },
  { id: 57, title: '冲水效果问题(冲不干净/冲水力度弱/冲一半回流)', category: '故障', summary: '检查水压/排污管/法兰圈→调整水件/确认管路通畅→仍异常上门', responsibleParty: '售后客服' },
  { id: 58, title: '异味问题(马桶返臭、有臭味)', category: '故障', summary: '检查法兰圈密封/存水弯/排污管→重新密封/更换法兰圈', responsibleParty: '售后客服' },
  { id: 59, title: '停电后无法冲水(含备用电池应急操作)', category: '故障', summary: '指导备用电池/手动冲水操作→非故障正常现象→建议加装UPS', responsibleParty: '售后客服' },
  { id: 60, title: '配件补发后又坏(换了又坏二次故障判断)', category: '故障', summary: '二次故障升级处理→更换整机或安排高级技师上门', responsibleParty: '主管' },
  { id: 61, title: '泡沫盾专属故障(不出泡/漏液/加错泡沫液)', category: '故障', summary: '检查泡沫液余量/管路/加液口→清洗管路/补发泡沫液', responsibleParty: '售后客服' },
  { id: 63, title: '遥控器/配件丢失补发(丢失≠损坏)', category: '故障', summary: '丢失需购买补发(非质保范围)→提供配件价格→安排寄送', responsibleParty: '售后客服' },
  { id: 64, title: '发货型号/颜色错误', category: '故障', summary: '确认错误责任方→补发正确产品+回收入库错误产品→运费由责任方承担', responsibleParty: '售后客服' },

  // ─── 投诉 ───
  { id: 22, title: '退差价判断', category: '投诉', summary: '7天内退差价，超7天不退，活动价以页面标注为准', responsibleParty: '售后客服' },
  { id: 38, title: '对处理方案不满要求全额退款否则曝光', category: '投诉', summary: '升级主管→提供多方案选择→记录投诉→2小时内回访确认', responsibleParty: '主管' },
  { id: 39, title: '多次售后没解决客户升级要找12315', category: '投诉', summary: '主管直接介入→48小时彻底解决方案→书面确认→跟进至满意', responsibleParty: '主管' },
  { id: 40, title: '购买1年2个月故障客户要求免费换新', category: '投诉', summary: '质保期内免费维修→超期付费维修→可提供折扣换新但非免费', responsibleParty: '售后客服' },
  { id: 41, title: '收货7天内功能失灵坚持无理由退货', category: '投诉', summary: '7天内功能失灵→退货→运费商家承担；超过7天走售后', responsibleParty: '售后客服' },
  { id: 42, title: '人为磕碰自行拆装损坏想走免费质保', category: '投诉', summary: '人为损坏不在质保范围→可付费维修→提供维修报价', responsibleParty: '售后客服' },
  { id: 50, title: '平台介入/仲裁应对', category: '投诉', summary: '准备完整证据链(聊天/照片/物流)→配合平台→不私自承诺', responsibleParty: '主管' },
  { id: 52, title: '客户自行改装/加装出问题', category: '投诉', summary: '自行改装不在质保范围→可付费维修→提醒原厂改装风险', responsibleParty: '售后客服' },

  // ─── 保修 ───
  { id: 23, title: '质疑非正品要求补偿判断', category: '保修', summary: '提供正品证明，补偿仅限消耗品/小礼品，不返现不退主机', responsibleParty: '售后客服' },
  { id: 43, title: '质保期内配件损坏纠结补配件还是整机退换', category: '保修', summary: '质保期内优先更换配件→如3次以上故障可申请整机更换', responsibleParty: '售后客服' },
  { id: 49, title: '漏水质量问题用户申请退货要求商家承担运费', category: '保修', summary: '质量问题→退货+商家承担运费；非质量问题→用户承担运费', responsibleParty: '售后客服' },
  { id: 51, title: '个人不喜欢/尺寸不合适无理由退货拒绝承担运费', category: '保修', summary: '7天内无理由退货运费由用户承担，页面已明确标注', responsibleParty: '售后客服' },
  { id: 53, title: '物流丢件/整件未到处理', category: '保修', summary: '确认物流状态→超48小时未更新→物流理赔+紧急补发', responsibleParty: '售后客服' },

  // ─── 售前进阶 ───
  { id: 65, title: '售前成交5步法', category: '售前', summary: '问需求→共情顾虑→匹配卖点→打消顾虑→给价值理由→引导下单', responsibleParty: '售前客服' },
  { id: 66, title: '逼单核心逻辑', category: '售前', summary: '制造稀缺+降低决策成本+打消最后顾虑，帮客户下决心', responsibleParty: '售前客服' },
  { id: 67, title: '催单核心原则', category: '售前', summary: '不连环轰炸+给体面台阶+借外力催单(活动/库存/名额)', responsibleParty: '售前客服' },
  { id: 68, title: '稀缺限时逼单话术', category: '售前', summary: '明确倒计时+算账对比+锁定价格福利，须有真实活动依据', responsibleParty: '售前客服' },
  { id: 69, title: '库存现货逼单话术', category: '售前', summary: '真实库存状态+现在下单vs排单等待时间差+锁定名额发货', responsibleParty: '售前客服' },
  { id: 70, title: '帮决策式逼单话术', category: '售前', summary: '确认顾虑点→给明确结论→直接引导下一步，帮客户做选择', responsibleParty: '售前客服' },
  { id: 71, title: '客户嫌贵/预算不够', category: '售前', summary: '共情+客观差异+降档推荐+算长期账，不贬低低价竞品', responsibleParty: '售前客服' },
  { id: 72, title: '老客户复购/转介绍', category: '售前', summary: '确认身份+专属优惠+引导转介绍+快速通道', responsibleParty: '售前客服' },
];

const CATEGORIES = ['售前', '签收', '安装', '故障', '投诉', '保修'];

export async function GET() {
  return NextResponse.json({
    categories: CATEGORIES,
    rules: RULES,
    total: RULES.length,
  });
}
