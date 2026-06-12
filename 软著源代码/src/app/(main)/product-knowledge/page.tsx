'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  ClipboardPaste,
  Shield,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataSecurityBadge } from '@/components/data-security-badge';

/* ===================== 类型定义 ===================== */
interface KnowledgeItem {
  id?: string;
  category: string;
  title: string;
  summary?: string;
  content: string;
  tags?: string;
  is_preset?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface CustomKnowledgeItem {
  id: string;
  company_id: string;
  title: string;
  content: string;
  category: string;
  tags?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/* ===================== 系统预设知识�?9条） ===================== */
const PRODUCT_KNOWLEDGE: KnowledgeItem[] = [
  // ── 产品材质�?条）──
  { category: '产品材质', title: '陶瓷主体材质', summary: '采用高温烧制微晶抗污釉面陶瓷，吸水率�?.15%', content: '1280°C高温烧制�?4小时缓慢冷却。三层施釉：底釉�?微晶抗污釉层(Ra�?.1μm)/智洁釉层(纳米级自�?。吸水率�?.15%，莫氏硬度≥6级，抗裂温度差≥110°C，釉面厚�?.8-1.2mm。釉面添加抗霉因子，日常用中性清洁剂擦拭，禁用强酸强碱或钢丝球�? },
  { category: '产品材质', title: '座圈材质', summary: 'PP抗菌座圈，抗菌率�?9%，通过SGS认证', content: '食品级PP材质，不含BPA。银离子抗菌，抗菌率�?9%(大肠杆菌、金黄色葡萄球菌)，SGS认证+RoHS。耐温-20°C�?00°C，抗UV不发黄。人体工学弧度，缓降阻尼铰链，壁�?mm承重150kg，快拆设计�? },
  { category: '产品材质', title: '喷嘴材质', summary: '304不锈钢喷�?紫外线杀菌，自洁与抑菌双保险', content: '304不锈钢外�?UV-C(254nm)杀菌，使用前后自动照射30秒。喷嘴自�?�?银离子涂层。臀�?种水型，妇洗3种水型，水温4档可调�? },
  { category: '产品材质', title: '遥控器材�?, summary: 'ABS防火遥控器，IPX5防水，背光显�?, content: 'ABS防火外壳(V-0�?+钢化玻璃面板+硅胶按键+LED背光LCD屏。IPX5防水�?�?号电池续航约12个月。功能区：冲水控�?清洗功能/设置�?4组用户记忆键�? },
  { category: '产品材质', title: '水箱与管路材�?, summary: 'PP水箱+硅胶密封+不锈钢进水阀，耐压1.0MPa', content: '食品级PP箱体(壁厚3mm)+医用级硅胶密封圈(寿命�?0�?+304不锈钢浮球阀(耐压1.0MPa)。管路：304不锈钢编织软�?PE-Xa交联聚乙�?黄铜镀镍连接件。双重防�?防虹�?过压保护�? },
  { category: '产品材质', title: '加热模块材质', summary: '即热式陶瓷加热芯�?秒出热水，热效率�?8%', content: 'PTC陶瓷发热体，即热�?400W/储热�?00W，热效率�?8%�?档水温。即热式3秒出热水。防干烧/漏电保护(�?0mA)/超温保护(>45°C断电)/IPX7防水。座圈加热：碳纤维面状发热膜45W�?档温�?0-40°C�? },
  // ── 核心性能�?条）──
  { category: '核心性能', title: '水压冲水性能', summary: '超漩冲水技术，单次冲水�?.0L，冲洗覆盖率100%', content: '超漩虹吸�?喷射助冲双引擎。大�?.0L/小冲3.0L，噪音≤55dB/�?8dB，适用水压0.05-0.75MPa。无棱内�?60°旋转+底部喷射助冲，冲洗覆盖率100%。国家一级水效�? },
  { category: '核心性能', title: '暖风烘干性能', summary: 'PTC暖风烘干�?档风温，10分钟自动关闭', content: 'PTC陶瓷发热+直流无刷涡轮风扇�?档风�?常温/45°C/55°C)，风�?.5m³/min�?0分钟自动关闭，功�?00W�? },
  { category: '核心性能', title: '除臭性能', summary: '活性炭+光触媒双重除臭，15分钟去除异味率≥95%', content: '活性炭+光触�?TiO�?+负离�?�?00万个/cm³)三重净化�?5分钟异味去除率≥95%，滤芯寿命约12个月。落座自动启动，离座延时3分钟关闭�? },
  { category: '核心性能', title: '智能感应性能', summary: '6组红外感应器，响应时间≤0.5秒，5种感应模�?, content: '接近感应(微波雷达1.5m)+落座感应(红外�?.3�?+离座感应+脚感感应+防误触感应�?种模式：全自�?半自�?脚感/遥控/夜间。待机功耗≤0.5W�? },
  { category: '核心性能', title: '泡沫盾性能', summary: '纳米级泡沫覆盖，防溅隔臭，单次发泡量200ml', content: '微孔发泡�?文丘里混合器。单�?00ml泡沫，覆盖率�?5%水面，持续约30分钟。防�?隔臭+防粘+抑菌(�?0%)。发泡液480ml/瓶约60次�? },
  { category: '核心性能', title: '遥控信号性能', summary: '2.4GHz无线遥控，有效距�?0m�?组用户记�?, content: '2.4GHz ISM频段，空旷≥10m，自动对码一机一码，跳频扩频抗干扰，响应�?00ms�?组独立用户配置，断电不丢失�?号电池�?续航�?2个月�? },
  // ── 规格尺寸�?条）──
  { category: '规格尺寸', title: '整体尺寸规格', summary: '标准�?80×410×460mm、小户型588×375×450mm', content: '标准�?80×410×460mm(净�?5kg)，适配坑距305/400mm。小户型588×375×450mm(净�?8kg)。加大款700×415×480mm(净�?8kg)。安装要求：两侧各留�?5cm，前方≥60cm�? },
  { category: '规格尺寸', title: '排污口规�?, summary: '标准排污口径100mm，支�?05/400坑距', content: '排污口径100mm，虹吸式排污，坑�?05/400mm。坑距测量：地面排污管中心到贴砖后墙面，280-340mm�?05坑距�?70-430mm�?00坑距�? },
  { category: '规格尺寸', title: '水电接口规格', summary: '进水�?/2寸，电压220V/50Hz，功�?400W', content: '水路：进水管1/2�?4分接�?，水�?.05-0.75MPa。电路：AC 220V/50Hz，即热式1400W�?0A三孔接地插座，内置≤10mA漏保。插座建议：距马�?.5-1.0m，离�?0-40cm�? },
  // ── 安全能效�?条）──
  { category: '安全能效', title: '电气安全等级', summary: 'IPX4整机防水+IPX7加热模块，内置漏电保护≤10mA', content: '防水：整机IPX4/加热模块IPX7/遥控器IPX5。漏电保护：内置�?0mA，动作≤0.1秒�?C认证。多重保护：防干�?超温/防冻/童锁/V-0级阻燃�? },
  { category: '安全能效', title: '能效等级与功�?, summary: '国家一级水效，待机功耗≤0.5W，月电费�?-8�?, content: '国家一级水效，平均冲水量≤4.0L/次，比传统马桶节�?0%。待机≤0.5W，日均约0.3度，月电费约5-8元。节能：离座5分钟自动降待�?智能预约/深度休眠�? },
  { category: '安全能效', title: '质保与认证信�?, summary: '整机5年质保，核心部件10年，3C/CQC/SGS认证', content: '质保：整�?�?核心部件10�?陶瓷体终身。认证：3C/CQC节水/SGS抗菌/RoHS/CE/ISO9001。售后：7天无理由/30天质量问题包退/质保期免费上门�? },
  { category: '安全能效', title: '防冻保护功能', summary: '环境低于5°C自动加热，低�?°C自动排水防冻�?, content: '防冻逻辑�?5°C座圈自动低档加热�?0°C自动启动排水�?-5°C完全排空模式。冬季建议保持卫生间>0°C/长期外出手动排水�? },
  // ── 出厂配件�?条）──
  { category: '出厂配件', title: '标准配件清单', summary: '含进水软�?角阀/遥控�?密封圈等12件套', content: '标配12件：进水软管×1/角阀×1/遥控器�?(含壁挂支�?/7号电池�?/法兰密封圈�?/安装螺栓×2/膨胀管�?/美容盖�?/生料带�?/说明书�?/保修卡�?/合格证�?�? },
  { category: '出厂配件', title: '滤芯规格', summary: 'PP棉前�?活性炭双滤芯，寿命3-12个月', content: '第一级PP�?5μm)+第二级椰壳活性炭+第三级超滤膜(0.01μm)。寿命：PP�?-6个月/活性炭6-12个月/超滤�?2-24个月�? },
  { category: '出厂配件', title: '发泡液规�?, summary: '植物基发泡液480ml/瓶，续航�?0�?, content: '容量480ml/瓶，植物�?银离�?保湿因子，pH5.5-6.5，保质期36个月，续航约60次。请用原装发泡液，第三方可能发泡不良�? },
  { category: '出厂配件', title: '遥控器与电池规格', summary: '2.4GHz遥控�?7号电池�?，续航约12个月', content: '2.4GHz射频遥控器，ABS防火外壳+钢化玻璃面板，IPX5防水，LED背光LCD屏，按键寿命�?0万次�?�?号电池续航约12个月�? },
  // ── 功能配件�?条）──
  { category: '功能配件', title: '妇洗喷嘴配件', summary: '医用级硅胶喷头，3种水型，可拆卸更�?, content: '医用级硅�?304不锈钢，3种水�?标准/柔和/按摩)�?档水压，4档水温，前后5档位置可调。适用：生理期护理/孕期卫生/日常清洁�? },
  { category: '功能配件', title: '夜灯配件', summary: 'LED柔光夜灯�?色温可调，人感自动亮�?, content: 'LED贴片灯珠�?档色�?暖白/自然�?冷白)�?.5W功耗，寿命�?0000小时。智能控制：环境暗时自动开�?人接近调�?白天自动关闭�? },
  { category: '功能配件', title: '增压泵配�?, summary: '内置增压泵，适用低水�?.05MPa�?, content: '直流无刷微型增压泵，进水0.05MPa→出�?.3MPa，流�?L/min，功�?0W，噪音≤40dB。适用：水�?0.1MPa的老旧小区/高层/水压不稳环境�? },
  { category: '功能配件', title: '无线遥控器扩�?, summary: '支持添加副遥控器，最多配�?�?, content: '每台马桶最多配�?个遥控器(�?�?，功能完全相同。配对：长按机身侧面配对�?秒→30秒内按副遥控器任意键�? },
  { category: '功能配件', title: '智能音箱联动', summary: '支持小爱/天猫精灵/小度/华为小艺语音控制', content: '支持平台：小米小�?天猫精灵/小度音箱/华为小艺。需WiFi(2.4GHz)+WiFi版型号。语音指令："打开马桶�?/"冲水"/"座圈加热打开"等�? },
  { category: '功能配件', title: '自动除垢模块', summary: '内置电解水除垢，抑菌率≥99%，无需耗材', content: '电解水技术：自来水→酸性水(杀�?+碱性水(清洗)�?种模式：日常/深度/手动。抑菌率�?9%/除垢率≥90%。电解模块寿命约5年，无需额外耗材�? },
];

/* ===================== 个人版通用系统预设知识�?4条） ===================== */
const PERSONAL_KNOWLEDGE: KnowledgeItem[] = [
  // ── 管理方法�?条）──
  { category: '管理方法', title: 'KPI设定四步�?, summary: '明确岗位核心指标→设定可量化标准→设定权重和底线→定期复盘调�?, content: '四步法：\n1. 明确岗位核心指标：客服岗看响应速度+解决率，管理岗看团队达标�?成本控制\n2. 设定可量化标准：不用"态度�?这种模糊词，�?响应�?0�?"满意度≥90%"\n3. 设定权重和底线：核心指标权重60%以上，底线不达标自动预警\n4. 定期复盘调整：每周看数据，每月调标准，KPI不是一成不变的' },
  { category: '管理方法', title: '团队分工原则', summary: '按能力分配任务、明确职责边界、避免一人多岗混乱、建立AB角替补机�?, content: '核心原则：\n�?按能力分配：擅长沟通的做售前，细心的做售后，有条理的做台账\n�?明确职责边界：每人有清晰的岗位职责说明，避免灰色地带互相推诿\n�?避免一人多岗：小团队尤其要注意，一个人负责太多容易出错\n�?AB角替补：每个关键岗位有人替补，请�?离职不断�? },
  { category: '管理方法', title: '晨会管理�?, summary: '每日5分钟：昨日数据→今日目标→异常提醒→经验分享', content: '5分钟晨会结构：\n1. 昨日数据�?分钟）：订单量、售后量、投诉量、关键指标完成率\n2. 今日目标�?分钟）：每人�?个今日重点事项\n3. 异常提醒�?分钟）：待处理的紧急问题、大客户跟进、库存预警\n4. 经验分享�?分钟）：昨天谁做得好，分�?个技巧或案例\n\n⚠️ 晨会不是汇报会，是同步会。超�?分钟说明结构有问题�? },
  { category: '管理方法', title: '数据复盘三步�?, summary: '看数据→找异常→定动作，每周固定时间�?, content: '三步法：\n1. 看数据：核心指标（订单量/售后�?成本/满意度）与上�?上月对比\n2. 找异常：哪些指标突然变差？哪个环节出了问题？找出Top3异常\n3. 定动作：每个异常对应1-2个具体改进行动，明确责任人和完成时间\n\n固定节奏：每周一上午复盘上周数据，每月初复盘上月数据。复盘不追责，只找解法�? },
  { category: '管理方法', title: '新人带教SOP', summary: '分配导师→制定学习计划→跟班实习→独立上岗→考核验收', content: '带教五步法：\n1. 分配导师：指�?名老员工全程带教，不是"谁有空谁�?\n2. 制定学习计划：Day1系统上手→Day2话术训练→Day3跟单实操→Day4独立上岗→Day5考核\n3. 跟班实习：先看后做，有问题当场纠正\n4. 独立上岗：导师旁听不干预，只在出错时补充\n5. 考核验收：话术考核+实操考核，不达标延长跟班期\n\n⚠️ 带教最大的坑是"放养"——没人管的新�?天内必走�? },
  // ── 话术技巧（5条）──
  { category: '话术技�?, title: '异议应对万能公式', summary: '共情+澄清+匹配+引导，四步走不翻�?, content: '四步公式：\n1. 共情：「我理解您的顾虑」——不否定客户的感受\n2. 澄清：「方便问一下，您主要担心的是哪方面？」——精准定位顾虑\n3. 匹配：「我们这款的核心优势�?..相比之下...」——用事实说话\n4. 引导：「要不先试试？不满意随时退」——降低决策门槛\n\n⚠️ 异议不是拒绝，是客户在给自己找理由。你帮他找理由，他帮你成交�? },
  { category: '话术技�?, title: '逼单三大底层逻辑', summary: '稀缺感+降决策成�?堵退路，适合犹豫型客�?, content: '三大逻辑：\n1. 稀缺感：库存不�?活动限时/赠品限量——制造紧迫感\n2. 降决策成本：先下单试�?不满意包退/零风险体验——降低心理门槛\n3. 堵退路：把客户最后的顾虑逐个打消——让他没有不买的理由\n\n组合使用效果最佳：「这个价格只有今天有，您先下单锁定，收到不满意随时退，完全零风险�? },
  { category: '话术技�?, title: '售后安抚核心原则', summary: '先处理情绪再处理事情，不争对错只解决问题', content: '核心原则：\n�?第一句永远不�?不是我们的问�?——先安抚情绪\n�?�?我理�?"我马上处�?代替"这个不归我管"\n�?给客户确定性：「我承诺XX时间内给您答复」\n�?解决问题后主动回访，不要等客户再来问\n\n错误话术：「这个不是我们的问题」「您之前没说清楚」「这个不在我职责范围」\n正确话术：「非常抱歉给您带来不便，我马上帮您处理�? },
  { category: '话术技�?, title: '差评挽回黄金24小时', summary: '越快响应越容易挽回，�?4小时客户心态已�?, content: '挽回四步法：\n1. 道歉：不管谁对谁错，先道歉「非常抱歉给您带来不好的体验」\n2. 了解原因：主动联系客户，了解具体不满点\n3. 提出补偿：退�?补发/优惠券，超出客户预期\n4. 请求修改：问题解决后再请求修改评价\n\n时效关键：\n�?12小时内联系：挽回率约60%\n�?24小时内联系：挽回率约30%\n�?超过48小时：挽回率低于10%\n\n⚠️ 不要直接�?改好�?，先把问题解决到位�? },
  { category: '话术技�?, title: '投诉降温三板�?, summary: '接住情绪+承认问题+限时承诺', content: '三板斧：\n1. 接住情绪：「我完全理解您的不满，换做是我也会生气」——不反驳，不解释\n2. 承认问题：「这个问题确实不应该发生，是我们没做好」——承担责任\n3. 限时承诺：「我承诺2小时内给您明确答复」——给确定性\n\n降温的关键不是讲道理，是让客户感觉到"有人管我�?。投诉客户最怕的不是问题本身，是"没人�?�? },
  // ── 流程规范�?条）──
  { category: '流程规范', title: '客服接待标准流程', summary: '响应(30秒内)→问候→需求确认→推荐→促成→确认信息→结�?, content: '标准七步流程：\n1. 响应�?0秒内必须响应，用自动回复+人工衔接\n2. 问候：自报店铺�?姓名，表达服务意愿\n3. 需求确认：询问需求类型、预算、偏好，不遗漏关键信息\n4. 推荐：根据需求推�?-2款，说明核心卖点\n5. 促成：引导确认订单，说明优惠/赠品\n6. 确认信息：核对收货信息、配送时间，文字确认\n7. 结束：感谢购买，告知售后通道\n\n⚠️ 关键指标：首次响应≤30秒，平均响应�?0秒�? },
  { category: '流程规范', title: '售后处理标准流程', summary: '接诉→安抚→记录→判定责任→给出方案→执行→回访→归�?, content: '标准八步流程：\n1. 接诉：首次响应≤15分钟\n2. 安抚：先处理情绪再处理事情\n3. 记录：收集照�?视频/订单号等证据\n4. 判定责任：质量问�?物流损坏/客户误操作分类处理\n5. 给出方案：提供主方案+备选方案\n6. 执行处理：安排维�?换新/退款\n7. 回访：处理完�?天内回访确认满意度\n8. 归档：工单归�?根因分析+改进措施' },
  { category: '流程规范', title: '退换货处理规范', summary: '确认退货原因→判定责任方→核算费用→执行退换→记录归档', content: '处理规范：\n1. 确认退货原因：质量问题/不喜�?发错�?其他\n2. 判定责任方：商家责任→全额退换运费商家承担；客户原因→运费自理\n3. 核算费用：退款金�?商品金额-使用折旧(如有)；换新运费按责任方承担\n4. 执行退换：退货地址+打包要求→验收→退�?换新发货\n5. 记录归档：退换原�?处理方案+费用+客户满意度\n\n⚠️ 退换货不是损失，是维护客户关系的机会。处理得好，客户反而更信任你�? },
  { category: '流程规范', title: '每日工作自查清单', summary: '待办事项→异常订单→数据录入→客户跟进→明日计划', content: '每日自查五项：\n1. 待办事项：昨日未完成的事今天必须处理\n2. 异常订单：延迟发�?退款中/纠纷中——逐个跟进\n3. 数据录入：订�?售后/成本必须当日录入，不拖延\n4. 客户跟进�?天前咨询未下单的客户，主动跟进一次\n5. 明日计划：列出明天必须完成的事项\n\n⚠️ 每天收工前花5分钟检查，比每周花2小时补救高效10倍�? },
  { category: '流程规范', title: '月度复盘标准模板', summary: '本月数据→环比变化→异常分析→改进动作→下月目标', content: '复盘五步模板：\n1. 本月数据：订单量/售后�?售后�?退货率/成本/满意度\n2. 环比变化：与上月对比，哪些指标上�?下降\n3. 异常分析：下降最多的Top3指标，找出根本原因\n4. 改进动作：每个异常对�?-2个改进行动，明确责任人和完成时间\n5. 下月目标：核心指标目标值，与本月对比\n\n⚠️ 复盘不追责，只找解法。数据说话，不用感觉�? },
  // ── 成本管控�?条）──
  { category: '成本管控', title: '售后成本四大构成', summary: '补发成本+理赔成本+退货损�?人工时间成本', content: '四大构成：\n1. 补发成本：商品成�?快递费+包装费\n2. 理赔成本：赔偿金�?优惠�?红包成本\n3. 退货损耗：退货运�?商品折旧+二次销售损失\n4. 人工时间成本：客服处理时�?仓库操作时间+管理审批时间\n\n⚠️ 大多数商家只算前3项，忽略了人工时间成本。按1个售后平�?0分钟、时�?0元算，每�?00个售�?1500元隐性成本�? },
  { category: '成本管控', title: '单均售后成本计算�?, summary: '月售后总支出÷月订单量，高于行业均值需预警', content: '计算方法：\n单均售后成本 = 月售后总支�?÷ 月订单量\n\n示例：月售后总支�?000元，月订�?00单\n单均售后成本 = 8000 ÷ 500 = 16�?单\n\n参考标准：\n�?电商行业平均�?-15�?单\n�?高客单价品类�?5-25�?单\n�?超过25�?单需立即排查原因\n\n⚠️ 单均售后成本持续上升，说明产品或服务出了问题，不�?赔点�?的事�? },
  { category: '成本管控', title: '降赔三原�?, summary: '能修不换、能补不退、能协商不硬�?, content: '三原则：\n1. 能修不换：小问题远程指导修复，成本最低\n2. 能补不退：补偿红�?优惠券，比全额退款成本低\n3. 能协商不硬赔：与客户协商折中方案，双方都能接受\n\n执行要点：\n�?给客户选择权：不要只给一个方案\n�?超出预期：承诺的比客户期望的多一点\n�?记录每次赔付：数据是优化成本的基础\n\n⚠️ 降赔不是抠门，是合理控制成本。关键是让客户满意的同时不浪费钱�? },
  { category: '成本管控', title: '成本预警阈值设�?, summary: '环比上涨30%触发预警，月度超预算20%启动复盘', content: '预警设定：\n�?黄色预警：售后成本环比上�?5%——关注趋势\n�?橙色预警：售后成本环比上�?0%——排查原因\n�?红色预警：月度售后超预算20%——启动复�?改进行动\n\n预警后的处理流程：\n1. 查数据：哪个品类/哪种问题成本最高\n2. 找原因：是产品质量问题？物流问题？还是客服处理不当？\n3. 定动作：针对性改进行动，明确责任人和完成时间\n4. 跟踪效果：下�?下月看数据是否改�? },
  // ── 绩效提升�?条）──
  { category: '绩效提升', title: '客服考核5维度', summary: '响应速度+解决�?客户满意�?话术规范�?成本控制', content: '五维度考核：\n1. 响应速度�?0%）：首次响应�?0秒，平均响应�?0秒\n2. 解决率（25%）：一次性解决率�?0%，不需转接或二次处理\n3. 客户满意度（25%）：好评率≥95%，投诉率�?%\n4. 话术规范度（15%）：礼貌用语+需求挖�?异议应对+促成能力\n5. 成本控制�?5%）：单均售后成本≤行业均值，无超赔事件\n\n权重可根据团队阶段调整：新团队先抓响应和话术，成熟团队重解决率和成本�? },
  { category: '绩效提升', title: '话术评分标准', summary: '礼貌用语+需求挖�?异议应对+促成能力+情绪管理，各�?0%', content: '五项评分标准（每�?0分，满分100分）：\n1. 礼貌用语�?0分）：开�?结束用语规范，全程语气专业\n2. 需求挖掘（20分）：主动提问了解需求，不遗漏关键信息\n3. 异议应对�?0分）：不回避问题，用四步法化解顾虑\n4. 促成能力�?0分）：适时引导下单，不硬推不冷场\n5. 情绪管理�?0分）：面对抱�?投诉不急不躁，情绪稳定\n\n评分等级：\n90+优秀 | 75-89良好 | 60-74合格 | <60需加强' },
  { category: '绩效提升', title: '团队激励三件套', summary: '即时反馈(每日数据)+阶段奖励(�?月排�?+成长路径(晋升标准)', content: '三件套：\n1. 即时反馈：每日数据看板，让每个人看到自己的表现。不用等月底，今天做得好今天就知道\n2. 阶段奖励：周排名/月排名，�?名有实质奖励（奖�?假期/礼品）。奖励不在于多大，在于公平透明\n3. 成长路径：明确的晋升标准——客服→组长→主管，每个级别需要达成什么指标\n\n⚠️ 激励的核心不是钱，�?被看�?。每天被看见比每月拿奖金更有动力�? },
  { category: '绩效提升', title: '低绩效员工帮扶流�?, summary: '数据定位问题→一对一沟通→制定改进计划→设定观察期→跟踪验�?, content: '帮扶五步法：\n1. 数据定位问题：不�?你做不好"，是"你的响应速度比团队平均慢�?5�?\n2. 一对一沟通：了解原因——是能力问题还是态度问题？培训不足还是个人原因？\n3. 制定改进计划：具体到每天做什么，比如"每天练习3次话术模�?\n4. 设定观察期：2-4周，每周检查一次数据\n5. 跟踪验收：观察期结束看数据是否达标，达标继续，不达标启动劝退流程\n\n⚠️ 帮扶不是施压，是给方法给时间�?0%的低绩效员工通过帮扶可以提升�? },
  { category: '绩效提升', title: '高绩效员工保留策�?, summary: '给成长空�?给决策权+给合理回报，三管齐下', content: '保留三件事：\n1. 给成长空间：不要让优秀的人一直做基础工作，给更有挑战的任务\n2. 给决策权：让优秀的人有决策空间，不是事事请示。比如售后赔偿额度内的自主决定权\n3. 给合理回报：薪资与能力匹配，不要让优秀的人觉得"干多干少一个样"\n\n⚠️ 高绩效员工离职，损失的是1个人+带走的经验和客户。留�?个优秀员工，比�?个新人更值�? },
];

/* ===================== 系统预设分类 ===================== */
const ENTERPRISE_PRESET_CATEGORIES = ['全部', '产品材质', '核心性能', '规格尺寸', '安全能效', '出厂配件', '功能配件'];
const PERSONAL_PRESET_CATEGORIES = ['全部', '管理方法', '话术技�?, '流程规范', '成本管控', '绩效提升'];

const ENTERPRISE_PRESET_CATEGORY_COLORS: Record<string, string> = {
  '产品材质': 'bg-blue-100 text-blue-700',
  '核心性能': 'bg-emerald-100 text-emerald-700',
  '规格尺寸': 'bg-violet-100 text-violet-700',
  '安全能效': 'bg-sky-100 text-blue-900',
  '出厂配件': 'bg-rose-100 text-rose-700',
  '功能配件': 'bg-cyan-100 text-cyan-700',
};

const PERSONAL_PRESET_CATEGORY_COLORS: Record<string, string> = {
  '管理方法': 'bg-blue-100 text-blue-700',
  '话术技�?: 'bg-emerald-100 text-emerald-700',
  '流程规范': 'bg-violet-100 text-violet-700',
  '成本管控': 'bg-amber-100 text-amber-700',
  '绩效提升': 'bg-sky-100 text-sky-700',
};

/* ===================== 自定义知识分�?===================== */
const CUSTOM_CATEGORIES = [
  { value: 'all', label: '全部' },
  { value: 'product_params', label: '产品参数' },
  { value: 'install_guide', label: '安装说明' },
  { value: 'after_sales_policy', label: '售后政策' },
  { value: 'faq', label: '常见问题' },
  { value: 'other', label: '其他' },
];

const CUSTOM_CATEGORY_COLORS: Record<string, string> = {
  product_params: 'bg-blue-100 text-blue-700',
  install_guide: 'bg-emerald-100 text-emerald-700',
  after_sales_policy: 'bg-sky-100 text-blue-900',
  faq: 'bg-violet-100 text-violet-700',
  other: 'bg-gray-100 text-gray-700',
};

const CUSTOM_CATEGORY_LABELS: Record<string, string> = {
  product_params: '产品参数',
  install_guide: '安装说明',
  after_sales_policy: '售后政策',
  faq: '常见问题',
  other: '其他',
};

/* ===================== 表单初始�?===================== */
const EMPTY_FORM = { title: '', content: '', category: 'faq', tags: '' };

/* ===================== 主组�?===================== */
export default function ProductKnowledgePage() {
  const { profile, authFetch } = useAuth();
  const companyId = profile?.companyId || '';
  const isPersonal = profile?.role === 'personal_user';

  const presetKnowledge = isPersonal ? PERSONAL_KNOWLEDGE : PRODUCT_KNOWLEDGE;
  const presetCategories = isPersonal ? PERSONAL_PRESET_CATEGORIES : ENTERPRISE_PRESET_CATEGORIES;
  const presetCategoryColors = isPersonal ? PERSONAL_PRESET_CATEGORY_COLORS : ENTERPRISE_PRESET_CATEGORY_COLORS;

  // ---- Tab ----
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');

  // ---- 系统预设 ----
  const [presetCategory, setPresetCategory] = useState('全部');
  const [presetKeyword, setPresetKeyword] = useState('');
  const [expandedPresetId, setExpandedPresetId] = useState<number | null>(null);

  // ---- 自定义知�?----
  const [customItems, setCustomItems] = useState<CustomKnowledgeItem[]>([]);
  const [customCategory, setCustomCategory] = useState('all');
  const [customKeyword, setCustomKeyword] = useState('');
  const [expandedCustomId, setExpandedCustomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ---- 编辑弹窗 ----
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ---- 批量粘贴弹窗 ----
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchCategory, setBatchCategory] = useState('faq');

  // ---- 删除确认 ----
  const [deleteTarget, setDeleteTarget] = useState<CustomKnowledgeItem | null>(null);

  // ========== 系统预设过滤 ==========
  const filteredPreset = useMemo(() => {
    let list = presetKnowledge;
    if (presetCategory !== '全部') {
      list = list.filter((item) => item.category === presetCategory);
    }
    if (presetKeyword.trim()) {
      const kw = presetKeyword.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(kw) ||
          item.summary?.toLowerCase().includes(kw) ||
          item.content.toLowerCase().includes(kw)
      );
    }
    return list;
  }, [presetKnowledge, presetCategory, presetKeyword]);

  const presetCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 全部: presetKnowledge.length };
    for (const item of presetKnowledge) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [presetKnowledge]);

  // ========== 自定义知识过�?==========
  const filteredCustom = useMemo(() => {
    let list = customItems;
    if (customCategory !== 'all') {
      list = list.filter((item) => item.category === customCategory);
    }
    if (customKeyword.trim()) {
      const kw = customKeyword.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(kw) ||
          item.content.toLowerCase().includes(kw) ||
          (item.tags || '').toLowerCase().includes(kw)
      );
    }
    return list;
  }, [customItems, customCategory, customKeyword]);

  // ========== 获取自定义知�?==========
  const fetchCustomKnowledge = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/custom-knowledge?companyId=${companyId}`);
      const data = await res.json();
      if (data.data) {
        setCustomItems(data.data);
      }
    } catch (e) {
      console.error('获取自定义知识失�?, e);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  React.useEffect(() => {
    if (activeTab === 'custom' && companyId) {
      fetchCustomKnowledge();
    }
  }, [activeTab, companyId, fetchCustomKnowledge]);

  // ========== 保存（创建或更新�?==========
  const handleSave = async () => {
    if (!editForm.title.trim() || !editForm.content.trim()) {
      toast.error('标题和内容不能为�?);
      return;
    }

    try {
      if (editingId) {
        // 更新
        const res = await authFetch('/api/custom-knowledge', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            title: editForm.title,
            content: editForm.content,
            category: editForm.category,
            tags: editForm.tags,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('知识已更�?);
        } else {
          toast.error(data.error || '更新失败');
          return;
        }
      } else {
        // 创建
        const res = await authFetch('/api/custom-knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId,
            title: editForm.title,
            content: editForm.content,
            category: editForm.category,
            tags: editForm.tags,
            userId: profile?.id,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('知识已添�?);
        } else {
          toast.error(data.error || '添加失败');
          return;
        }
      }

      setShowEditDialog(false);
      setEditForm(EMPTY_FORM);
      setEditingId(null);
      fetchCustomKnowledge();
    } catch (e) {
      toast.error('操作失败');
    }
  };

  // ========== 删除 ==========
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await authFetch(`/api/custom-knowledge?id=${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('已删�?);
        fetchCustomKnowledge();
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (e) {
      toast.error('删除失败');
    } finally {
      setDeleteTarget(null);
    }
  };

  // ========== 批量粘贴 ==========
  const handleBatchImport = async () => {
    if (!batchText.trim()) {
      toast.error('请粘贴内�?);
      return;
    }

    const paragraphs = batchText
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) {
      toast.error('未识别到有效段落');
      return;
    }

    const items = paragraphs.map((p, i) => {
      const firstLine = p.split('\n')[0].trim();
      const title = firstLine.length > 50 ? firstLine.slice(0, 50) + '...' : firstLine;
      return { title, content: p, category: batchCategory };
    });

    try {
      const res = await authFetch('/api/custom-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, items }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`已导�?${data.count} 条知识`);
        setShowBatchDialog(false);
        setBatchText('');
        fetchCustomKnowledge();
      } else {
        toast.error(data.error || '导入失败');
      }
    } catch (e) {
      toast.error('导入失败');
    }
  };

  // ========== 打开编辑弹窗 ==========
  const openEdit = (item?: CustomKnowledgeItem) => {
    if (item) {
      setEditingId(item.id);
      setEditForm({
        title: item.title,
        content: item.content,
        category: item.category,
        tags: item.tags || '',
      });
    } else {
      setEditingId(null);
      setEditForm(EMPTY_FORM);
    }
    setShowEditDialog(true);
  };

  // ========== 渲染 ==========
  return (
    <>
      <div className="space-y-6 animate-fade-in-up">
        {/* 产品智库引导�?*/}
        <div className="rounded-xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shrink-0">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-blue-900">产品智库</h1>
              <p className="text-sm text-blue-700 mt-1">团队共享的产品资料中心，客服遇到问题随时�?/p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['产品规格', '常见FAQ', '材质说明', '安装注意事项', '售后处理标准'].map(tag => (
                  <span key={tag} className="px-2.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 border border-blue-200">{tag}</span>
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-3">点击「添加条目」开始构建你的产品智�?/p>
            </div>
          </div>
        <DataSecurityBadge />
        </div>

        {/* Tab切换 */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('preset')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'preset'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-1.5" />
            系统预设
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'custom'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-1.5" />
            自定义条�?
          </button>
        </div>

        {/* ========== 系统预设Tab ========== */}
        {activeTab === 'preset' && (
          <div className="space-y-6">
            {/* 搜索�?*/}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索知识�?.."
                value={presetKeyword}
                onChange={(e) => setPresetKeyword(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 分类标签 */}
            <div className="flex flex-wrap gap-2">
              {presetCategories.map((cat) => {
                const isActive = presetCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setPresetCategory(cat)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {cat}
                    <span
                      className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full text-xs ${
                        isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-muted-foreground'
                      }`}
                    >
                      {presetCategoryCounts[cat] || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 知识卡片 */}
            {filteredPreset.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <BookOpen className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">没有匹配的知识条�?/p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredPreset.map((item, idx) => {
                  const isExpanded = expandedPresetId === idx;
                  return (
                    <Card
                      key={idx}
                      className={`cursor-pointer transition-all hover:shadow-md ${isExpanded ? 'ring-1 ring-primary/30' : ''}`}
                      onClick={() => setExpandedPresetId(isExpanded ? null : idx)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge variant="secondary" className={`text-xs shrink-0 ${presetCategoryColors[item.category] || ''}`}>
                                {item.category}
                              </Badge>
                              <Badge variant="outline" className="text-xs shrink-0 border-gray-300 text-gray-500">
                                <Lock className="w-3 h-3 mr-1" />系统预设
                              </Badge>
                              <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>
                          </div>
                          <div className="shrink-0 mt-1 text-muted-foreground">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">{item.content}</div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center pt-2">
              系统预设知识（{presetKnowledge.length} 条）· 只读
            </p>
          </div>
        )}

        {/* ========== 我的知识库Tab ========== */}
        {activeTab === 'custom' && (
          <div className="space-y-6">
            {/* 操作�?*/}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索我的知识..."
                  value={customKeyword}
                  onChange={(e) => setCustomKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowBatchDialog(true)} className="gap-1.5">
                <ClipboardPaste className="w-4 h-4" />
                批量粘贴
              </Button>
              <Button size="sm" onClick={() => openEdit()} className="gap-1.5">
                <Plus className="w-4 h-4" />
                添加知识
              </Button>
            </div>

            {/* 分类筛�?*/}
            <div className="flex flex-wrap gap-2">
              {CUSTOM_CATEGORIES.map((cat) => {
                const isActive = customCategory === cat.value;
                const count = cat.value === 'all'
                  ? customItems.length
                  : customItems.filter((i) => i.category === cat.value).length;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setCustomCategory(cat.value)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {cat.label}
                    <span
                      className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full text-xs ${
                        isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-muted-foreground'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 加载状�?*/}
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
                加载�?..
              </div>
            ) : filteredCustom.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <BookOpen className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm mb-3">
                  {customItems.length === 0 ? '还没有自定义知识，点击上方按钮添�? : '没有匹配的知识条�?}
                </p>
                {customItems.length === 0 && (
                  <Button variant="outline" size="sm" onClick={() => openEdit()} className="gap-1.5">
                    <Plus className="w-4 h-4" /> 添加第一�?
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredCustom.map((item) => {
                  const isExpanded = expandedCustomId === item.id;
                  return (
                    <Card
                      key={item.id}
                      className={`transition-all hover:shadow-md ${isExpanded ? 'ring-1 ring-primary/30' : ''}`}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => setExpandedCustomId(isExpanded ? null : item.id)}
                          >
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <Badge
                                variant="secondary"
                                className={`text-xs shrink-0 ${CUSTOM_CATEGORY_COLORS[item.category] || ''}`}
                              >
                                {CUSTOM_CATEGORY_LABELS[item.category] || item.category}
                              </Badge>
                              {item.tags && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {item.tags}
                                </Badge>
                              )}
                              <h3 className="font-semibold text-sm">{item.title}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(item)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(item)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            <div
                              className="cursor-pointer text-muted-foreground ml-1"
                              onClick={() => setExpandedCustomId(isExpanded ? null : item.id)}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">{item.content}</div>
                            <p className="text-xs text-muted-foreground mt-3">
                              更新�?{new Date(item.updated_at).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center pt-2">
              自定义知识（{customItems.length} 条）· AI对话时自动引�?
            </p>
          </div>
        )}
      </div>

      {/* ========== 编辑/添加弹窗 ========== */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑知识' : '添加知识'}</DialogTitle>
            <DialogDescription>
              {editingId ? '修改知识内容，保存后AI对话将使用更新后的版�? : '添加自定义知识，AI对话时会自动引用'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-1.5 block">标题</label>
              <Input
                placeholder="例如：XX型号马桶安装注意事项"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">分类</label>
              <Select
                value={editForm.category}
                onValueChange={(v) => setEditForm({ ...editForm, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_CATEGORIES.filter((c) => c.value !== 'all').map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">内容</label>
              <Textarea
                placeholder="输入知识内容，AI将根据此内容回答客户问题"
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                rows={6}
                className="resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">标签（可选）</label>
              <Input
                placeholder="例如：智能马桶、安装、售�?
                value={editForm.tags}
                onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                maxLength={100}
              />
            </div>
          </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>{editingId ? '保存' : '添加'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== 批量粘贴弹窗 ========== */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>批量粘贴知识</DialogTitle>
            <DialogDescription>粘贴文本内容，系统将按空行自动拆分为多条知识</DialogDescription>
          </DialogHeader>
          <DialogBody>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-1.5 block">统一分类</label>
              <Select value={batchCategory} onValueChange={setBatchCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_CATEGORIES.filter((c) => c.value !== 'all').map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">粘贴内容</label>
              <Textarea
                placeholder={"每段知识之间用空行分隔，第一行将作为标题。例如：\n\nXX型号安装要点\n该型号需要预留水电接�?..\n\n售后政策补充\n7天无理由退货适用条件..."}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                rows={10}
                className="resize-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              已识�?{batchText.split(/\n{2,}/).filter((p) => p.trim()).length} 个段�?
            </p>
          </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
              取消
            </Button>
            <Button onClick={handleBatchImport}>导入</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== 删除确认弹窗 ========== */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除「{deleteTarget?.title}」吗？删除后AI对话将不再引用此知识�?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
