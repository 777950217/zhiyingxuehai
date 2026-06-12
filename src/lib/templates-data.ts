/**
 * 职盈学海行业模板库 - 预设模板数据
 * 模板A：电商新手入门包（面向小商家）
 * 模板B：团队管理起步包（面向主管）
 * 模板C：体系搭建完整包（面向自学客户）
 */

export interface TemplatePhrase {
  category: string;
  content: string;
  scene?: string;
  question?: string;
  answer?: string;
  tags?: string;
}

export interface TemplateSopStep {
  title: string;
  description: string;
  script: string;
  note: string;
}

export interface TemplateSop {
  category: string;
  name: string;
  role: string;
  scenario?: string;
  steps: TemplateSopStep[];
}

export interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  contentSummary: string;
  icon: string; // emoji
  color: string; // tailwind color key
  targetUser: string;
  teamSize: string;
  phrases: TemplatePhrase[];
  sops: TemplateSop[];
  tags: string[];
}

// ─── 模板A：电商新手入门包（面向小商家） ───
const STARTER_BATH: IndustryTemplate = {
  id: 'starter-bath',
  name: '电商新手入门包',
  description: '专为1-3人小商家打造，零基础也能快速上手。包含基础话术、产品知识要点和简易质检表，帮你搞定日常客服工作。',
  contentSummary: '18条基础话术（售前+售后+安装）+ 2个核心SOP流程 + 产品知识速查要点 + 简易质检清单',
  icon: '🌱',
  color: 'green',
  targetUser: '小商家/新店主',
  teamSize: '1-3人',
  tags: ['零基础友好', '即学即用', '小团队必备'],
  phrases: [
    // 售前咨询（6条）
    { category: '售前咨询', content: '您好，欢迎咨询！我是您的专属客服顾问，请问有什么可以帮您的？', tags: '问候' },
    { category: '售前咨询', content: '请问您对哪款产品感兴趣？您可以告诉我需求，我帮您推荐最合适的', tags: '需求确认' },
    { category: '售前咨询', content: '这款是我们今年的爆款，销量Top3，好评率98%，买过的客户都反馈特别好', tags: '产品推荐' },
    { category: '售前咨询', content: '这款产品的核心卖点是XX功能，特别适合XX需求的客户，现在活动价还送XX礼包', tags: '卖点' },
    { category: '售前咨询', content: '关于安装您放心，我们提供专业师傅上门安装服务，安装完还会帮您调试好', tags: '安装' },
    { category: '售前咨询', content: '我们支持7天无理由退换，还有整机3年质保，核心部件5年，售后完全不用担心', tags: '保障' },
    // 售中跟进（4条）
    { category: '售中跟进', content: '您好，您的订单已确认，订单号XX，请核对：型号/颜色/规格/地址是否正确', tags: '订单确认' },
    { category: '售中跟进', content: '您好，您的订单已发货！物流单号XX，预计X天到达，到货前会电话联系您确认时间', tags: '发货通知' },
    { category: '售中跟进', content: '您好，看到您的订单已签收，请开箱检查产品外观和配件是否齐全，有问题随时联系我们', tags: '签收确认' },
    { category: '售中跟进', content: '这款产品使用前请注意：1.确认规格是否匹配 2.检查配件是否齐全 3.按照说明正确安装使用', tags: '使用提示' },
    // 售后处理（4条）
    { category: '售后处理', content: '您好，非常理解您的心情，请告诉我具体遇到了什么问题，我帮您找到最优解决方案', tags: '售后接待' },
    { category: '售后处理', content: '这个问题我见得比较多，大概率是XX原因，您帮我试一下XX操作，30秒就能确认是不是这个问题', tags: '远程排查' },
    { category: '售后处理', content: '关于退换货，我们支持7天无理由退换。您这边方便把问题拍个照片/视频发我吗？我帮您快速处理', tags: '退换货' },
    { category: '售后处理', content: '您放心，这个问题我们一定会帮您解决好的，后续有任何进展第一时间通知您', tags: '跟进承诺' },
    // 安装指导（4条）— 产品知识速查
    { category: '使用指导', content: '使用前请确认：1.产品规格是否匹配 2.配件是否齐全 3.安装环境是否满足要求 4.阅读使用说明', tags: '使用准备' },
    { category: '使用指导', content: '产品安装需要：1.确认安装位置尺寸 2.对准接口 3.固定牢固 4.安装后检查是否正常', tags: '安装步骤' },
    { category: '使用指导', content: '特殊规格的产品，请备注说明，否则可能出现安装不匹配的问题', tags: '特殊注意' },
    { category: '使用指导', content: '需要电源的产品，请确保插座位置合理，电源线长度足够', tags: '电源要求' },
  ],
  sops: [
    {
      category: '售前流程',
      name: '咨询接待标准流程',
      role: '售前客服',
      scenario: '客户主动咨询时的标准接待流程',
      steps: [
        { title: '即时响应', description: '客户发来消息后60秒内必须响应', script: '您好，欢迎咨询！我是您的专属顾问，请问有什么可以帮您的？', note: '超60秒未响应会扣服务分' },
        { title: '需求探询', description: '通过2-3个关键问题快速了解客户需求', script: '请问您主要是想了解哪方面？产品功能、安装条件还是价格优惠？', note: '不要一上来就推产品，先听客户说' },
        { title: '产品推荐', description: '根据需求推荐1-2款最匹配的产品', script: '根据您说的情况，我推荐XX型号，它的XX功能刚好满足您的需求，现在还有活动价', note: '最多推2款，太多客户会犹豫' },
        { title: '促单成交', description: '客户犹豫时用限时优惠推动下单', script: '这款现在是活动价，比平时省了XX元，还送XX礼包，活动到XX号就结束了哦', note: '促单要自然，不要催' },
      ],
    },
    {
      category: '售后流程',
      name: '退换货处理流程',
      role: '售后客服',
      scenario: '客户提出退换货请求的标准处理流程',
      steps: [
        { title: '接收申请', description: '先安抚情绪再了解原因', script: '您好，非常理解您的心情，请告诉我具体遇到了什么问题，我帮您找到最优解决方案', note: '不要一上来就同意或拒绝' },
        { title: '远程排查', description: '90%的退换货可以通过远程指导解决', script: '这个问题我见得比较多，大概率是XX原因，您帮我试一下XX操作，30秒就能确认', note: '远程排查能大幅降低退换货率' },
        { title: '方案确定', description: '根据排查结果确定处理方案', script: '如果确认是质量问题，我们提供XX方案；如果是设置问题，我帮您远程调好', note: '给客户选择权' },
        { title: '跟进回访', description: '处理完成后3天内回访', script: '您好，之前的问题现在解决了吗？还有其他需要帮忙的吗？', note: '回访是提升满意度的关键' },
      ],
    },
  ],
};

