/**
 * 每日一练习题库
 * 每门课3-5道题，按学习阶段分组
 * 题型：scenario(情景判断), choice(选择题), short_answer(简答题)
 */

export interface PracticeQuestion {
  lessonNumber: string;
  questionType: 'scenario' | 'choice' | 'short_answer';
  question: string;
  options?: string[]; // 选择题选项
  correctHint: string; // 正确答案提示（用于AI评价参考）
  stage: number;
}

export const PRACTICE_QUESTIONS: PracticeQuestion[] = [
  // ===== 阶段1：角色认知 =====
  // 1.1 客服主管到底管什么
  { lessonNumber: '1.1', questionType: 'scenario', stage: 1,
    question: '你刚上任客服主管，发现团队里老员工小张经常帮别人处理问题，但自己的KPI反而完成得不好。你应该怎么做？',
    correctHint: '应该明确分工边界，让小张专注自己职责，同时把他帮人的经验转化为SOP共享给团队，实现"一个人会→全员都会"' },
  { lessonNumber: '1.1', questionType: 'choice', stage: 1,
    question: '客服主管每天到公司，第一件事应该做什么？',
    options: ['A. 立刻处理积压的客户问题', 'B. 看昨日数据→开5分钟早会→分配当日任务', 'C. 检查每个客服的聊天记录', 'D. 回复老板的消息和邮件'],
    correctHint: '正确答案是B。主管第一步是掌握全局数据，通过早会同步信息，再分配任务。直接处理问题是执行者思维。' },
  { lessonNumber: '1.1', questionType: 'scenario', stage: 1,
    question: '你发现团队里有个新人什么问题都来问你，已经严重影响了你自己的工作。你该怎么处理？',
    correctHint: '应该建立话术库+SOP让新人自己查，同时安排老员工带教，而不是一直自己解答。这是"什么都自己干"的典型坑。' },
  { lessonNumber: '1.1', questionType: 'choice', stage: 1,
    question: '以下哪个是新手主管最容易犯的致命错误？',
    options: ['A. 过度关注数据', 'B. 什么都自己干，团队不成长', 'C. 每天开早会', 'D. 制定KPI考核'],
    correctHint: '正确答案是B。什么都自己干→团队不成长，你累死。这是新手主管三大致命坑之首。' },

  // 1.2 话术标准化
  { lessonNumber: '1.2', questionType: 'scenario', stage: 1,
    question: '一个客户来咨询马桶尺寸，你的客服直接回复"建议您量一下坑距"。客户觉得不专业，转去别家了。正确的话术应该怎么说？',
    correctHint: '应该先共情确认需求："您选的马桶型号非常畅销"，再给出专业引导："为了确保安装合适，麻烦您测量一下排污口中心到墙面的距离，也就是坑距，我帮您确认是否匹配"，最后确认"您方便测量一下吗？我等您"' },
  { lessonNumber: '1.2', questionType: 'choice', stage: 1,
    question: '话术的通用公式是什么？',
    options: ['A. 问需求→推产品→催下单', 'B. 共情→确认→方案→确认→收尾', 'C. 介绍产品→报价格→等回复', 'D. 打招呼→问问题→给建议'],
    correctHint: '正确答案是B。共情→确认→方案→确认→收尾是全场景通用话术公式。' },
  { lessonNumber: '1.2', questionType: 'scenario', stage: 1,
    question: '你发现客服小李用自己的话术回复客户，转化率比用标准话术的同事低30%。你应该怎么处理？',
    correctHint: '不要直接禁止用个人话术，应该先用数据对比让他看到差距，再分析标准话术为什么更有效，让他理解并自愿使用。同时可以收集他话术中好的部分优化标准话术。' },

  // 1.3 质检入门
  { lessonNumber: '1.3', questionType: 'scenario', stage: 1,
    question: '你抽查客服小王的聊天记录，发现他对客户说话很礼貌但问题没解决，客户最后说了句"算了我自己想办法"就走了。质检评分你给他多少分？',
    correctHint: '态度维度可能15-17分，但问题解决维度只有8-10分，总分可能22-27分，低于合格线。质检不是只看态度，问题没解决就是不合格。' },
  { lessonNumber: '1.3', questionType: 'choice', stage: 1,
    question: '客服质检5大维度中，哪个维度权重应该最高？',
    options: ['A. 响应速度', 'B. 服务态度', 'C. 问题解决', 'D. 话术规范', 'E. 合规性'],
    correctHint: '每个维度20分没有权重差异，但问题解决是最核心的衡量标准——客户找客服是为了解决问题，态度再好问题没解决也不合格。' },
  { lessonNumber: '1.3', questionType: 'scenario', stage: 1,
    question: '质检发现某客服连续3周评分低于12分（合格线）。你该怎么处理？',
    correctHint: '应启动低分整改闭环：发现→分析原因→制定改进方案→跟踪复检→确认提升。可能是能力问题需要培训，也可能是态度问题需要沟通。' },

  // 1.4 售后成本管控
  { lessonNumber: '1.4', questionType: 'scenario', stage: 1,
    question: '客户说花洒漏水要求全额退款，你的客服没有要求拍照取证就直接同意退款了。这个处理有什么问题？',
    correctHint: '这是典型的"客户说坏就赔"隐形亏损。应该先要求拍照/视频取证→对照问题分类表→按SOP判定。没有核实直接赔付是最常见的成本浪费。' },
  { lessonNumber: '1.4', questionType: 'choice', stage: 1,
    question: '客服的赔付权限上限应该是多少？',
    options: ['A. 无上限，看情况决定', 'B. 50元以内，超出必须上报', 'C. 200元以内，超出上报', 'D. 客服无权赔付，全部上报'],
    correctHint: '正确答案是B。客服仅可处理50元以内补偿，超出必须上报主管。建立赔付权限分级是成本管控的基础。' },
  { lessonNumber: '1.4', questionType: 'scenario', stage: 1,
    question: '你发现同一个产品上周有3个客户反馈同样的质量问题，但每次都是不同客服处理、分别赔付。你该怎么处理？',
    correctHint: '这是重复售后不追溯的问题。应该建立追溯机制：发现同类问题→找到根因（产品批次/安装方式）→一次性解决→通知所有客服按统一方案处理。' },

  // ===== 阶段2：目标管理 =====
  // 2.1 新人7天速成法
  { lessonNumber: '2.1', questionType: 'scenario', stage: 2,
    question: '新人入职第3天，你考核发现他连5个常见问题都答不上来，但培训计划写的是"Day3应能独立回答5个常见问题"。是计划有问题还是新人有问题？',
    correctHint: '先看培训执行是否到位（有没有按时学习+练习），再看新人是否认真对待。多数情况是培训方法问题——可能缺少跟班观摩和模拟练习环节。' },
  { lessonNumber: '2.1', questionType: 'choice', stage: 2,
    question: '缩短新人培训周期最有效的技巧是什么？',
    options: ['A. 增加培训时长', 'B. 让老员工1对1带', 'C. 先学高频场景，低频场景后补', 'D. 多做考试测验'],
    correctHint: '正确答案是C。先学高频场景能最快让新人上手，低频场景可以后续补充。这是缩短培训周期的核心技巧。' },
  { lessonNumber: '2.1', questionType: 'scenario', stage: 2,
    question: '新人Day5质检评分只有10分（合格线12分），按计划Day7就要考核上岗。你该怎么调整？',
    correctHint: '不要硬推进度。分析低分原因：如果是话术不熟→加练话术；如果是业务理解不足→针对性补课。可以延长1-2天培训，比让不合格的人上岗出问题好。' },

  // 2.2 排班
  { lessonNumber: '2.2', questionType: 'choice', stage: 2,
    question: '客服排班的3大核心原则是什么？',
    options: ['A. 人数均分+轮流+固定班次', 'B. 忙时覆盖+技能搭配+公平轮换', 'C. 老员工白班+新人夜班+主管随时', 'D. 按业绩排班+按入职时间+按自愿'],
    correctHint: '正确答案是B。忙时覆盖确保人手、技能搭配确保每个班次能处理各类问题、公平轮换避免固定人吃亏。' },
  { lessonNumber: '2.2', questionType: 'scenario', stage: 2,
    question: '团队日均咨询量200单，人均日接待量50单。按排班公式，你至少需要多少人？',
    correctHint: '所需人数 = 200÷50×1.2 = 4.8人，取整5人。1.2是留20%缓冲。' },
  { lessonNumber: '2.2', questionType: 'scenario', stage: 2,
    question: '客服小王投诉说连续3个周末都排他值班，但排班表显示其他同事也有周末班。问题可能出在哪？',
    correctHint: '可能是排班没有公平轮换机制。即使排班表上看起来公平，实际执行可能老员工换班导致新人多值。应建立提前3天申请换班+主管统筹的机制。' },

  // 2.3 分工
  { lessonNumber: '2.3', questionType: 'scenario', stage: 2,
    question: '你团队有个客服特别擅长处理投诉，结果所有投诉都转给他，他已经快崩溃了。你怎么调整？',
    correctHint: '这是分工不合理的典型问题。应该：1.把投诉处理方法提炼成SOP 2.开展投诉处理专项培训 3.建立投诉分配轮转机制。不能把压力集中在一个人身上。' },
  { lessonNumber: '2.3', questionType: 'choice', stage: 2,
    question: '客服团队分工调整的信号是什么？',
    options: ['A. 员工主动要求换岗位', 'B. 某人总是被升级问题找/某岗位闲到刷手机/客户问题在团队内转来转去', 'C. 月度KPI不达标', 'D. 团队离职率上升'],
    correctHint: '正确答案是B。这三个信号分别说明：分工不合理或能力不匹配/人多了或任务分配不均/分工边界不清。' },
  { lessonNumber: '2.3', questionType: 'scenario', stage: 2,
    question: '售前客服请假了，售后客服顶上去但完全不知道怎么促单，丢了3个意向客户。你该怎么避免这种事再发生？',
    correctHint: '应该建立岗位交叉培训方案：每季度1次交叉培训，售后学售前、售前学售后，确保任何1人请假其他人能顶上80%的常见问题。' },

  // 2.4 早会
  { lessonNumber: '2.4', questionType: 'scenario', stage: 2,
    question: '你的早会总是开成汇报会，每个人轮流说一遍昨天做了什么，开了20分钟还没完。怎么改进？',
    correctHint: '改用5分钟结构：1分钟数据速报+1分钟今日重点+1分钟待整改+1分钟知识分享+1分钟确认。早会是同步不是汇报，只说关键信息。' },
  { lessonNumber: '2.4', questionType: 'choice', stage: 2,
    question: '高效早会的第一分钟应该说什么？',
    options: ['A. 每人汇报昨天工作', 'B. 核心3个数字：接待量/响应率/异常数', 'C. 批评昨天犯错的人', 'D. 讨论今天的工作细节'],
    correctHint: '正确答案是B。第一分钟只说3个核心数字+1个异常，快速掌握全局，不要念完整报表。' },
  { lessonNumber: '2.4', questionType: 'scenario', stage: 2,
    question: '早会提出的问题，到下午还没人跟进，第二天早会又提一遍。怎么打破这个循环？',
    correctHint: '建立问题跟进闭环：早会提的问题→中午前有进展→下午下班前闭环。没闭环的第二天第一个提。每周五统计未闭环问题数，超5个反思流程。' },

  // ===== 阶段3：团队带教 =====
  // 3.1 沟通
  { lessonNumber: '3.1', questionType: 'scenario', stage: 3,
    question: '老板说"这个月退款率必须降到5%"，目前是12%。你该怎么回复？',
    correctHint: '用向上汇报公式：确认目标可行性→拆解成可执行计划→要资源。示例："5%的目标我理解方向，目前12%，达成5%需要XX支持和XX时间。分3步：第1周XX→第2周XX→第3周XX，每步预计降X%。"' },
  { lessonNumber: '3.1', questionType: 'choice', stage: 3,
    question: '跟员工沟通新要求时，最重要的是先说什么？',
    options: ['A. 这是公司规定', 'B. 为什么这样做（原因和好处）', 'C. 不做的后果', 'D. 具体怎么做'],
    correctHint: '正确答案是B。先说清楚为什么，让员工理解背后的逻辑，而不是觉得"又加活了"。确认他听懂了要问"你打算怎么做？"而不是"听懂了吗？"' },
  { lessonNumber: '3.1', questionType: 'scenario', stage: 3,
    question: '你需要仓库配合在出库时核对型号，但仓库不配合。你怎么沟通？',
    correctHint: '跨部门协作3原则：1.先说对方利益："出库核对能减少40%退换货，你们也少处理退货入库" 2.给具体方案不要模糊请求："帮我做这3件事①②③" 3.留书面记录' },

  // 3.2 情绪管理
  { lessonNumber: '3.2', questionType: 'scenario', stage: 3,
    question: '客服小李在工位上突然摔了鼠标，大声说"这个客户太过分了"。你应该怎么做？',
    correctHint: '3步急救：1.隔离（30秒内）——"跟我来一下"，带离工位 2.倾听（3分钟只听不说）——"发生什么事了，你说，我听着" 3.定方案——给出具体处理步骤+让小李休息15分钟' },
  { lessonNumber: '3.2', questionType: 'choice', stage: 3,
    question: '员工情绪崩溃时，以下哪句话绝对不能说？',
    options: ['A. "发生什么事了？"', 'B. "别哭了，至于吗"', 'C. "我理解你的感受"', 'D. "你先休息15分钟"'],
    correctHint: '正确答案是B。"至于吗"是轻视感受，属于5句绝对不能说的话之一。其他禁语还有"别哭了""我也很累""你想怎样""以前我们更苦"。' },
  { lessonNumber: '3.2', questionType: 'scenario', stage: 3,
    question: '大促期间团队连续加班3天，士气很低。你该怎么疏导？',
    correctHint: '高压期特殊处理：提前告知压力期+承诺结束后的休息安排。强制轮休哪怕人手紧。被大客投诉后主管先接手让当事客服喘口气。' },

  // 3.3 5个最难搞场景
  { lessonNumber: '3.3', questionType: 'scenario', stage: 3,
    question: '一个客户连打5个电话，每个客服骂一遍，还威胁要曝光到平台总部。你的客服都怕接这个电话。你怎么处理？',
    correctHint: '恶意投诉三步法：1.先接住情绪"我理解您非常生气，换我遇到也会恼火" 2.锁定核心诉求"您最希望我们解决哪个问题？" 3.给出时间承诺。恶意投诉客户要的不是道歉，是有人在替他解决问题。' },
  { lessonNumber: '3.3', questionType: 'scenario', stage: 3,
    question: 'VIP客户说"我一年买几十万，这点问题不解决我全退了"。你的客服想直接给特殊处理。你该怎么指导？',
    correctHint: '大客户要挟正确应对：1.确认价值不确认威胁"感谢您一直以来的支持" 2.回归标准流程"正常方案是XX，我能为您做的是XX" 3.向上升级超出权限的。在标准内给最优解=重视，破例=被拿捏。' },
  { lessonNumber: '3.3', questionType: 'scenario', stage: 3,
    question: '核心客服突然告诉你"我在考虑其他机会"。你怎么回应？',
    correctHint: '留人正确做法：1.先搞清楚原因"是什么让你考虑换的？我真心想了解" 2.对症下药：钱的问题→谈涨薪方案；成长问题→给新挑战；心委屈了→解决具体事 3.如果真要走体面送别。留人要靠平时不是靠走的时候。' },

  // 3.4 KPI
  { lessonNumber: '3.4', questionType: 'choice', stage: 3,
    question: '团队4大核心考核指标中，首次响应时长的合理区间是？',
    options: ['A. 售前<1分钟，售后<5分钟', 'B. 售前<30秒，售后<2分钟', 'C. 都不超过5分钟', 'D. 售前<2分钟，售后<10分钟'],
    correctHint: '正确答案是B。售前<30秒，售后<2分钟。响应速度直接影响客户体验和转化率。' },
  { lessonNumber: '3.4', questionType: 'scenario', stage: 3,
    question: '你的团队解决率目前75%，你想定85%的KPI目标。应该怎么设定？',
    correctHint: '用KPI制定5步法：定方向→算基线(75%)→设目标(分2个月：第1月80%，第2月85%)→拆到个人(老员工目标+5%，新人-10%)→定奖惩。不要一步到位，提升10-20%为合理范围。' },
  { lessonNumber: '3.4', questionType: 'scenario', stage: 3,
    question: '某个客服KPI连续2个月差15%以上，你该怎么处理？',
    correctHint: '差15%以上属于第三档，应考虑调岗或淘汰。但在此之前要确认：是能力问题还是态度问题？是否给过1对1辅导？是否有改善的机会？' },

  // ===== 阶段4：业务落地 =====
  // 4.1 SOP
  { lessonNumber: '4.1', questionType: 'scenario', stage: 4,
    question: '你写了一份10页的退换货SOP发给团队，结果没人看。问题出在哪？怎么改？',
    correctHint: '好的SOP有3个标准：新人看得懂、照着做不出错、愿意执行。10页SOP没人看是因为太长了。改用三段式：处理原则(1-2句话)+分步操作(步骤表格)+结果判定(成功/失败标准)。' },
  { lessonNumber: '4.1', questionType: 'choice', stage: 4,
    question: 'SOP写完后，让员工执行最关键的两步是什么？',
    options: ['A. 发邮件通知+定期检查', 'B. 带跑1遍+检查3次(第1/3/7天)', 'C. 开会讲解+设置奖惩', 'D. 打印张贴+随机抽查'],
    correctHint: '正确答案是B。写完SOP只是10%，让员工执行才是90%。带跑1遍让员工理解为什么，检查3次(第1天看、第3天查、第7天看数据)确保落地。' },
  { lessonNumber: '4.1', questionType: 'scenario', stage: 4,
    question: '退换货SOP写好了，你打算怎么定义"处理成功"？',
    correctHint: '结果判定应明确：✅成功=客户接受方案，24小时内关闭工单 ❌失败=客户二次投诉/超48小时未关闭。明确的成功/失败标准才能判断执行效果。' },

  // 4.2 数据
  { lessonNumber: '4.2', questionType: 'scenario', stage: 4,
    question: '你发现本周退款率连续3天上升了0.5%，目前还在"正常范围"内。你需要关注吗？',
    correctHint: '需要关注。连续3天趋势偏离=可能是系统性问题，不能等到超目标才处理。应该溯源：哪个指标？哪个时间点开始？涉及哪个班组/客服/商品？' },
  { lessonNumber: '4.2', questionType: 'choice', stage: 4,
    question: '主管每天只需要看1分钟的是哪张表？',
    options: ['A. 周数据趋势', 'B. 月度KPI达成表', 'C. 日数据速览', 'D. 成本异常表'],
    correctHint: '正确答案是C。日数据速览只需看3个数字：当日工单量变化、首次响应时长、未关闭工单数。1分钟就够。' },
  { lessonNumber: '4.2', questionType: 'scenario', stage: 4,
    question: '你发现某个客服这周客户投诉突然变多了，比上周翻了1倍。你怎么分析原因？',
    correctHint: '数据异常快速溯源3步：1.定位（哪个指标？什么时间开始？涉及谁？）2.归因（偶发还是趋势？人的问题还是流程/产品问题？）3.输出1页式问题整改报告。可能是情绪/私人问题导致。' },

  // 4.3 体系自检
  { lessonNumber: '4.3', questionType: 'choice', stage: 4,
    question: '管理体系自检的10条实用性自查中，第1条检查的是什么？',
    options: ['A. 新人7天能否上岗', 'B. 话术库是否覆盖80%以上常见场景且近1月有更新', 'C. 质检是否每周执行', 'D. KPI是否每月复盘'],
    correctHint: '正确答案是B。话术库覆盖率和更新频率是最基础的自检项，没有话术库其他都白搭。' },
  { lessonNumber: '4.3', questionType: 'scenario', stage: 4,
    question: '你的团队10条自查过了8条，12条灵魂问只过了6条。这个体系健康吗？',
    correctHint: '10条过了8条=基本健康，但有2个短板需要补。12条灵魂问只过6条=健康度刚过半，说明体系表面可用但深层有问题，需要重点看数据逻辑和付费留存维度。' },
  { lessonNumber: '4.3', questionType: 'choice', stage: 4,
    question: '体系自检的迭代节奏中，每季度应该做什么？',
    options: ['A. 质检数据回顾+话术微调', 'B. 10问自查+KPI复盘', 'C. 12问深检+体系升级', 'D. 全量重新诊断'],
    correctHint: '正确答案是C。每周质检回顾，每月10问自查，每季度12问深检+体系升级，每半年全量重新诊断。' },

  // 4.4 从主管到操盘手
  { lessonNumber: '4.4', questionType: 'choice', stage: 4,
    question: '操盘手和主管最核心的区别是什么？',
    options: ['A. 操盘手工资更高', 'B. 操盘手管的团队更大', 'C. 操盘手知道该干啥，主动发现/优化/要资源', 'D. 操盘手不用处理客户问题'],
    correctHint: '正确答案是C。主管是"老板让干啥就干啥"，操盘手是"知道该干啥，主动发现问题、主动优化、主动要资源"。是思维方式的变化，不是职级变化。' },
  { lessonNumber: '4.4', questionType: 'scenario', stage: 4,
    question: '你刚完成4阶段25节课的学习，3个月后你的目标应该是什么？',
    correctHint: '3个月目标是"稳住基本盘"：搭完话术库+质检+成本管控，团队不再救火，退款率降20%+。6个月→团队自运转，1年→体系可复制。' },
  { lessonNumber: '4.4', questionType: 'scenario', stage: 4,
    question: '你发现自己的时间50%都在处理客户问题。这说明什么？怎么调整？',
    correctHint: '说明你还是"超级客服"不是主管。理想分配：30%关键事务+40%团队管理+20%流程优化+10%自我提升。应该把简单事务授权给团队，建立SOP，你从"做的人"变成"查的人"。' },
];

