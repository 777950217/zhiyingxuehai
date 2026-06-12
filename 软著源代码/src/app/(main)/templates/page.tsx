'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHint } from '@/components/page-hint';
import { toast } from 'sonner';
import UpgradeHint from '@/components/upgrade-hint';
import { getPlanLimits, isOverLimit, formatLimit } from '@/lib/plan-limits';
import { loadProductProfile, type ProductProfile } from '@/lib/product-profile-helper';
import Link from 'next/link';
import {
  MessageSquare, ClipboardList, BookOpen,
  Search, Copy, Check, ChevronRight,
  Tag, FileText, ListChecks, Database,
  Plus, Trash2, Lock, Users, TrendingUp, Flame,
  LayoutGrid, CalendarDays, ClipboardCheck, AlertTriangle as AlertTriangleIcon,
  FileSpreadsheet, Save, RotateCcw, Download, Sparkles,
} from 'lucide-react';

/* ================================================================
   预置数据
   ================================================================ */

// 自定义模板（通用结构，适用于话�?SOP/台账�?
interface CustomTemplate {
  id: string;
  type: 'speech' | 'sop' | 'ledger';
  category: string;
  title: string;
  content: string;
  createdAt: string;
}

const CUSTOM_TEMPLATES_KEY = 'custom-templates';

// 话术模板
interface SpeechTemplate {
  id: string;
  category: string;
  title: string;
  scene: string;
  content: string;
}

const SPEECH_TEMPLATES: SpeechTemplate[] = [
  // 售前接待
  {
    id: 's1', category: '售前接待', title: '马桶咨询引导话术',
    scene: '客户咨询马桶产品，不确定选哪�?,
    content: `您好，感谢您关注我们的马桶产品！😊

为了帮您推荐最合适的款式，我了解几个信息�?
1️⃣ 您的坑距是多少？（一般有300mm�?00mm两种�?
2️⃣ 更偏好一体智能马桶还是智能盖�?普通马桶的组合�?
3️⃣ 预算大概在什么范围？

我们这款XX型号是今年的爆款，虹吸冲水超静音，夜间自动感应翻盖，现在下单还送免费安装哦～`
  },
  {
    id: 's2', category: '售前接待', title: '浴室柜尺寸确认话�?,
    scene: '客户想买浴室柜但不确定尺�?,
    content: `您好！浴室柜选对尺寸很关键，我帮您确认一下：

📏 请您量一下洗手台的墙面宽度（建议左右各留2-3cm余量�?
🚿 也要看一下排水口位置（墙排还是地排）

我们这款XX系列浴室柜有60cm/80cm/100cm三个尺寸，镜柜一体设计收纳空间超大。如果您方便的话拍一张现在的洗手台照片发给我，我帮您精准匹配！`
  },
  {
    id: 's3', category: '售前接待', title: '花洒选型推荐话术',
    scene: '客户咨询花洒，不知道恒温还是普�?,
    content: `您好！花洒的选择主要看您家的情况�?

🌡�?如果家里有老人小孩，强烈推荐恒温花洒——出水温度恒�?8℃，不会忽冷忽热，安全放�?
💧 如果水压偏低，建议选大顶喷+增压手持的组�?

我们这款恒温花洒采用进口阀芯，温差控制在�?℃，而且有一键止水功能，洗头时不用重新调温。现在活动价XX元，还�?年质保～`
  },
  {
    id: 's4', category: '售前接待', title: '淋浴房定制咨询话�?,
    scene: '客户想定制淋浴房，需要确认尺寸和款式',
    content: `您好！淋浴房属于定制产品，我帮您梳理一下需要确认的信息�?

📐 尺寸：长×宽×高（最少测�?个点取最小值）
🚪 款式：平开�?/ 推拉�?/ 折叠门（根据空间大小选择�?
🎨 玻璃：透明 / 磨砂 / 长虹玻璃（厚度建�?mm以上更安全）

您可以先告诉我大概的尺寸范围，我先帮您看能不能做标准款，标准款性价比更高哦！`
  },
  // 售后处理
  {
    id: 's5', category: '售后处理', title: '马桶漏水处理话术',
    scene: '客户反馈马桶底部/水箱漏水',
    content: `非常抱歉给您带来不便！�?

马桶漏水问题我帮您排查一下：
1️⃣ 底部漏水：可能是安装时法兰圈没对准或老化，这个需要重新打胶密�?
2️⃣ 水箱漏水：可能是进水阀或排水阀的问题，配件可以免费�?

📍 麻烦您拍一张漏水的位置照片发给我，我让师傅先在线判断原因�?
�?如果是安装问题，我们安排师傅上门免费维修
�?如果是配件问题，3天内免费寄出，有安装视频指导

请问您方便拍一下照片吗？`
  },
  {
    id: 's6', category: '售后处理', title: '安装问题安抚话术',
    scene: '客户投诉安装师傅迟到或安装不满意',
    content: `真的非常抱歉！�?让您久等/不满意了，这个问题我马上处理�?

�?安装师傅迟到：我现在联系安装团队确认情况，给您一个准确的到达时间
🔧 安装不满意：我安排师傅重新上门调整，费用我们承担

您看这样行吗�?
1. 我现在就催师傅，确认到达时间后第一时间通知�?
2. 如果今天来不及，我协调明天第一个上�?

再次给您添麻烦了，我们一定把事情办好！有任何问题随时联系我。`
  },
  {
    id: 's7', category: '售后处理', title: '质量投诉处理话术',
    scene: '客户投诉产品质量问题（划�?色差/缺陷�?,
    content: `非常抱歉给您带来不好的体验！🙏

产品质量问题我们绝不推诿，请您配合我确认一下：
📸 麻烦拍一下问题部位的清晰照片
📦 同时提供一下订单号

确认后我们按以下方式处理�?
�?轻微问题（不影响使用）：补偿XX元红包或赠送配�?
�?明显缺陷：免费换新，运费我们承担
�?严重质量问题：无条件退�?额外补偿

您方便拍个照片吗？我帮您尽快处理！`
  },
  {
    id: 's8', category: '售后处理', title: '退换货流程引导话术',
    scene: '客户要求退货或换货',
    content: `好的，我帮您处理退换货事宜�?

📋 请您确认一下信息：
1. 订单号：
2. 退换原因：
3. 产品状态（是否已安�?使用）：

🔄 退换政策：
�?未安装使用：7天无理由退换，运费自理
�?质量问题�?0天内免费换新，运费我们承�?
�?已安装：如属质量问题可换新，需师傅上门拆除

📍 退货流程：提交申请 �?审核(1个工作日) �?快递取�?�?退�?换新

我帮您先提交申请可以吗？`
  },
  // 差评沟�?
  {
    id: 's9', category: '差评沟�?, title: '中差评回复模板（通用�?,
    scene: '收到中差评后公开回复',
    content: `尊敬的客户，非常抱歉给您带来不好的购物体验！

我们已看到您的反馈，对于[具体问题]我们深表歉意。我们非常重视每一位客户的感受，已立即�?

�?[已采取的措施1]
�?[已采取的措施2]
�?[后续改进方案]

我们的客服团队会主动联系您，确保问题彻底解决。同时也欢迎您随时联系我们：[电话/微信]，我们承诺为您妥善处理�?

感谢您的监督，这让我们变得更好！🙏`
  },
  {
    id: 's10', category: '差评沟�?, title: '物流延迟差评回复',
    scene: '因物流延迟导致的差评',
    content: `亲，真的非常抱歉让您久等了！🙏

物流延迟确实影响了您的体验，我们完全理解您的心情。经核实，[原因说明]，我们已经：

�?催促物流加急派�?
�?为您申请了XX元延迟补�?
�?已反馈物流合作方改进

如果您还没收到货或有其他问题，请随时联系我们，一定帮您解决到底！`
  },
  {
    id: 's11', category: '差评沟�?, title: '主动联系改评话术',
    scene: '售后问题解决后联系客户修改差�?,
    content: `您好！我是XX店铺的客服，之前您反馈的[问题]我们已经处理好了，想跟您确认一下是否满意？

如果问题已解决，想冒昧问一下：
🙏 是否愿意帮我们修改一下评价呢�?

我们深知之前的体验不好，已经在[具体改进措施]，确保不再出现同样问题�?

如果您愿意修改，我这边给您发一�?元红包聊表心意，不管怎样都感谢您的反馈，让我们变得更好！`
  },
  // 纠纷应�?
  {
    id: 's12', category: '纠纷应�?, title: '情绪激动客户安抚话�?,
    scene: '客户情绪激动，需要先安抚再处�?,
    content: `我完全理解您的心情，换做是我也会很生气。�?

您先别着急，这件事我一定帮您处理好。我认真的：

1️⃣ 我现在就把您的问题升级为紧急工�?
2️⃣ 我本人跟进到底，不会再让您转来转�?
3️⃣ [XX时间]前给您明确答�?

您看这样行吗？有什么想法您尽管说，我一定认真听。`
  },
  {
    id: 's13', category: '纠纷应�?, title: '威胁投诉客户应对话术',
    scene: '客户威胁要投诉到消协/媒体',
    content: `您说得对，作为消费者您完全有权利投诉，我们也应该接受监督�?

不过我想先争取一个机会帮您解决问题：
�?如果是[具体问题]，我现在的方案是[方案A]
�?如果您不满意，我还可以[方案B]

我向您承诺：[XX时间]内给您满意的答复。如果届时还没解决好，您再投诉我绝无怨言�?

您看给我一个机会可以吗？`
  },
  {
    id: 's14', category: '纠纷应�?, title: '索赔谈判话术',
    scene: '客户要求赔偿，需要合理协�?,
    content: `我理解您的诉求，我们来好好商量一个双方都能接受的方案�?

根据我们的售后政策：
📋 [说明政策依据]

同时考虑到您的实际体验，我可以在政策基础上额外：
🎁 [补偿方案1：如优惠�?红包]
🎁 [补偿方案2：如免费配件/延保]

您看这个方案您觉得怎么样？如果还有其他想法，我们继续沟通，一定找到一个您满意的方案。`
  },
  // 常见问题
  {
    id: 's15', category: '常见问题', title: '保修期咨询话�?,
    scene: '客户问保修期多长',
    content: `您好！我们产品的保修政策如下�?

🔧 陶瓷类（马桶/台盆）：5年质�?
🚿 五金类（花洒/龙头）：3年质�?
🪞 浴室�?镜柜�?年质�?
🚪 淋浴房：5年质保（玻璃/五金�?

💡 温馨提示�?
�?质保从签收之日起�?
�?人为损坏不在质保范围�?
�?保留好购买凭证更方便售后

您的订单号给我，我帮您查一下具体质保到期时间～`
  },
  {
    id: 's16', category: '常见问题', title: '安装收费说明话术',
    scene: '客户问安装是否收�?,
    content: `您好！安装政策说明如下：

�?免费安装范围�?
�?马桶、花洒、龙头等常规安装
�?购买满XX元免安装�?

💰 可能产生费用的情况：
�?特殊墙体（如玻璃隔断/大理石）：需加收XX�?
�?二次安装（拆�?装新）：需加收XX�?
�?偏远地区上门费：根据距离计算

📍 安装流程：签收后48小时内会有师傅联系您预约时间，您放心等着就行！`
  },
];