// ─── 模板B：团队管理起步包（面向主管） ───
const TEAM_MANAGEMENT: IndustryTemplate = {
  id: 'team-management',
  name: '团队管理起步包',
  description: '专为5-15人团队主管打造，帮你从自己干到带团队。包含KPI考核模板、3个管理SOP流程和7天新人培训计划，让团队快速运转起来。',
  contentSummary: '入门包全部话术 + 大促/差评/物流话术12条 + 3个管理SOP（投诉升级/大促备战/交接班）+ KPI考核指标模板 + 7天新人培训计划',
  icon: '👥',
  color: 'orange',
  targetUser: '团队主管/组长',
  teamSize: '5-15人',
  tags: ['团队管理', 'KPI考核', '新人培训'],
  phrases: [
    // 继承入门包全部话术
    ...STARTER_BATH.phrases,
    // 大促话术（4条）
    { category: '大促话术', content: '双十一活动来了！这款产品直降XX元，还送价值XX元的配件礼包，活动仅限今天！', tags: '限时活动' },
    { category: '大促话术', content: '您看的这款正在做活动，比平时省了XX元，还额外送XX，活动截止今晚24点，要抓紧哦', tags: '促单催付' },
    { category: '大促话术', content: '现在下单还能参加满减活动，满XX减XX，叠加优惠券更划算！', tags: '满减优惠' },
    { category: '大促话术', content: '大促期间订单量大，发货可能比平时晚1-2天，但我们会尽快安排，请谅解', tags: '物流说明' },
    // 差评应对（4条）
    { category: '差评应对', content: '非常抱歉给您带来了不好的体验，这个问题我已经记录下来了，一定帮您解决到满意为止', tags: '道歉安抚' },
    { category: '差评应对', content: '理解您的失望，我们确实做得不够好，但请您给我们一次弥补的机会，一定让您满意', tags: '请求机会' },
    { category: '差评应对', content: '感谢您的反馈，我们非常重视，已经安排专人跟进处理，会在24小时内给您答复', tags: '承诺时效' },
    { category: '差评应对', content: '您的问题我们已经内部讨论了处理方案：1.XX 2.XX，您看哪个方案更合适？', tags: '方案选择' },
    // 物流催单（4条）
    { category: '物流催单', content: '您好，我帮您查一下物流状态，请稍等', tags: '查询物流' },
    { category: '物流催单', content: '物流显示您的包裹目前在XX，预计XX天到达，旺季物流可能会稍慢一些，请您谅解', tags: '物流状态' },
    { category: '物流催单', content: '我已经帮您催促了快递公司，他们会优先处理，有最新进展我第一时间通知您', tags: '催促快递' },
    { category: '物流催单', content: '抱歉让您久等了！我这边已经加急处理，最快明天就能到', tags: '加急处理' },
  ],
  sops: [
    // 继承入门包SOP
    ...STARTER_BATH.sops,
    // 投诉升级处理
    {
      category: '售后流程',
      name: '投诉升级处理流程',
      role: '售后客服',
      scenario: '客户情绪激动或投诉升级时的处理流程',
      steps: [
        { title: '情绪安抚', description: '客户情绪激动时先安抚，不要争辩', script: '非常抱歉给您带来不好的体验，这个问题我一定帮您解决好，请告诉我详细情况', note: '先听客户说完，不要打断' },
        { title: '问题记录', description: '详细记录投诉内容', script: '', note: '记录越详细后续处理越高效' },
        { title: '权限内解决', description: '在自己权限范围内快速给出解决方案', script: '关于这个问题我可以为您做XX处理，您看是否可以接受？', note: '能自己解决就不要升级' },
        { title: '升级处理', description: '超出权限时升级到主管', script: '这个问题我已经升级给主管处理，24小时内会有人联系您', note: '升级后不能甩手不管' },
        { title: '结果确认', description: '处理完成后确认客户是否满意', script: '您好，之前投诉的问题已经处理完毕，方案是XX，请问您是否满意？', note: '不满意要继续跟进' },
      ],
    },
    // 大促备战
    {
      category: '大促流程',
      name: '大促备战与值班流程',
      role: '主管',
      scenario: '双十一/618等大促期间的团队管理和值班流程',
      steps: [
        { title: '大促前准备', description: '大促前3天完成：话术更新/快捷回复设置/库存确认/系统测试', script: '', note: '大促前的准备决定了大促期间的表现' },
        { title: '高峰值班', description: '大促当天按排班表值班，严禁脱岗', script: '', note: '午高峰12-14点和晚高峰20-22点必须满员在岗' },
        { title: '紧急处理', description: '遇到爆单/系统故障等紧急情况时', script: '', note: '紧急情况先稳住客户，再解决问题' },
        { title: '数据汇报', description: '每2小时汇报一次关键数据', script: '', note: '汇报内容：接单量/响应率/退换率/客诉数' },
        { title: '大促复盘', description: '大促结束后48小时内完成复盘', script: '', note: '复盘重点：哪些话术最有效/哪个环节最容易出错' },
      ],
    },
    // 交接班
    {
      category: '日常管理',
      name: '交接班标准流程',
      role: '组长',
      scenario: '早晚班交接时的标准操作流程',
      steps: [
        { title: '整理待办', description: '交班前10分钟整理本班次未完成的事项', script: '', note: '重点标注：未回复客户/在途异常件/待处理售后' },
        { title: '重点交接', description: '口头+书面双重交接关键信息', script: '今天有以下几件重要事项需要关注：1.XX 2.XX 3.XX', note: '口头交接不能省' },
        { title: '系统交接', description: '在工作群/系统中更新交接记录', script: '', note: '交接记录要具体' },
        { title: '接班确认', description: '接班人确认已了解所有待办事项', script: '收到，我已了解以上事项，会跟进处理', note: '接班人要主动追问不清楚的地方' },
      ],
    },
  ],
};