/**
 * 根据用户学习阶段获取题目池
 * 优先从当前阶段出题，如果当前阶段题做完了再从其他阶段补充
 */
export function getQuestionsForStage(stage: number, completedLessonNumbers: Set<string>): PracticeQuestion[] {
  // 优先当前阶段未完成课程的题目
  const stageQuestions = PRACTICE_QUESTIONS.filter(q => q.stage === stage);
  // 再其他阶段
  const otherQuestions = PRACTICE_QUESTIONS.filter(q => q.stage !== stage);
  // 优先从已学课程的题目出题（强化巩固），再从未学课程（预习）
  const learnedFirst = (questions: PracticeQuestion[]) => {
    const learned = questions.filter(q => completedLessonNumbers.has(q.lessonNumber));
    const notLearned = questions.filter(q => !completedLessonNumbers.has(q.lessonNumber));
    return [...learned, ...notLearned];
  };

  return [...learnedFirst(stageQuestions), ...learnedFirst(otherQuestions)];
}

/**
 * 随机选取一道题（基于日期做seed保证同一天同一用户出同一题）
 */
export function pickDailyQuestion(
  questions: PracticeQuestion[],
  userId: string,
  dateStr: string
): PracticeQuestion | null {
  if (questions.length === 0) return null;
  // 简单hash做seed
  let hash = 0;
  const seed = userId + dateStr;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % questions.length;
  return questions[index];
}