// SOP模板
interface SOPStep {
  step: number;
  title: string;
  description: string;
  note?: string;
}

interface SOPTemplate {
  id: string;
  category: string;
  title: string;
  steps: SOPStep[];
}

const SOP_TEMPLATES: SOPTemplate[] = [
  // 客服接待SOP
  {
    id: 'so1', category: '客服接待', title: '在线咨询响应SOP',
    steps: [
      { step: 1, title: '首次响应', description: '客户发起咨询�?0秒内必须响应', note: '使用自动回复+人工衔接，避免客户等�? },
      { step: 2, title: '需求确�?, description: '询问产品需求、尺寸、预算等关键信息', note: '使用标准化提问清单，避免遗漏' },
      { step: 3, title: '产品推荐', description: '根据需求推�?-2款产品，说明核心卖点', note: '配合产品图片/视频增强说服�? },
      { step: 4, title: '异议处理', description: '回应客户疑问，处理价�?质量/物流等顾�?, note: '用数�?案例说话，不硬推' },
      { step: 5, title: '促成下单', description: '引导客户确认订单，说明优�?赠品', note: '限时优惠营造紧迫感' },
      { step: 6, title: '订单确认', description: '核对收货信息、配送时间，发送订单确�?, note: '重要信息文字确认，避免口头误�? },
    ],
  },
  {
    id: 'so2', category: '客服接待', title: '电话接待SOP',
    steps: [
      { step: 1, title: '接听规范', description: '3声内接听，自报店铺名+工号', note: '"您好，XX旗舰店客服XXX为您服务"' },
      { step: 2, title: '倾听记录', description: '让客户说完，记录关键信息', note: '不打断，�?�?好的"表示在听' },
      { step: 3, title: '问题分类', description: '判断问题类型：咨�?售后/投诉/其他', note: '根据类型转对应处理流�? },
      { step: 4, title: '方案提供', description: '给出解决方案+备选方�?, note: '始终给客户选择�? },
      { step: 5, title: '确认跟进', description: '确认客户满意+告知后续安排', note: '复杂问题需回访确认' },
    ],
  },
  // 订单处理SOP
  {
    id: 'so3', category: '订单处理', title: '订单跟进SOP',
    steps: [
      { step: 1, title: '订单审核', description: '检查订单信息完整性（地址/电话/规格�?, note: '异常订单30分钟内联系客户确�? },
      { step: 2, title: '发货通知', description: '发货后发送物流单�?预计到达时间', note: '同步到店铺后台让客户可查' },
      { step: 3, title: '在途跟�?, description: '物流异常（延�?破损）主动联系客�?, note: '提前介入比客户找来效果好10�? },
      { step: 4, title: '签收确认', description: '签收�?4小时内发送安装提�?售后通道', note: '附安装视频链接和客服直联方式' },
    ],
  },
  // 售后处理SOP
  {
    id: 'so4', category: '售后处理', title: '报修处理SOP',
    steps: [
      { step: 1, title: '问题登记', description: '记录客户信息+故障描述+照片', note: '使用标准登记表，必填项：订单�?故障现象/购买时间' },
      { step: 2, title: '远程诊断', description: '根据故障现象判断原因，尝试远程指�?, note: '常见问题有远程解决模�? },
      { step: 3, title: '方案确认', description: '远程无法解决→确认上�?寄配�?换新', note: '48小时内必须给出方�? },
      { step: 4, title: '执行跟进', description: '安排师傅/寄出配件，跟踪处理进�?, note: '处理完成前每24小时主动反馈一�? },
      { step: 5, title: '回访确认', description: '处理完成�?天内电话回访', note: '确认问题已解�?满意�? },
    ],
  },
  {
    id: 'so5', category: '售后处理', title: '退换货处理SOP',
    steps: [
      { step: 1, title: '申请受理', description: '确认退换原�?产品状�?订单信息', note: '7天无理由/质量问题/发错货分别处�? },
      { step: 2, title: '审核判定', description: '根据退货政策判定是否符合退换条�?, note: '1个工作日内完成审�? },
      { step: 3, title: '退货指�?, description: '发送退货地址+打包要求+物流建议', note: '贵重物品建议保价寄回' },
      { step: 4, title: '验收入库', description: '收到退货后48小时内完成验�?, note: '拍照留证，有争议及时沟�? },
      { step: 5, title: '退�?换新', description: '验收通过�?个工作日内完成退款或换新发货', note: '退款优先原路退�? },
    ],
  },
  // 开店关店SOP
  {
    id: 'so6', category: '开店关�?, title: '早班开店检查SOP',
    steps: [
      { step: 1, title: '系统检�?, description: '确认客服系统/订单系统/物流系统正常运行', note: '检查待处理订单和未回复消息' },
      { step: 2, title: '消息清理', description: '处理夜间积压消息，按优先级排�?, note: '投诉和售后优先处�? },
      { step: 3, title: '数据同步', description: '同步库存变动/促销信息/物流异常', note: '重点关注缺货和延迟订�? },
      { step: 4, title: '团队同步', description: '早会同步今日重点事项', note: '大促/活动期间需额外安排' },
    ],
  },
  {
    id: 'so7', category: '开店关�?, title: '晚班关店交接SOP',
    steps: [
      { step: 1, title: '未完成事�?, description: '列出当日未处理完的订�?售后/投诉', note: '标注紧急程度和预计处理时间' },
      { step: 2, title: '数据记录', description: '填写当日数据：咨询量/订单�?售后�?投诉�?, note: '数据记录要准确，方便次日复盘' },
      { step: 3, title: '异常标记', description: '标记需要重点关注的问题（差�?纠纷/大客�?, note: '紧急事项直接电话交�? },
      { step: 4, title: '交接确认', description: '与次日值班人员书面+口头双重交接', note: '交接记录双方签字/确认' },
    ],
  },
  // 客诉闭环SOP
  {
    id: 'so8', category: '客诉闭环', title: '客户投诉闭环SOP',
    steps: [
      { step: 1, title: '投诉受理', description: '记录投诉内容+客户诉求+情绪状�?, note: '首次响应不超�?5分钟' },
      { step: 2, title: '安抚致歉', description: '表达歉意+理解+承诺处理', note: '先处理情绪再处理问题' },
      { step: 3, title: '问题调查', description: '内部核实情况+调取相关记录', note: '4小时内完成调�? },
      { step: 4, title: '方案制定', description: '制定解决方案+备选方�?补偿方案', note: '方案要超出客户预�? },
      { step: 5, title: '沟通确�?, description: '与客户沟通方案，确认满意后执�?, note: '方案需主管审批' },
      { step: 6, title: '执行回访', description: '执行方案+7天内二次回访', note: '确保客户真正满意，防止二次投�? },
      { step: 7, title: '复盘归档', description: '投诉归档+根因分析+改进措施', note: '同类问题�?次需升级处理流程' },
    ],
  },
];

// 台账模板
interface LedgerField {
  name: string;
  type: string;
  required: boolean;
  example: string;
  note?: string;
}

interface LedgerTemplate {
  id: string;
  category: string;
  title: string;
  description: string;
  fields: LedgerField[];
}

const LEDGER_TEMPLATES: LedgerTemplate[] = [
  // 订单台账
  {
    id: 'l1', category: '订单台账', title: '每日订单记录台账',
    description: '记录每日订单的关键信息，方便后续查询和数据分�?,
    fields: [
      { name: '订单�?, type: '文本', required: true, example: 'DD20260514001', note: '唯一编号' },
      { name: '下单时间', type: '日期时间', required: true, example: '2026-05-14 10:30' },
      { name: '客户姓名', type: '文本', required: true, example: '张先�? },
      { name: '联系电话', type: '文本', required: true, example: '138****5678' },
      { name: '产品名称', type: '文本', required: true, example: 'XX智能马桶Pro' },
      { name: '产品规格', type: '文本', required: false, example: '400坑距/白色' },
      { name: '数量', type: '数字', required: true, example: '1' },
      { name: '订单金额', type: '数字', required: true, example: '3299' },
      { name: '来源渠道', type: '选择', required: true, example: '天猫/京东/抖音/线下', note: '下拉选择' },
      { name: '支付状�?, type: '选择', required: true, example: '已付/待付/部分�? },
      { name: '配送状�?, type: '选择', required: false, example: '待发�?已发�?已签�? },
      { name: '备注', type: '文本', required: false, example: '客户要求周六配�? },
    ],
  },
  // 售后台账
  {
    id: 'l2', category: '售后台账', title: '售后工单记录台账',
    description: '记录售后问题的完整处理过程，确保每个问题可追�?,
    fields: [
      { name: '工单�?, type: '文本', required: true, example: 'AS20260514001' },
      { name: '关联订单�?, type: '文本', required: true, example: 'DD20260514001' },
      { name: '客户姓名', type: '文本', required: true, example: '李女�? },
      { name: '问题类型', type: '选择', required: true, example: '漏水/安装/质量/退�?其他' },
      { name: '问题描述', type: '文本', required: true, example: '马桶底部渗水' },
      { name: '受理时间', type: '日期时间', required: true, example: '2026-05-14 14:00' },
      { name: '处理方式', type: '选择', required: true, example: '远程指导/上门维修/寄配�?换新/退�? },
      { name: '处理�?, type: '文本', required: true, example: '王师�? },
      { name: '处理结果', type: '选择', required: true, example: '已解�?跟进�?待确�? },
      { name: '费用', type: '数字', required: false, example: '0', note: '客户承担/公司承担' },
      { name: '客户满意�?, type: '选择', required: false, example: '满意/一�?不满�? },
      { name: '完成时间', type: '日期时间', required: false, example: '2026-05-14 16:30' },
    ],
  },
  // 成本利润
  {
    id: 'l3', category: '成本利润', title: '产品成本利润台账',
    description: '记录每个产品的成本构成和利润，支持定价决�?,
    fields: [
      { name: '产品名称', type: '文本', required: true, example: 'XX智能马桶Pro' },
      { name: 'SKU', type: '文本', required: true, example: 'SM-Pro-400W' },
      { name: '进货�?, type: '数字', required: true, example: '1200' },
      { name: '快递费', type: '数字', required: true, example: '80' },
      { name: '包装�?, type: '数字', required: false, example: '25' },
      { name: '安装�?, type: '数字', required: false, example: '150' },
      { name: '人工分摊', type: '数字', required: false, example: '50', note: '客服/仓库人力成本分摊' },
      { name: '售后分摊', type: '数字', required: false, example: '30', note: '按历史售后率计算' },
      { name: '总成�?, type: '公式', required: true, example: '1535', note: '自动求和' },
      { name: '售价', type: '数字', required: true, example: '3299' },
      { name: '毛利�?, type: '公式', required: true, example: '53.5%', note: '自动计算' },
      { name: '平台扣点', type: '数字', required: false, example: '5%', note: '天猫/京东等平台佣�? },
    ],
  },
  // 差评投诉
  {
    id: 'l4', category: '差评投诉', title: '差评投诉跟踪台账',
    description: '记录每一条差�?投诉的处理情况，防止遗漏',
    fields: [
      { name: '记录日期', type: '日期', required: true, example: '2026-05-14' },
      { name: '评价类型', type: '选择', required: true, example: '差评/中评/投诉/纠纷' },
      { name: '平台', type: '选择', required: true, example: '天猫/京东/抖音/12315' },
      { name: '订单�?, type: '文本', required: true, example: 'DD20260514001' },
      { name: '客户', type: '文本', required: true, example: '赵先�? },
      { name: '差评原因', type: '文本', required: true, example: '物流延迟+外包装破�? },
      { name: '星级', type: '数字', required: false, example: '2' },
      { name: '处理�?, type: '文本', required: true, example: '客服小美' },
      { name: '处理方式', type: '文本', required: true, example: '电话沟�?补偿红包' },
      { name: '处理结果', type: '选择', required: true, example: '已改�?未改�?投诉已撤销/进行�? },
      { name: '补偿金额', type: '数字', required: false, example: '50' },
      { name: '备注', type: '文本', required: false, example: '客户要求换货' },
    ],
  },
  // 私域建档
  {
    id: 'l5', category: '私域建档', title: '私域客户建档台账',
    description: '记录私域客户信息，支持精准营销和复购转�?,
    fields: [
      { name: '建档日期', type: '日期', required: true, example: '2026-05-14' },
      { name: '客户姓名', type: '文本', required: true, example: '陈女�? },
      { name: '微信�?, type: '文本', required: false, example: 'chen_xxx' },
      { name: '手机�?, type: '文本', required: false, example: '139****8888' },
      { name: '客户标签', type: '多�?, required: true, example: '新客/老客/大客/设计�?工长', note: '支持多标�? },
      { name: '需求类�?, type: '选择', required: true, example: '全屋定制/单品购买/工程采购' },
      { name: '预算范围', type: '选择', required: false, example: '5K以内/5K-2W/2W-5W/5W+' },
      { name: '装修阶段', type: '选择', required: false, example: '量房/水电/贴砖/安装/完工' },
      { name: '首次购买产品', type: '文本', required: false, example: '智能马桶+花洒套装' },
      { name: '购买金额', type: '数字', required: false, example: '6800' },
      { name: '复购次数', type: '数字', required: false, example: '2' },
      { name: '备注', type: '文本', required: false, example: '朋友推荐来的，老客户转介绍' },
    ],
  },
  {
    id: 'l6', category: '私域建档', title: '客户跟进记录台账',
    description: '记录每次客户跟进情况，确保不遗漏任何商机',
    fields: [
      { name: '跟进日期', type: '日期', required: true, example: '2026-05-14' },
      { name: '客户姓名', type: '文本', required: true, example: '陈女�? },
      { name: '跟进方式', type: '选择', required: true, example: '微信/电话/到店/视频' },
      { name: '跟进目的', type: '选择', required: true, example: '新客开�?需求确�?促单/售后回访/复购推荐' },
      { name: '沟通内�?, type: '文本', required: true, example: '确认浴室柜尺寸和款式偏好' },
      { name: '客户反馈', type: '文本', required: true, example: '对价格有顾虑，需要再考虑' },
      { name: '下一步计�?, type: '文本', required: true, example: '3天后发送竞品对比分�? },
      { name: '预计成交金额', type: '数字', required: false, example: '12000' },
      { name: '成交概率', type: '选择', required: false, example: '20%/50%/80%/90%', note: '销售漏斗管�? },
    ],
  },
];

/* ================================================================
   个人版通用模板（全行业，不绑定具体产品�?
   ================================================================ */

const PERSONAL_SPEECH_TEMPLATES: SpeechTemplate[] = [
  {
    id: 'ps1', category: '异议应对', title: '客户异议应对话术框架',
    scene: '客户对价�?质量/服务提出质疑',
    content: `我理解您的顾虑，很多客户一开始也有同样的想法。其实关键在于—�?

💡 四步法（共情→澄清→匹配价值→引导决策）：

1️⃣ 共情：「我理解您的顾虑，这确实是很重要的决定�?
2️⃣ 澄清：「方便问一下，您主要担心的是哪方面呢？价格？质量？还是售后？�?
3️⃣ 匹配价值：「其实我们这款的核心优势是[1-2个差异化卖点]，相比之下[对比竞品�?个关键差异]�?
4️⃣ 引导决策：「要不这样，您先[小步�?体验/试用]，觉得好再决定，这样风险最小�?

⚠️ 注意：不要否定客户的顾虑，要接住再引导。`
  },
  {
    id: 'ps2', category: '促单转化', title: '催单逼单话术框架',
    scene: '客户犹豫不决需要推动决�?,
    content: `催单三大底层逻辑：稀缺感 + 降决策成�?+ 堵顾�?

🔥 稀缺法�?
「这款目前库存不多了/这次活动价格是最近的最低点/这个赠品只有今天有�?

💰 降决策成本：
「您先拍下，不满�?天无理由退换，运费我们承担，等于零风险试用�?

🛡�?堵顾虑法�?
「您是不是还在担心[常见顾虑]？这个您放心，[针对性承诺]�?

💬 组合话术�?
「这款现在活动价真的很划算，库存也不多了。您先下单锁定优惠，收到不满意随时退，我们包邮包退，完全零风险。您看还有什么顾虑我帮您解答？�?

⚠️ 逼单不是施压，是帮客户降低决策门槛。`
  },
  {
    id: 'ps3', category: '售后处理', title: '售后安抚话术框架',
    scene: '客户收到商品有问题需要安�?,
    content: `先安抚情�?�?确认问题 �?给出方案 �?跟进闭环

🙏 安抚情绪�?
「非常抱歉给您带来不好的体验，我完全理解您的心情，换做是我也会着急�?

📋 确认问题�?
「麻烦您[拍张照片/描述具体情况]，我马上帮您核实处理�?

�?给出方案�?
「确认后我们按以下方式处理：
�?轻微问题：补偿XX元红�?
�?明显问题：免费换新，运费我们承担
�?严重问题：无条件退�?额外补偿�?

🔄 跟进闭环�?
「处理完成后我会主动跟进确认，保证您满意为止�?

⚠️ 核心原则：先处理情绪再处理事情，不争对错只解决问题。`
  },
  {
    id: 'ps4', category: '差评沟�?, title: '差评挽回话术框架',
    scene: '收到差评后主动联系客户挽�?,
    content: `黄金24小时法则：越快响应越容易挽回

道歉 �?了解原因 �?提出补偿 �?请求修改

🙏 道歉�?
「看到您的评价我们非常重视，非常抱歉给您带来不好的体验�?

🔍 了解原因�?
「想跟您了解一下具体是什么地方让您不满意？这样我们才能针对性改进�?

🎁 提出补偿�?
「作为补偿，我们[具体方案：退�?补发/优惠券]，希望弥补您的损失�?

🙏 请求修改�?
「如果您觉得问题已经解决，是否愿意帮我们修改一下评价？不管怎样我们都感谢您的反馈�?

⚠️ 不要直接�?改好�?，要先把问题解决到位，客户自然愿意改。`
  },
  {
    id: 'ps5', category: '促单转化', title: '老客户复购话术框�?,
    scene: '维护老客户促复购',
    content: `回忆购买 �?新品/活动推荐 �?专属福利

💬 话术框架�?

「X�?X姐，好久没联系了！上次您买的XX用得还满意吗？�?

（等客户回复后）

「最近我们[上了新品/有老客专属活动]，我觉得特别适合您：
�?[推荐理由1：和之前购买的产品相关]
�?[推荐理由2：老客户专享价/优先发货]

这个活动只有老客户才有，[限量/限时]，您看要不要了解一下？�?

⚠️ 复购话术的核心是让客户觉�?被重�?，而不�?被推销"。`
  },
  {
    id: 'ps6', category: '纠纷应�?, title: '客户投诉升级话术框架',
    scene: '客户情绪激动要求投�?,
    content: `降温 �?接住情绪 �?限时承诺 �?闭环

❄️ 降温�?
「我完全理解您的不满，这个问题我来负责跟进解决�?

🤝 接住情绪�?
「您说得对，这个问题确实不应该发生，是我们没做好�?

�?限时承诺�?
「我向您承诺�?
1️⃣ 现在就把您的问题升级为紧急工�?
2️⃣ [XX时间]内给您明确答�?
3️⃣ 我本人跟进到底，不会再让您转来转去�?

🔄 闭环�?
「您看这样行吗？有什么想法您尽管说，我一定认真听�?

⚠️ 投诉客户最怕的不是问题本身，是"没人�?。给他一个确定的承诺比任何方案都有效。`
  },
];

const PERSONAL_SOP_TEMPLATES: SOPTemplate[] = [
  {
    id: 'pso1', category: '接待流程', title: '客服接待标准SOP',
    steps: [
      { step: 1, title: '响应时效', description: '客户咨询�?0秒内必须响应', note: '用自动回�?人工衔接，避免客户等�? },
      { step: 2, title: '标准问�?, description: '自报店铺�?姓名，表达服务意�?, note: '"您好，XX客服XXX为您服务，请问有什么可以帮您？"' },
      { step: 3, title: '需求确�?, description: '询问客户需求类型、预算、偏�?, note: '使用标准化提问清单，不遗漏关键信�? },
      { step: 4, title: '推荐匹配', description: '根据需求推�?-2款产品，说明核心卖点', note: '配合图片/视频增强说服�? },
      { step: 5, title: '促成下单', description: '引导客户确认订单，说明优�?赠品', note: '限时优惠营造紧迫感' },
      { step: 6, title: '确认信息', description: '核对收货信息、配送时间，发送订单确�?, note: '重要信息文字确认，避免口头误�? },
      { step: 7, title: '礼貌结束', description: '感谢购买，告知售后通道', note: '"有任何问题随时找我，祝您使用愉快�?' },
    ],
  },
  {
    id: 'pso2', category: '售后流程', title: '售后处理标准SOP',
    steps: [
      { step: 1, title: '接诉登记', description: '记录客户信息+问题描述+情绪状�?, note: '首次响应不超�?5分钟' },
      { step: 2, title: '安抚致歉', description: '表达歉意+理解+承诺处理', note: '先处理情绪再处理事情' },
      { step: 3, title: '记录详情', description: '收集照片/视频/订单号等证据', note: '标准登记表确保不遗漏' },
      { step: 4, title: '判定责任', description: '判断问题类型和责任归�?, note: '质量问题/物流损坏/客户误操作分类处�? },
      { step: 5, title: '给出方案', description: '提供解决方案+备选方�?, note: '始终给客户选择�? },
      { step: 6, title: '执行处理', description: '安排维修/换新/退款，跟踪进度', note: '处理中每24小时主动反馈一�? },
      { step: 7, title: '回访确认', description: '处理完成3天内回访，确认满意度', note: '确保客户真正满意，防止二次投�? },
      { step: 8, title: '归档复盘', description: '工单归档+根因分析+改进措施', note: '同类问题�?次需升级处理流程' },
    ],
  },
  {
    id: 'pso3', category: '日常管理', title: '每日开闭店自查SOP',
    steps: [
      { step: 1, title: '开店检�?, description: '检查系统运�?待处理订�?库存变动', note: '异常订单30分钟内处�? },
      { step: 2, title: '消息清理', description: '处理夜间积压消息，按优先级排�?, note: '投诉和售后优�? },
      { step: 3, title: '营业监控', description: '实时监控咨询�?订单�?异常情况', note: '异常数据及时上报' },
      { step: 4, title: '闭店复盘', description: '填写当日数据：咨询量/订单�?售后�?, note: '数据记录准确，方便周报月�? },
      { step: 5, title: '明日计划', description: '列出待办事项+重点客户+促销安排', note: '书面交接不留遗漏' },
    ],
  },
  {
    id: 'pso4', category: '团队管理', title: '新人入职培训SOP',
    steps: [
      { step: 1, title: 'Day1 系统上手', description: '账号开�?系统操作培训/基础流程熟悉', note: '手把手教，确保能独立操作' },
      { step: 2, title: 'Day2 话术训练', description: '核心话术背诵+模拟对练+纠错', note: '每人至少完成3轮对�? },
      { step: 3, title: 'Day3 跟单实操', description: '跟随老员工处理真实订�?售后', note: '先看后做，有问题当场纠正' },
      { step: 4, title: 'Day4 独立上岗', description: '独立处理常规业务，导师旁�?, note: '只干预不替代' },
      { step: 5, title: 'Day5 考核验收', description: '话术考核+实操考核+数据达标', note: '不达标延�?周跟班期' },
    ],
  },
];

const PERSONAL_LEDGER_TEMPLATES: LedgerTemplate[] = [
  {
    id: 'pl1', category: '订单管理', title: '每日订单台账',
    description: '记录每日订单的关键信息，方便查询和数据分�?,
    fields: [
      { name: '订单�?, type: '文本', required: true, example: 'DD20260514001', note: '唯一编号' },
      { name: '客户', type: '文本', required: true, example: '张先�? },
      { name: '商品', type: '文本', required: true, example: 'XX型号' },
      { name: '金额', type: '数字', required: true, example: '299' },
      { name: '来源', type: '选择', required: true, example: '淘宝/抖音/京东/线下/其他' },
      { name: '状�?, type: '选择', required: true, example: '待发�?已发�?已签�?已取�? },
      { name: '备注', type: '文本', required: false, example: '客户要求周末配�? },
    ],
  },
  {
    id: 'pl2', category: '售后管理', title: '客户售后台账',
    description: '记录售后问题处理过程，确保可追溯',
    fields: [
      { name: '日期', type: '日期', required: true, example: '2026-05-14' },
      { name: '客户', type: '文本', required: true, example: '李女�? },
      { name: '问题类型', type: '选择', required: true, example: '质量/物流/退�?其他' },
      { name: '处理方案', type: '选择', required: true, example: '补发/退�?换新/补偿' },
      { name: '金额', type: '数字', required: false, example: '50' },
      { name: '状�?, type: '选择', required: true, example: '处理�?已解�?待确�? },
    ],
  },
  {
    id: 'pl3', category: '财务管理', title: '成本利润简易台�?,
    description: '简易记录每日收支和利润，无需专业财务知识',
    fields: [
      { name: '日期', type: '日期', required: true, example: '2026-05-14' },
      { name: '收入', type: '数字', required: true, example: '5800' },
      { name: '进货成本', type: '数字', required: true, example: '2800' },
      { name: '快递费', type: '数字', required: false, example: '120' },
      { name: '售后支出', type: '数字', required: false, example: '80' },
      { name: '其他支出', type: '数字', required: false, example: '50' },
      { name: '净利润', type: '公式', required: true, example: '2750', note: '自动计算' },
    ],
  },
];

/* ================================================================
   获取所有分类（按版本选择�?
   ================================================================ */

function getTemplateData(isPersonal: boolean) {
  const speeches = isPersonal ? PERSONAL_SPEECH_TEMPLATES : SPEECH_TEMPLATES;
  const sops = isPersonal ? PERSONAL_SOP_TEMPLATES : SOP_TEMPLATES;
  const ledgers = isPersonal ? PERSONAL_LEDGER_TEMPLATES : LEDGER_TEMPLATES;
  return {
    speeches,
    sops,
    ledgers,
    speechCategories: [...new Set(speeches.map(t => t.category))],
    sopCategories: [...new Set(sops.map(t => t.category))],
    ledgerCategories: [...new Set(ledgers.map(t => t.category))],
  };
}

/* ================================================================
   页面组件
   ================================================================ */

type TabKey = 'speech' | 'sop' | 'ledger' | 'management';

// 使用热度排序辅助（纯函数，定义在组件外部避免TDZ问题�?
function getUsageScore(id: string, usageStats: Record<string, { copyCount: number; importCount: number; companyCount: number }>): number {
  const s = usageStats[id];
  if (!s) return 0;
  return s.copyCount + s.importCount * 3 + s.companyCount * 2;
}

export default function TemplatesPage() {
  const { profile, authFetch } = useAuth();
  const isPersonal = profile?.role === 'personal_user';
  const role = profile?.role;
  const limits = getPlanLimits(role, profile?.companyPlan);
  const tplData = useMemo(() => getTemplateData(isPersonal), [isPersonal]);
  const [productProfile, setProductProfile] = useState<ProductProfile | null>(null);

  useEffect(() => { setProductProfile(loadProductProfile()); }, []);

  const [activeTab, setActiveTab] = useState<TabKey>('speech');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speechCat, setSpeechCat] = useState<string>('全部');
  const [sopCat, setSopCat] = useState<string>('全部');
  const [ledgerCat, setLedgerCat] = useState<string>('全部');

  // 自定义模�?
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [newTplType, setNewTplType] = useState<'speech' | 'sop' | 'ledger'>('speech');
  const [newTplCategory, setNewTplCategory] = useState('');
  const [newTplTitle, setNewTplTitle] = useState('');
  const [newTplContent, setNewTplContent] = useState('');

  // 管理模板状�?
  const [mgmtActiveTpl, setMgmtActiveTpl] = useState<string | null>(null);
  const [trainingPlan, setTrainingPlan] = useState<Record<string, { content: string; task: string; standard: string }>>({});
  const [trainingDays, setTrainingDays] = useState(7);
  const [dailyCheck, setDailyCheck] = useState<Record<string, Record<string, { checked: boolean; note: string }>>>({});
  const [complaintForm, setComplaintForm] = useState({
    customerId: '', orderId: '', complaintType: '', content: '', emotionLevel: '3',
    handler: '', solution: '', compensation: '', duration: '',
    escalated: 'no', revisited: 'no', satisfaction: '',
  });
  const [complaints, setComplaints] = useState<Array<typeof complaintForm & { id: string; createdAt: string }>>([]);
  const [dailySummary, setDailySummary] = useState({ completed: '', tomorrow: '', coordinate: '', reflection: '' });
  const [dailySummaries, setDailySummaries] = useState<Array<typeof dailySummary & { id: string; date: string }>>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [checkDate, setCheckDate] = useState(() => new Date().toISOString().slice(0, 10));

  /* ─── 管理模板 Supabase 读写工具 ─── */
  const mgmtRowIdsRef = useRef<Record<string, string>>({});

  const loadMgmtFromSupabase = useCallback(async (uid: string) => {
    if (!authFetch || !uid) return;
    try {
      const res = await authFetch(`/api/phrases?category=${encodeURIComponent('管理模板')}&is_preset=false`);
      if (!res.ok) return;
      const data = await res.json();
      const records = (data.data || []) as Record<string, unknown>[];
      for (const r of records) {
        if (r.created_by !== uid && r.created_by !== null) continue;
        const subType = (r.question as string) || '';
        const rowId = (r.id as string) || '';
        if (rowId && subType) mgmtRowIdsRef.current[subType] = rowId;
        try {
          const parsed = JSON.parse((r.content as string) || 'null');
          if (!parsed) continue;
          if (subType === 'training-plan') setTrainingPlan(parsed);
          if (subType === 'daily-check') setDailyCheck(parsed);
          if (subType === 'complaints') setComplaints(parsed);
          if (subType === 'daily-summaries') setDailySummaries(parsed);
          if (subType === 'daily-summary-draft') setDailySummary(parsed);
        } catch { /* ignore corrupt data */ }
      }
    } catch { /* ignore */ }
  }, [authFetch]);

  const saveMgmtToSupabase = useCallback(async (subType: string, content: unknown) => {
    const uid = profile?.id || '';
    const companyId = profile?.companyId || null;
    if (!authFetch || !uid) return;
    try {
      const payload = {
        company_id: companyId || null,
        category: '管理模板',
        content: JSON.stringify(content),
        question: subType,
        tags: subType,
        is_preset: false,
        created_by: uid,
      };
      const existingId = mgmtRowIdsRef.current[subType];
      if (existingId) {
        const res = await authFetch('/api/phrases', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existingId, ...payload }),
        });
        if (!res.ok) throw new Error('update failed');
      } else {
        const res = await authFetch('/api/phrases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('create failed');
        const data = await res.json();
        const newRowId = (data.data as Record<string, unknown>)?.id as string;
        if (newRowId) mgmtRowIdsRef.current[subType] = newRowId;
      }
    } catch { toast.error('保存失败，数据已暂存本地，恢复网络后将自动同�?); }
  }, [authFetch, profile?.id, profile?.companyId]);

  // 管理模板 localStorage 加载（降级） + Supabase 优先加载
  useEffect(() => {
    const uid = profile?.id || 'anon';
    // 先读localStorage作为即时展示
    try {
      const tp = localStorage.getItem(`training-plan-${uid}`);
      if (tp) setTrainingPlan(JSON.parse(tp));
      const dc = localStorage.getItem(`daily-check-${uid}`);
      if (dc) setDailyCheck(JSON.parse(dc));
      const cf = localStorage.getItem(`complaints-${uid}`);
      if (cf) setComplaints(JSON.parse(cf));
      const ds = localStorage.getItem(`daily-summaries-${uid}`);
      if (ds) setDailySummaries(JSON.parse(ds));
      const sf = localStorage.getItem(`daily-summary-draft-${uid}`);
      if (sf) setDailySummary(JSON.parse(sf));
    } catch { /* ignore */ }
    // 再从Supabase加载覆盖（优先）
    if (uid !== 'anon') {
      loadMgmtFromSupabase(uid);
    }
  }, [profile?.id, loadMgmtFromSupabase]);

  // 管理模板双写：localStorage + Supabase
  const saveTrainingPlan = (data: typeof trainingPlan) => {
    setTrainingPlan(data);
    const uid = profile?.id || 'anon';
    localStorage.setItem(`training-plan-${uid}`, JSON.stringify(data));
    saveMgmtToSupabase('training-plan', data);
  };
  const saveDailyCheck = (data: typeof dailyCheck) => {
    setDailyCheck(data);
    const uid = profile?.id || 'anon';
    localStorage.setItem(`daily-check-${uid}`, JSON.stringify(data));
    saveMgmtToSupabase('daily-check', data);
  };
  const saveComplaints = (data: typeof complaints) => {
    setComplaints(data);
    const uid = profile?.id || 'anon';
    localStorage.setItem(`complaints-${uid}`, JSON.stringify(data));
    saveMgmtToSupabase('complaints', data);
  };
  const saveDailySummaries = (data: typeof dailySummaries) => {
    setDailySummaries(data);
    const uid = profile?.id || 'anon';
    localStorage.setItem(`daily-summaries-${uid}`, JSON.stringify(data));
    saveMgmtToSupabase('daily-summaries', data);
  };
  const saveDailySummaryDraft = (data: typeof dailySummary) => {
    setDailySummary(data);
    const uid = profile?.id || 'anon';
    localStorage.setItem(`daily-summary-draft-${uid}`, JSON.stringify(data));
    saveMgmtToSupabase('daily-summary-draft', data);
  };

  // 模板使用统计
  const [usageStats, setUsageStats] = useState<Record<string, { copyCount: number; importCount: number; companyCount: number; userCount: number }>>({});

  useEffect(() => {
    // 先从localStorage即时加载
    try {
      const saved = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
      if (saved) setCustomTemplates(JSON.parse(saved));
    } catch { /* ignore */ }
    // 再从Supabase加载覆盖
    const loadCustomFromSupabase = async () => {
      if (!authFetch || !profile?.id) return;
      try {
        const res = await authFetch(`/api/phrases?category=${encodeURIComponent('自定义模�?)}&is_preset=false`);
        if (!res.ok) return;
        const data = await res.json();
        const records = (data.data || []) as Record<string, unknown>[];
        if (records.length > 0) {
          const items: CustomTemplate[] = records.map(r => {
            try {
              return JSON.parse((r.content as string) || '{}') as CustomTemplate;
            } catch {
              return null;
            }
          }).filter(Boolean) as CustomTemplate[];
          if (items.length > 0) {
            setCustomTemplates(items);
            localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(items));
          }
        }
      } catch { /* ignore */ }
    };
    loadCustomFromSupabase();
  }, [authFetch, profile?.id]);

  // 加载模板使用统计
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await authFetch('/api/template-usage?stats=all');
        if (res.ok) {
          const data = await res.json();
          if (data.stats) setUsageStats(data.stats);
        }
      } catch { /* ignore */ }
    };
    fetchStats();
  }, [authFetch]);

  const saveCustomTemplates = (items: CustomTemplate[]) => {
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(items));
    setCustomTemplates(items);
    // 双写到Supabase：逐条同步
    if (authFetch && profile?.id) {
      const companyId = profile?.companyId || null;
      // 简单策略：每次保存时全量同步（先删后建�?
      (async () => {
        try {
          // 获取已有�?
          const res = await authFetch(`/api/phrases?category=${encodeURIComponent('自定义模�?)}&is_preset=false`);
          if (res.ok) {
            const data = await res.json();
            const records = (data.data || []) as Record<string, unknown>[];
            // 删除旧行
            for (const r of records) {
              if (r.id) await authFetch(`/api/phrases?id=${r.id}`, { method: 'DELETE' });
            }
          }
          // 创建新行
          for (const item of items) {
            await authFetch('/api/phrases', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                company_id: companyId || null,
                category: '自定义模�?,
                content: JSON.stringify(item),
                question: item.id,
                tags: item.type,
                is_preset: false,
                created_by: profile.id,
              }),
            });
          }
        } catch { toast.error('保存失败，数据已暂存本地，恢复网络后将自动同�?); }
      })();
    }
  };

  const currentTabCustomCount = customTemplates.filter(t => t.type === activeTab).length;
  const allCustomCount = customTemplates.length;

  // 搜索过滤 + 使用热度排序
  const filteredSpeech = useMemo(() => {
    let list = tplData.speeches;
    if (speechCat !== '全部') list = list.filter(t => t.category === speechCat);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.scene.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q)
      );
    }
    // 按使用热度排序（热门在前�?
    return [...list].sort((a, b) => getUsageScore(b.id, usageStats) - getUsageScore(a.id, usageStats));
  }, [tplData.speeches, speechCat, searchQuery, usageStats]);

  const filteredSOP = useMemo(() => {
    let list = tplData.sops;
    if (sopCat !== '全部') list = list.filter(t => t.category === sopCat);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.steps.some(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => getUsageScore(b.id, usageStats) - getUsageScore(a.id, usageStats));
  }, [tplData.sops, sopCat, searchQuery, usageStats]);

  const filteredLedger = useMemo(() => {
    let list = tplData.ledgers;
    if (ledgerCat !== '全部') list = list.filter(t => t.category === ledgerCat);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.fields.some(f => f.name.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => getUsageScore(b.id, usageStats) - getUsageScore(a.id, usageStats));
  }, [tplData.ledgers, ledgerCat, searchQuery, usageStats]);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('已复制到剪贴�?);
      setTimeout(() => setCopiedId(null), 2000);
      // 记录使用（异步不阻塞�?
      try {
        authFetch('/api/template-usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template_id: id, action: 'copy' }),
        }).then(() => {
            // 更新本地统计
            setUsageStats(prev => ({
              ...prev,
              [id]: {
                copyCount: (prev[id]?.copyCount || 0) + 1,
                importCount: prev[id]?.importCount || 0,
                companyCount: prev[id]?.companyCount || 0,
                userCount: (prev[id]?.userCount || 0) + 1,
              },
            }));
          }).catch(() => {});
      } catch { /* ignore */ }
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  const handleCreateTemplate = () => {
    if (isOverLimit(allCustomCount, limits.maxCustomTemplates)) {
      setShowUpgradeDialog(true);
      return;
    }
    if (!newTplTitle.trim() || !newTplContent.trim()) return;
    const tpl: CustomTemplate = {
      id: 'custom-' + Date.now(),
      type: newTplType,
      category: newTplCategory.trim() || '自定�?,
      title: newTplTitle.trim(),
      content: newTplContent.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    saveCustomTemplates([...customTemplates, tpl]);
    setShowCreateDialog(false);
    setNewTplCategory('');
    setNewTplTitle('');
    setNewTplContent('');
    toast.success('自定义模板已创建');
  };

  const handleDeleteCustomTemplate = (id: string) => {
    saveCustomTemplates(customTemplates.filter(t => t.id !== id));
    toast.success('模板已删�?);
  };

  const openCreateDialog = (type: TabKey) => {
    if (type === 'management') return; // 管理模板不支持自定义
    if (isOverLimit(allCustomCount, limits.maxCustomTemplates)) {
      setShowUpgradeDialog(true);
      return;
    }
    setNewTplType(type);
    setNewTplCategory('');
    setNewTplTitle('');
    setNewTplContent('');
    setShowCreateDialog(true);
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'speech', label: '话术模板', icon: <MessageSquare className="w-4 h-4" /> },
    { key: 'sop', label: 'SOP模板', icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'ledger', label: '台账模板', icon: <BookOpen className="w-4 h-4" /> },
    { key: 'management', label: '管理模板', icon: <LayoutGrid className="w-4 h-4" /> },
  ];

  const currentCategories = activeTab === 'speech'
    ? ['全部', ...tplData.speechCategories]
    : activeTab === 'sop'
    ? ['全部', ...tplData.sopCategories]
    : activeTab === 'ledger'
    ? ['全部', ...tplData.ledgerCategories]
    : [];

  const currentCat = activeTab === 'speech' ? speechCat
    : activeTab === 'sop' ? sopCat
    : activeTab === 'ledger' ? ledgerCat : '';
  const setCurrentCat = activeTab === 'speech' ? setSpeechCat
    : activeTab === 'sop' ? setSopCat
    : activeTab === 'ledger' ? setLedgerCat : (_v: string) => {};

  // 使用统计徽章渲染
  const UsageBadges = ({ templateId }: { templateId: string }) => {
    const s = usageStats[templateId];
    if (!s || (s.copyCount === 0 && s.userCount === 0)) return null;
    return (
      <div className="flex items-center gap-2 mt-1.5">
        {s.copyCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Copy className="w-3 h-3" />
            {s.copyCount}次复�?
          </span>
        )}
        {s.userCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Users className="w-3 h-3" />
            {s.userCount}人使�?
          </span>
        )}
        {getUsageScore(templateId, usageStats) >= 5 && (
          <span className="inline-flex items-center gap-0.5 text-xs text-orange-500 font-medium">
            <Flame className="w-3 h-3" />
            热门
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 个人版产品档案提�?*/}
        {isPersonal && (
          <div className="mb-6 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-blue-500 shrink-0" />
              <div>
                {productProfile ? (
                  <>
                    <p className="text-sm font-medium text-blue-800">�?已导入{productProfile.brand}产品信息，模板已为您个性化</p>
                    <p className="text-xs text-blue-600 mt-0.5">产品档案已同步至AI急救站、话术练兵场、AI体检�?/p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-blue-800">导入您的产品信息，模板自动个性化</p>
                    <p className="text-xs text-blue-600 mt-0.5">填写品牌和品类，AI生成专属话术和SOP模板</p>
                  </>
                )}
              </div>
            </div>
            <Link href="/product-profile-personal"
              className="shrink-0 px-4 py-2 bg-[#0F2B46] hover:bg-[#1a3a5c] text-white rounded-lg text-sm font-medium transition-colors">
              {productProfile ? '更新产品信息' : '导入我的产品'}
            </Link>
          </div>
        )}
        {/* 页头 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">模板�?/h1>
            <PageHint text="AI帮你写，复制就用——话术、SOP、KPI方案，输入场景直接生成�? />
            <p className="text-slate-500 mt-1">
              职盈学海专业�?天自学交付内容，拿来即用
              {!isPersonal && limits.maxCustomTemplates !== Infinity && allCustomCount > 0 && (
                <span className="text-amber-600 ml-1">(自定�?{allCustomCount}/{formatLimit(limits.maxCustomTemplates)})</span>
              )}
            </p>
          </div>
          {!isPersonal && (
            <button
              onClick={() => openCreateDialog(activeTab)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2B46] text-white text-sm font-medium hover:bg-[#1a3a5c] transition-colors"
            >
              <Plus className="w-4 h-4" />
              创建模板
            </button>
          )}
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearchQuery(''); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#0F2B46] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* 搜索 + 分类 */}
        {activeTab !== 'management' && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={activeTab === 'speech' ? '搜索话术...' : activeTab === 'sop' ? '搜索SOP...' : activeTab === 'ledger' ? '搜索台账...' : '搜索模板...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {currentCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setCurrentCat(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  currentCat === cat
                    ? 'bg-sky-100 text-sky-700 border border-sky-200'
                    : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* ==================== 话术模板 ==================== */}
        {activeTab === 'speech' && (
          <>
          {/* 使用热度摘要 */}
          {Object.keys(usageStats).length > 0 && (
            <div className="flex items-center gap-2 mb-4 px-1">
              <TrendingUp className="w-4 h-4 text-sky-500" />
              <span className="text-xs text-slate-400">
                模板按使用热度排序，复制次数越多排名越靠�?
              </span>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {filteredSpeech.map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Tag className="w-3.5 h-3.5 text-sky-500" />
                        <Badge variant="secondary" className="text-xs bg-sky-50 text-sky-700 border-sky-200">
                          {t.category}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-slate-900">{t.title}</h3>
                      <UsageBadges templateId={t.id} />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(t.content, t.id)}
                      className="shrink-0"
                    >
                      {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === t.id ? '已复�? : '复制'}
                    </Button>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">场景：{t.scene}</p>
                </div>
                <div className="px-5 py-4">
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {t.content}
                  </pre>
                </div>
              </div>
            ))}
            {filteredSpeech.length === 0 && customTemplates.filter(t => t.type === 'speech').length === 0 && (
              <div className="col-span-2 text-center py-12 text-slate-400">没有找到匹配的话术模�?/div>
            )}
          </div>
          {/* 自定义话术模�?*/}
          {customTemplates.filter(t => t.type === 'speech').length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-amber-600">自定义话�?/span>
                <span className="text-xs text-amber-500">{customTemplates.filter(t => t.type === 'speech').length} �?/span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {customTemplates.filter(t => t.type === 'speech').map(t => (
                  <div key={t.id} className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-amber-50">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Tag className="w-3.5 h-3.5 text-amber-500" />
                            <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                              {t.category}
                            </Badge>
                            <span className="text-xs text-amber-400">自定�?/span>
                          </div>
                          <h3 className="font-semibold text-slate-900">{t.title}</h3>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopy(t.content, t.id)}
                          >
                            {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedId === t.id ? '已复�? : '复制'}
                          </Button>
                          <button
                            onClick={() => handleDeleteCustomTemplate(t.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="px-5 py-4">
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                        {t.content}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </>
        )}

        {/* ==================== SOP模板 ==================== */}
        {activeTab === 'sop' && (
          <>
          <div className="grid gap-4">
            {filteredSOP.map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <ListChecks className="w-4 h-4 text-sky-500" />
                        <Badge variant="secondary" className="text-xs bg-sky-50 text-sky-700 border-sky-200">
                          {t.category}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-slate-900 text-lg">{t.title}</h3>
                      <UsageBadges templateId={t.id} />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(
                        t.steps.map(s => `${s.step}. ${s.title}\n   ${s.description}${s.note ? '\n   ⚠️ ' + s.note : ''}`).join('\n\n'),
                        t.id
                      )}
                      className="shrink-0"
                    >
                      {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === t.id ? '已复�? : '复制全部'}
                    </Button>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <div className="space-y-4">
                    {t.steps.map((s, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-[#0F2B46] text-white text-sm font-bold flex items-center justify-center shrink-0">
                            {s.step}
                          </div>
                          {i < t.steps.length - 1 && (
                            <div className="w-0.5 flex-1 bg-slate-200 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-2">
                          <h4 className="font-medium text-slate-900">{s.title}</h4>
                          <p className="text-sm text-slate-600 mt-0.5">{s.description}</p>
                          {s.note && (
                            <p className="text-xs text-amber-600 mt-1 bg-amber-50 px-2 py-1 rounded inline-block">
                              💡 {s.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {filteredSOP.length === 0 && customTemplates.filter(t => t.type === 'sop').length === 0 && (
              <div className="text-center py-12 text-slate-400">没有找到匹配的SOP模板</div>
            )}
          </div>
          {/* 自定义SOP模板 */}
          {customTemplates.filter(t => t.type === 'sop').length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-amber-600">自定义SOP</span>
                <span className="text-xs text-amber-500">{customTemplates.filter(t => t.type === 'sop').length} �?/span>
              </div>
              <div className="grid gap-4">
                {customTemplates.filter(t => t.type === 'sop').map(t => (
                  <div key={t.id} className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-amber-50">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <ListChecks className="w-4 h-4 text-amber-500" />
                            <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                              {t.category}
                            </Badge>
                            <span className="text-xs text-amber-400">自定�?/span>
                          </div>
                          <h3 className="font-semibold text-slate-900 text-lg">{t.title}</h3>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopy(t.content, t.id)}
                          >
                            {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedId === t.id ? '已复�? : '复制'}
                          </Button>
                          <button
                            onClick={() => handleDeleteCustomTemplate(t.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="px-5 py-4">
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                        {t.content}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </>
        )}

        {/* ==================== 台账模板 ==================== */}
        {activeTab === 'ledger' && (
          <>
          <div className="grid gap-4 md:grid-cols-2">
            {filteredLedger.map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="w-4 h-4 text-sky-500" />
                        <Badge variant="secondary" className="text-xs bg-sky-50 text-sky-700 border-sky-200">
                          {t.category}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-slate-900">{t.title}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{t.description}</p>
                      <UsageBadges templateId={t.id} />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(
                        t.fields.map(f => `${f.name}(${f.type})${f.required ? ' *必填' : ''} �?示例�?{f.example}${f.note ? ' [' + f.note + ']' : ''}`).join('\n'),
                        t.id
                      )}
                      className="shrink-0"
                    >
                      {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === t.id ? '已复�? : '复制'}
                    </Button>
                  </div>
                </div>
                <div className="px-5 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 text-slate-500 font-medium">字段</th>
                        <th className="text-left py-2 text-slate-500 font-medium">类型</th>
                        <th className="text-left py-2 text-slate-500 font-medium">示例</th>
                        <th className="text-left py-2 text-slate-500 font-medium">必填</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.fields.map((f, i) => (
                        <tr key={i} className="border-b border-slate-50 last:border-0">
                          <td className="py-1.5">
                            <span className="font-medium text-slate-800">{f.name}</span>
                            {f.note && <span className="text-xs text-slate-400 ml-1">({f.note})</span>}
                          </td>
                          <td className="py-1.5 text-slate-500">{f.type}</td>
                          <td className="py-1.5 text-slate-600 font-mono text-xs">{f.example}</td>
                          <td className="py-1.5">
                            {f.required ? (
                              <span className="text-red-500 text-xs">必填</span>
                            ) : (
                              <span className="text-slate-300 text-xs">选填</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {filteredLedger.length === 0 && customTemplates.filter(t => t.type === 'ledger').length === 0 && (
              <div className="col-span-2 text-center py-12 text-slate-400">没有找到匹配的台账模�?/div>
            )}
          </div>
          {/* 自定义台账模�?*/}
          {customTemplates.filter(t => t.type === 'ledger').length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-amber-600">自定义台�?/span>
                <span className="text-xs text-amber-500">{customTemplates.filter(t => t.type === 'ledger').length} �?/span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {customTemplates.filter(t => t.type === 'ledger').map(t => (
                  <div key={t.id} className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-amber-50">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Database className="w-4 h-4 text-amber-500" />
                            <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                              {t.category}
                            </Badge>
                            <span className="text-xs text-amber-400">自定�?/span>
                          </div>
                          <h3 className="font-semibold text-slate-900">{t.title}</h3>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopy(t.content, t.id)}
                          >
                            {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedId === t.id ? '已复�? : '复制'}
                          </Button>
                          <button
                            onClick={() => handleDeleteCustomTemplate(t.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="px-5 py-4">
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                        {t.content}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </>
        )}

        {/* ==================== 管理模板 ==================== */}
        {activeTab === 'management' && (
          <div className="space-y-6">
            {/* 管理模板入口卡片 */}
            {!mgmtActiveTpl && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  { id: 'training', title: '新人培训计划�?, desc: '7天培训框架：每天学习内容+实操任务+考核标准', icon: <CalendarDays className="w-7 h-7" />, color: 'bg-blue-50 text-blue-600 border-blue-200' },
                  { id: 'checklist', title: '每日客服工作检查表', desc: '每日6项必查：早会/质检/数据/跟进/指导/日报', icon: <ClipboardCheck className="w-7 h-7" />, color: 'bg-green-50 text-green-600 border-green-200' },
                  { id: 'complaint', title: '客户投诉处理记录�?, desc: '投诉信息+处理过程+跟踪回访，分类统�?, icon: <AlertTriangleIcon className="w-7 h-7" />, color: 'bg-orange-50 text-orange-600 border-orange-200' },
                  { id: 'summary', title: '每日工作总结模板', desc: '今日完成+明日计划+需协调+反思，AI一键补�?, icon: <FileSpreadsheet className="w-7 h-7" />, color: 'bg-purple-50 text-purple-600 border-purple-200' },
                ].map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => setMgmtActiveTpl(tpl.id)}
                    className={`p-6 rounded-xl border-2 text-left transition-all hover:shadow-md ${tpl.color}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 mt-0.5">{tpl.icon}</div>
                      <div>
                        <h3 className="text-lg font-bold">{tpl.title}</h3>
                        <p className="text-sm mt-1 opacity-80">{tpl.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ========== 新人培训计划�?========== */}
            {mgmtActiveTpl === 'training' && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-blue-50">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-slate-900">新人培训计划�?/h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">培训天数�?/label>
                    <select
                      value={trainingDays}
                      onChange={e => setTrainingDays(Number(e.target.value))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"
                    >
                      {[5, 7, 10, 14].map(d => <option key={d} value={d}>{d}�?/option>)}
                    </select>
                    <button
                      onClick={() => {
                        const plan: typeof trainingPlan = {};
                        const dayContents = [
                          { content: '公司文化+产品体系认知', task: '背诵10个核心产品卖�?, standard: '能说�?个以上产品核心卖�? },
                          { content: '客服系统操作+话术规范', task: '模拟接待5个咨询场�?, standard: '话术评分�?0�? },
                          { content: '售后流程+退换货政策', task: '处理3个模拟售后工�?, standard: '流程正确�?00%' },
                          { content: '质检标准+常见错误避坑', task: '�?段对话进行质检打分', standard: '与标准分偏差�?0�? },
                          { content: '团队协作+排班制度', task: '排一�?人周班表', standard: '覆盖率≥95%，工时偏差≤2h' },
                          { content: '大促预案+应急处�?, task: '�?份大促人员预�?, standard: '预案包含3种突发场景应�? },
                          { content: '综合考核+独立上岗', task: '全流程模拟考核', standard: '综合评分�?0�? },
                          { content: '老员工带�?实战演练', task: '跟班接单20�?, standard: '独立处理率≥50%' },
                          { content: '数据分析+报表填写', task: '完成1份日�?1份周�?, standard: '数据填写完整准确' },
                          { content: '客户投诉处理+情绪管理', task: '处理2个模拟投�?, standard: '客户满意度≥3�?5分制)' },
                          { content: 'SOP熟悉+流程优化建议', task: '�?条SOP优化建议', standard: '建议有针对性可执行' },
                          { content: '跨部门协�?问题升级', task: '模拟1次问题升级流�?, standard: '升级路径正确，信息完�? },
                          { content: 'KPI理解+自我目标设定', task: '设定个人3项KPI', standard: 'KPI符合SMART原则' },
                          { content: '结业考核+上岗证发�?, task: '全科目结业考试', standard: '总分�?5分，无科目不及格' },
                        ];
                        for (let i = 1; i <= trainingDays; i++) {
                          plan[`day${i}`] = dayContents[i - 1] || { content: '', task: '', standard: '' };
                        }
                        saveTrainingPlan(plan);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> 重置模板
                    </button>
                    <button
                      onClick={() => {
                        const text = Array.from({ length: trainingDays }, (_, i) => {
                          const d = trainingPlan[`day${i + 1}`];
                          return `�?{i + 1}�?| 学习�?{d?.content || ''} | 实操�?{d?.task || ''} | 标准�?{d?.standard || ''}`;
                        }).join('\n');
                        navigator.clipboard.writeText(`新人${trainingDays}天培训计划\n${text}`);
                        toast.success('已复制到剪贴�?);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> 导出
                    </button>
                    <button onClick={() => setMgmtActiveTpl(null)} className="px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100">返回</button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {Array.from({ length: trainingDays }, (_, i) => i + 1).map(day => {
                      const d = trainingPlan[`day${day}`] || { content: '', task: '', standard: '' };
                      return (
                        <div key={day} className="border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">{day}</span>
                            <span className="font-bold text-base text-slate-900">第{day}�?/span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="text-sm font-medium text-slate-600 mb-1 block">学习内容</label>
                              <textarea
                                value={d.content}
                                onChange={e => { const p = { ...trainingPlan }; p[`day${day}`] = { ...d, content: e.target.value }; saveTrainingPlan(p); }}
                                placeholder="今天学什�?
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none text-sm resize-none"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-600 mb-1 block">实操任务</label>
                              <textarea
                                value={d.task}
                                onChange={e => { const p = { ...trainingPlan }; p[`day${day}`] = { ...d, task: e.target.value }; saveTrainingPlan(p); }}
                                placeholder="做什么练�?
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none text-sm resize-none"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-600 mb-1 block">考核标准</label>
                              <textarea
                                value={d.standard}
                                onChange={e => { const p = { ...trainingPlan }; p[`day${day}`] = { ...d, standard: e.target.value }; saveTrainingPlan(p); }}
                                placeholder="达到什么标�?
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none text-sm resize-none"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ========== 每日客服工作检查表 ========== */}
            {mgmtActiveTpl === 'checklist' && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-green-50">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-bold text-slate-900">每日客服工作检查表</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={checkDate}
                      onChange={e => setCheckDate(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white"
                    />
                    <button onClick={() => setMgmtActiveTpl(null)} className="px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100">返回</button>
                  </div>
                </div>
                <div className="p-6">
                  {(() => {
                    const checkItems = [
                      { key: 'morning_meeting', label: '早会完成', desc: '检查今日目标是否对�? },
                      { key: 'quality_check', label: '质检抽查', desc: '抽查至少3条对�? },
                      { key: 'data_review', label: '数据查看', desc: '查看昨日核心指标（接待量/好评�?转化率）' },
                      { key: 'issue_followup', label: '问题跟进', desc: '跟进昨日未解决的客户问题' },
                      { key: 'newbie_guide', label: '新人指导', desc: '检查新人培训进度（如有新人�? },
                      { key: 'daily_report', label: '日报提交', desc: '提交当日工作日报' },
                    ];
                    const key = `check_${checkDate}`;
                    const dayData: Record<string, { checked: boolean; note: string }> = dailyCheck[key] || {};
                    const checkedCount = checkItems.filter(it => dayData[it.key]?.checked).length;
                    const completionRate = Math.round((checkedCount / checkItems.length) * 100);
                    return (
                      <>
                        <div className="mb-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-base font-bold text-slate-700">{checkDate} 完成�?/span>
                            <span className={`text-2xl font-bold ${completionRate === 100 ? 'text-green-600' : completionRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{completionRate}%</span>
                          </div>
                          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${completionRate === 100 ? 'bg-green-500' : completionRate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                          <p className="text-sm text-slate-500 mt-1">{checkedCount}/{checkItems.length} 项已完成</p>
                        </div>
                        <div className="space-y-3">
                          {checkItems.map(it => {
                            const item = dayData[it.key] || { checked: false, note: '' };
                            return (
                              <div key={it.key} className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${item.checked ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}>
                                <button
                                  onClick={() => {
                                    const newCheck = { ...dailyCheck };
                                    if (!newCheck[key]) newCheck[key] = {} as Record<string, { checked: boolean; note: string }>;
                                    newCheck[key][it.key] = { checked: !item.checked, note: item.note };
                                    saveDailyCheck(newCheck);
                                  }}
                                  className={`shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${item.checked ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'}`}
                                >
                                  {item.checked && <Check className="w-4 h-4" />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold text-base ${item.checked ? 'text-green-700 line-through' : 'text-slate-900'}`}>{it.label}</span>
                                  </div>
                                  <p className="text-sm text-slate-500 mt-0.5">{it.desc}</p>
                                  <input
                                    type="text"
                                    value={item.note}
                                    onChange={e => {
                                      const newCheck = { ...dailyCheck };
                                      if (!newCheck[key]) newCheck[key] = {} as Record<string, { checked: boolean; note: string }>;
                                      newCheck[key][it.key] = { checked: item.checked, note: e.target.value };
                                      saveDailyCheck(newCheck);
                                    }}
                                    placeholder="备注（可选）"
                                    className="mt-2 w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:border-green-400 focus:ring-1 focus:ring-green-50 outline-none"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* 历史检查记�?*/}
                        {Object.keys(dailyCheck).filter(k => k.startsWith('check_') && k !== key).length > 0 && (
                          <div className="mt-8">
                            <h4 className="text-base font-bold text-slate-700 mb-3">历史检查记�?/h4>
                            <div className="space-y-2">
                              {Object.entries(dailyCheck)
                                .filter(([k]) => k.startsWith('check_') && k !== key)
                                .sort(([a], [b]) => b.localeCompare(a))
                                .slice(0, 7)
                                .map(([k, v]) => {
                                  const dayItems = checkItems;
                                  const dayChecked = dayItems.filter(it => v?.[it.key]?.checked).length;
                                  const rate = Math.round((dayChecked / dayItems.length) * 100);
                                  return (
                                    <div key={k} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
                                      <span className="text-sm font-medium text-slate-700">{k.replace('check_', '')}</span>
                                      <span className={`text-sm font-bold ${rate === 100 ? 'text-green-600' : 'text-amber-600'}`}>{rate}%</span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ========== 客户投诉处理记录�?========== */}
            {mgmtActiveTpl === 'complaint' && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-orange-50">
                  <div className="flex items-center gap-3">
                    <AlertTriangleIcon className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-bold text-slate-900">客户投诉处理记录�?/h3>
                    <span className="text-sm text-slate-500">�?{complaints.length} 条记�?/span>
                  </div>
                  <button onClick={() => setMgmtActiveTpl(null)} className="px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100">返回</button>
                </div>
                <div className="p-6">
                  {/* 新增投诉表单 */}
                  <div className="border-2 border-dashed border-orange-200 rounded-xl p-5 mb-6 bg-orange-50/30">
                    <h4 className="text-base font-bold text-slate-700 mb-4">新增投诉记录</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-1 block">客户ID</label>
                        <input value={complaintForm.customerId} onChange={e => setComplaintForm(f => ({ ...f, customerId: e.target.value }))} placeholder="客户ID" className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-50 outline-none text-sm" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-1 block">订单�?/label>
                        <input value={complaintForm.orderId} onChange={e => setComplaintForm(f => ({ ...f, orderId: e.target.value }))} placeholder="订单�? className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-50 outline-none text-sm" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-1 block">投诉类型</label>
                        <select value={complaintForm.complaintType} onChange={e => setComplaintForm(f => ({ ...f, complaintType: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-orange-400 outline-none text-sm bg-white">
                          <option value="">请选择</option>
                          <option value="quality">质量问题</option>
                          <option value="service">服务态度</option>
                          <option value="logistics">物流问题</option>
                          <option value="install">安装问题</option>
                          <option value="refund">退款纠�?/option>
                          <option value="other">其他</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-1 block">情绪等级</label>
                        <div className="flex items-center gap-2">
                          {['1', '2', '3', '4', '5'].map(lv => (
                            <button
                              key={lv}
                              onClick={() => setComplaintForm(f => ({ ...f, emotionLevel: lv }))}
                              className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${complaintForm.emotionLevel === lv ? (Number(lv) <= 2 ? 'bg-green-500 text-white' : Number(lv) <= 3 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white') : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                              {lv}
                            </button>
                          ))}
                          <span className="text-xs text-slate-400 ml-1">{Number(complaintForm.emotionLevel) <= 2 ? '较平�? : Number(complaintForm.emotionLevel) <= 3 ? '有些不满' : '非常激�?}</span>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-slate-600 mb-1 block">投诉内容</label>
                        <textarea value={complaintForm.content} onChange={e => setComplaintForm(f => ({ ...f, content: e.target.value }))} placeholder="详细描述投诉内容" rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-50 outline-none text-sm resize-none" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-1 block">接待�?/label>
                        <input value={complaintForm.handler} onChange={e => setComplaintForm(f => ({ ...f, handler: e.target.value }))} placeholder="处理人姓�? className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-orange-400 outline-none text-sm" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-1 block">处理方案</label>
                        <input value={complaintForm.solution} onChange={e => setComplaintForm(f => ({ ...f, solution: e.target.value }))} placeholder="处理方案" className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-orange-400 outline-none text-sm" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-1 block">赔付金额</label>
                        <input value={complaintForm.compensation} onChange={e => setComplaintForm(f => ({ ...f, compensation: e.target.value }))} placeholder="0" className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-orange-400 outline-none text-sm" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-1 block">处理时长</label>
                        <input value={complaintForm.duration} onChange={e => setComplaintForm(f => ({ ...f, duration: e.target.value }))} placeholder="如：2小时" className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-orange-400 outline-none text-sm" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-1 block">是否升级</label>
                        <div className="flex gap-2">
                          {(['no', 'yes'] as const).map(v => (
                            <button key={v} onClick={() => setComplaintForm(f => ({ ...f, escalated: v }))} className={`px-4 py-2 rounded-lg text-sm font-medium ${complaintForm.escalated === v ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{v === 'no' ? '�? : '�?}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-1 block">是否回访</label>
                        <div className="flex gap-2">
                          {(['no', 'yes'] as const).map(v => (
                            <button key={v} onClick={() => setComplaintForm(f => ({ ...f, revisited: v }))} className={`px-4 py-2 rounded-lg text-sm font-medium ${complaintForm.revisited === v ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{v === 'no' ? '�? : '�?}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-1 block">客户满意�?/label>
                        <select value={complaintForm.satisfaction} onChange={e => setComplaintForm(f => ({ ...f, satisfaction: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-orange-400 outline-none text-sm bg-white">
                          <option value="">待回�?/option>
                          <option value="1">1�?非常不满</option>
                          <option value="2">2�?不满�?/option>
                          <option value="3">3�?一�?/option>
                          <option value="4">4�?满意</option>
                          <option value="5">5�?非常满意</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => {
                          if (!complaintForm.content.trim()) { toast.error('请填写投诉内�?); return; }
                          const newComplaint = { ...complaintForm, id: Date.now().toString(), createdAt: new Date().toISOString() };
                          saveComplaints([newComplaint, ...complaints]);
                          setComplaintForm({ customerId: '', orderId: '', complaintType: '', content: '', emotionLevel: '3', handler: '', solution: '', compensation: '', duration: '', escalated: 'no', revisited: 'no', satisfaction: '' });
                          toast.success('投诉记录已保�?);
                        }}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors"
                      >
                        <Save className="w-4 h-4" /> 保存记录
                      </button>
                    </div>
                  </div>

                  {/* 投诉分类统计 */}
                  {complaints.length > 0 && (
                    <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <h4 className="text-base font-bold text-slate-700 mb-3">投诉分类统计</h4>
                      {(() => {
                        const typeMap: Record<string, string> = { quality: '质量问题', service: '服务态度', logistics: '物流问题', install: '安装问题', refund: '退款纠�?, other: '其他' };
                        const counts: Record<string, number> = {};
                        complaints.forEach(c => { counts[c.complaintType] = (counts[c.complaintType] || 0) + 1; });
                        const total = complaints.length;
                        return (
                          <div className="space-y-2">
                            {Object.entries(counts).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                              <div key={type} className="flex items-center gap-3">
                                <span className="text-sm text-slate-600 w-20 shrink-0">{typeMap[type] || type}</span>
                                <div className="flex-1 h-6 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                                </div>
                                <span className="text-sm font-bold text-slate-700 w-16 text-right">{count}�?({Math.round((count / total) * 100)}%)</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* 投诉记录列表 */}
                  {complaints.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-base font-bold text-slate-700">投诉记录</h4>
                      {complaints.map(c => {
                        const typeMap: Record<string, string> = { quality: '质量问题', service: '服务态度', logistics: '物流问题', install: '安装问题', refund: '退款纠�?, other: '其他' };
                        return (
                          <div key={c.id} className="border border-slate-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">{typeMap[c.complaintType] || '未分�?}</span>
                                <span className="text-sm text-slate-500">{c.createdAt.slice(0, 10)}</span>
                              </div>
                              <button onClick={() => saveComplaints(complaints.filter(x => x.id !== c.id))} className="text-xs text-red-400 hover:text-red-600">删除</button>
                            </div>
                            <p className="text-sm text-slate-700 mb-1">{c.content}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                              {c.handler && <span>接待：{c.handler}</span>}
                              {c.solution && <span>方案：{c.solution}</span>}
                              {c.compensation && <span>赔付：¥{c.compensation}</span>}
                              {c.duration && <span>时长：{c.duration}</span>}
                              <span>升级：{c.escalated === 'yes' ? '�? : '�?}</span>
                              <span>回访：{c.revisited === 'yes' ? '�? : '�?}</span>
                              {c.satisfaction && <span>满意度：{c.satisfaction}�?/span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========== 每日工作总结模板 ========== */}
            {mgmtActiveTpl === 'summary' && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-purple-50">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-bold text-slate-900">每日工作总结</h3>
                  </div>
                  <button onClick={() => setMgmtActiveTpl(null)} className="px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100">返回</button>
                </div>
                <div className="p-6">
                  <div className="space-y-5">
                    <div>
                      <label className="text-base font-bold text-slate-700 mb-2 block">今日完成事项</label>
                      <textarea
                        value={dailySummary.completed}
                        onChange={e => saveDailySummaryDraft({ ...dailySummary, completed: e.target.value })}
                        placeholder="列出今天完成的主要工作，如：处理售后工单15件、质检抽查5条对�?.."
                        rows={4}
                        className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-50 outline-none text-base resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-base font-bold text-slate-700 mb-2 block">明日计划</label>
                      <textarea
                        value={dailySummary.tomorrow}
                        onChange={e => saveDailySummaryDraft({ ...dailySummary, tomorrow: e.target.value })}
                        placeholder="明天要做什么，如：跟进3个未解决投诉、新员工�?天培�?.."
                        rows={4}
                        className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-50 outline-none text-base resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-base font-bold text-slate-700 mb-2 block">需协调事项</label>
                      <textarea
                        value={dailySummary.coordinate}
                        onChange={e => saveDailySummaryDraft({ ...dailySummary, coordinate: e.target.value })}
                        placeholder="需要其他部门或领导协调的事�?.."
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-50 outline-none text-base resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-base font-bold text-slate-700 mb-2 block">心得反�?/label>
                      <textarea
                        value={dailySummary.reflection}
                        onChange={e => saveDailySummaryDraft({ ...dailySummary, reflection: e.target.value })}
                        placeholder="今天的感悟、发现的问题、改进想�?.."
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-50 outline-none text-base resize-none"
                      />
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      onClick={async () => {
                        const hasContent = dailySummary.completed || dailySummary.tomorrow || dailySummary.coordinate || dailySummary.reflection;
                        if (!hasContent) { toast.error('请先填写至少一项内�?); return; }
                        setAiGenerating(true);
                        try {
                          const prompt = `你是一个电商客服主管的工作助手。请根据以下关键词，帮主管补全一份完整的工作总结，语言简洁专业，每项3-5条要点：

今日完成�?{dailySummary.completed || '（未填）'}
明日计划�?{dailySummary.tomorrow || '（未填）'}
需协调�?{dailySummary.coordinate || '（未填）'}
心得反思：${dailySummary.reflection || '（未填）'}

请输出格式：
【今日完成事项�?
1. ...
2. ...

【明日计划�?
1. ...
2. ...

【需协调事项�?
1. ...

【心得反思�?
...`;

                          const res = await fetch('/api/ai/generate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ prompt }),
                          });
                          const data = await res.json();
                          if (data.content) {
                            const sections = data.content.split(/�?);
                            const parsed = { completed: '', tomorrow: '', coordinate: '', reflection: '' };
                            sections.forEach((sec: string) => {
                              const content = '�? + sec;
                              if (sec.startsWith('今日完成事项�?)) parsed.completed = content.replace(/【今日完成事项】\n?/, '').split(/�?)[0].trim();
                              else if (sec.startsWith('明日计划�?)) parsed.tomorrow = content.replace(/【明日计划】\n?/, '').split(/�?)[0].trim();
                              else if (sec.startsWith('需协调事项�?)) parsed.coordinate = content.replace(/【需协调事项】\n?/, '').split(/�?)[0].trim();
                              else if (sec.startsWith('心得反思�?)) parsed.reflection = content.replace(/【心得反思】\n?/, '').trim();
                            });
                            saveDailySummaryDraft(parsed);
                            toast.success('AI已补全工作总结');
                          }
                        } catch {
                          toast.error('AI生成失败，请稍后重试');
                        } finally {
                          setAiGenerating(false);
                        }
                      }}
                      disabled={aiGenerating}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="w-4 h-4" /> {aiGenerating ? 'AI生成�?..' : 'AI一键补�?}
                    </button>
                    <button
                      onClick={() => {
                        if (!dailySummary.completed.trim() && !dailySummary.tomorrow.trim()) { toast.error('请填写至少完成事项或明日计划'); return; }
                        const newSummary = { ...dailySummary, id: Date.now().toString(), date: new Date().toISOString().slice(0, 10) };
                        saveDailySummaries([newSummary, ...dailySummaries]);
                        saveDailySummaryDraft({ completed: '', tomorrow: '', coordinate: '', reflection: '' });
                        toast.success('工作总结已保�?);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0F2B46] text-white font-bold hover:bg-[#1a3a5c] transition-colors"
                    >
                      <Save className="w-4 h-4" /> 保存总结
                    </button>
                    <button
                      onClick={() => {
                        const today = new Date().toISOString().slice(0, 10);
                        const text = `【今日完成】\n${dailySummary.completed}\n\n【明日计划】\n${dailySummary.tomorrow}\n\n【需协调】\n${dailySummary.coordinate}\n\n【心得反思】\n${dailySummary.reflection}`;
                        navigator.clipboard.writeText(text);
                        toast.success('已复制到剪贴�?);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                    >
                      <Download className="w-4 h-4" /> 导出
                    </button>
                  </div>

                  {/* 历史总结 */}
                  {dailySummaries.length > 0 && (
                    <div className="mt-8">
                      <h4 className="text-base font-bold text-slate-700 mb-3">历史总结</h4>
                      <div className="space-y-3">
                        {dailySummaries.slice(0, 10).map(s => (
                          <div key={s.id} className="border border-slate-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-slate-700">{s.date}</span>
                              <button onClick={() => saveDailySummaries(dailySummaries.filter(x => x.id !== s.id))} className="text-xs text-red-400 hover:text-red-600">删除</button>
                            </div>
                            <div className="space-y-1.5 text-sm text-slate-600">
                              {s.completed && <p><span className="font-medium text-slate-700">完成�?/span>{s.completed.slice(0, 100)}{s.completed.length > 100 ? '...' : ''}</p>}
                              {s.tomorrow && <p><span className="font-medium text-slate-700">计划�?/span>{s.tomorrow.slice(0, 100)}{s.tomorrow.length > 100 ? '...' : ''}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 底部提示 */}
        <div className="mt-8 text-center text-sm text-slate-400">
          以上模板来自职盈学海专业�?天自学交付内容，可复制后根据实际业务调整
        </div>

        {/* 升级提示 */}
        <UpgradeHint
          title="💡 想把这套模板在线落地�?
          description="解锁专业版，在线分配SOP/KPI给团队，自动追踪执行�?
        />

        {/* 创建自定义模板弹�?*/}
        {showCreateDialog && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreateDialog(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-100 shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">创建自定义模�?/h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  自定义模�?{allCustomCount}/{formatLimit(limits.maxCustomTemplates)}
                </p>
              </div>
              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">模板类型</label>
                  <div className="flex gap-2">
                    {([
                      { key: 'speech' as const, label: '话术', icon: <MessageSquare className="w-3.5 h-3.5" /> },
                      { key: 'sop' as const, label: 'SOP', icon: <ClipboardList className="w-3.5 h-3.5" /> },
                      { key: 'ledger' as const, label: '台账', icon: <BookOpen className="w-3.5 h-3.5" /> },
                    ] as const).map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setNewTplType(opt.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          newTplType === opt.key
                            ? 'bg-[#0F2B46] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">模板标题 *</label>
                  <input
                    type="text"
                    value={newTplTitle}
                    onChange={e => setNewTplTitle(e.target.value)}
                    placeholder="如：客户投诉升级处理话术"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-50 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">分类</label>
                  <input
                    type="text"
                    value={newTplCategory}
                    onChange={e => setNewTplCategory(e.target.value)}
                    placeholder={'如：售后处理（留空默�?自定�?�?}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-50 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">模板内容 *</label>
                  <textarea
                    value={newTplContent}
                    onChange={e => setNewTplContent(e.target.value)}
                    placeholder="输入模板内容，支持多行文�?.."
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-50 outline-none text-sm resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setShowCreateDialog(false)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateTemplate}
                  disabled={!newTplTitle.trim() || !newTplContent.trim()}
                  className="px-4 py-2 rounded-lg bg-[#0F2B46] text-white text-sm font-medium hover:bg-[#1a3a5c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  创建模板
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 升级提示弹窗 */}
        {showUpgradeDialog && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowUpgradeDialog(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-6 text-center">
                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">已达自定义模板上�?/h3>
                <p className="text-sm text-gray-500">
                  当前版本最多支�?<span className="font-semibold text-amber-600">{formatLimit(limits.maxCustomTemplates)} �?/span> 自定义模板，解锁旗舰版可无限添加
                </p>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setShowUpgradeDialog(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  知道�?
                </button>
                <Link
                  href="/contact"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#0F2B46] text-white text-sm font-medium hover:bg-[#1a3a5c] transition-colors text-center"
                >
                  咨询开通旗舰版
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