// ─── 模板C：体系搭建完整包（面向自学客户） ───
const FULL_SYSTEM: IndustryTemplate = {
  id: 'full-system',
  name: '体系搭建完整包',
  description: '专为自学客户打造，帮你搭建完整客服管理体系。包含成本管控话术、30条全场景话术、完整质检体系和定制化SOP，适合需要体系化运营的中大型团队。',
  contentSummary: '30条全场景话术（含成本管控+情绪安抚+升级处理）+ 5个完整SOP流程 + 质检评分体系 + 成本管控要点 + 新人45天培训路径',
  icon: '🏆',
  color: 'purple',
  targetUser: '自学客户/企业管理者',
  teamSize: '10-50人',
  tags: ['体系搭建', '质检体系', '成本管控', '自学专属'],
  phrases: [
    // 继承团队管理包全部话术（入门+大促+差评+物流 = 30条）
    ...TEAM_MANAGEMENT.phrases,
  ],
  sops: [
    // 继承团队管理包全部SOP（入门2个+管理3个 = 5个）
    ...TEAM_MANAGEMENT.sops,
    // 定制方案沟通流程
    {
      category: '售前流程',
      name: '定制方案沟通流程',
      role: '售前客服',
      scenario: '客户咨询定制产品时的方案沟通和确认流程',
      steps: [
        { title: '需求收集', description: '收集客户户型、风格偏好、预算范围', script: '您好，定制产品需要了解您的户型和风格，方便发一下户型图吗？', note: '户型图是最关键的信息' },
        { title: '上门量尺', description: '安排师傅上门精准量尺，出具尺寸报告', script: '我们提供免费上门量尺服务，师傅会帮您精准测量每个卫生间的尺寸', note: '量尺精度决定定制效果' },
        { title: '方案确认', description: '与客户确认方案细节，修改至满意', script: '您的定制方案已经出图了，我发给您确认一下，有任何需要调整的地方随时告诉我', note: '确认后再下单，避免修改' },
        { title: '签约下单', description: '方案确认后签约并安排生产', script: '', note: '签约时确认交付时间和付款方式' },
      ],
    },
    // 定制产品交付流程
    {
      category: '售中流程',
      name: '定制产品交付流程',
      role: '售中客服',
      scenario: '从签约到安装的交付跟进流程',
      steps: [
        { title: '生产跟进', description: '定期跟进生产进度并同步客户', script: '您的定制产品正在生产中，预计XX号完成', note: '每周至少同步一次进度' },
        { title: '到货验收', description: '产品到货后协助客户验收', script: '您好，定制产品已经到货，请检查外观和配件是否齐全', note: '到货即验，有问题早发现' },
        { title: '安装协调', description: '协调安装师傅和客户时间', script: '您好，我帮您预约安装师傅，请问您方便的时间是？', note: '安装前确认施工条件已满足' },
        { title: '安装验收', description: '安装完成后逐项验收', script: '', note: '验收表逐项确认，客户签字存档' },
        { title: '售后建档', description: '为整屋产品建立售后档案', script: '', note: '档案包含：方案图、产品清单、安装照片' },
      ],
    },
    // 质检体系流程
    {
      category: '日常管理',
      name: '客服质检标准流程',
      role: '主管',
      scenario: '对客服对话进行质量检查和评分的流程',
      steps: [
        { title: '抽样选取', description: '每天抽取每位客服3-5条对话进行质检', script: '', note: '重点抽检：差评对话、超时对话、投诉对话' },
        { title: '维度评分', description: '按5个维度评分：响应速度/服务态度/专业程度/问题解决/合规性', script: '', note: '每个维度1-5分，总分25分' },
        { title: '问题标注', description: '标注对话中的关键问题和改进点', script: '', note: '用颜色标记：红色=严重问题/黄色=需改进/绿色=优秀' },
        { title: '反馈面谈', description: '与被质检客服进行1对1反馈', script: '', note: '先肯定优点，再指出问题，最后给改进建议' },
        { title: '改进追踪', description: '追踪改进效果，一周后复检', script: '', note: '连续2周低于18分需安排培训' },
      ],
    },
  ],
};

// 导出所有模板
export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  STARTER_BATH,
  TEAM_MANAGEMENT,
  FULL_SYSTEM,
];

// 按ID查找模板
export function getTemplateById(id: string): IndustryTemplate | undefined {
  return INDUSTRY_TEMPLATES.find(t => t.id === id);
}

// 获取模板统计摘要
export function getTemplateSummary(template: IndustryTemplate) {
  const phraseCategories = [...new Set(template.phrases.map(p => p.category))];
  const sopCategories = [...new Set(template.sops.map(s => s.category))];
  return {
    phraseCount: template.phrases.length,
    phraseCategories,
    sopCount: template.sops.length,
    sopCategories,
    totalSteps: template.sops.reduce((sum, s) => sum + s.steps.length, 0),
  };
}
