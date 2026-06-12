'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth-context';
import { PageHint } from '@/components/page-hint';
import {
  Rocket, Check, Lock, ChevronRight,
  Calendar, Award, ArrowRight, Sparkles, Play,
  BookOpen, Wrench, ClipboardCheck, BarChart3,
  ChevronDown, ChevronUp, Lightbulb,
  MessageSquare, Swords, Search, Database, Brain, Users, TrendingDown, ClipboardList,
  CheckCircle, Shield, AlertTriangle, LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/* ── Types ── */
interface TaskPreset {
  day: number;
  title: string;
  description: string;
  taskType: 'learn' | 'quiz' | 'practice' | 'review';
  actionTarget: string;
  actionLabel: string;
  icon: React.ReactNode;
  tip: string;
  hardMetric?: string;
  steps?: string[];
  deliverable?: string;
}

interface PhaseConfig {
  key: string;
  label: string;
  range: readonly [number, number];
  color: string;
  goal: string;
}

type RoleTier = 'staff' | 'manager' | 'full';

function getRoleTier(role: UserRole): RoleTier {
  if (role === 'admin' || role === 'enterprise_admin') return 'full';
  if (role === 'enterprise_manager') return 'manager';
  return 'staff';
}

const ROLE_TITLES: Record<RoleTier, string> = {
  staff: '7天快速上�?,
  manager: '7天管理速成',
  full: '7天基础+进阶模块',
};
const ROLE_SUBTITLES: Record<RoleTier, string> = {
  staff: '7天自助操作指引，快速掌握核心功�?,
  manager: '1-5人小体量卫浴商家�?天从诊断到闭环，自己学会管理',
  full: '从诊断基建到独立运营，一步步打造专业客服体�?,
};

/* ── Phase configs ── */
const PHASE_STAFF: PhaseConfig[] = [
  { key: 'basics', label: '基础入门', range: [1, 7] as const, color: 'blue', goal: '7天掌握核心功能，快速上手日常操�? },
];

const PHASE_MANAGER: PhaseConfig[] = [
  { key: 'diagnosis', label: '诊断与搭�?, range: [1, 3] as const, color: 'blue', goal: '全盘诊断乱象根源，搭建SaaS工具与话术体�? },
  { key: 'finance', label: '财务与落�?, range: [4, 5] as const, color: 'green', goal: '搭建财务台账体系，固化业务SOP流程' },
  { key: 'control', label: '管控与闭�?, range: [6, 7] as const, color: 'purple', goal: '建立售后管控与成本预警，整体复盘固化落地' },
];

const PHASE_FULL: PhaseConfig[] = [
  { key: 'base', label: '7天基础速成', range: [1, 7] as const, color: 'blue', goal: '完成系统初始化，建立基础规则' },
  { key: 'advanced', label: '进阶模块（自选）', range: [101, 106] as const, color: 'green', goal: '按需选择进阶模块，不限时间不限顺�? },
];

/* ── 进阶模块定义（旗舰版�?── */
interface AdvancedModule {
  id: number;       // 101-106
  key: string;
  title: string;
  description: string;
  days: number;
  color: string;
  icon: React.ReactNode;
  tasks: TaskPreset[];
}

const ADVANCED_MODULES: AdvancedModule[] = [
  {
    id: 101, key: 'team-groups', title: '多班组管�?, description: '学会创建多个班组、跨班组对比和排班调�?, days: 4, color: 'blue',
    icon: <Users className="w-5 h-5" />,
    tasks: [
      { day: 10101, title: '看课：多班组管理思路', description: '学习如何拆分班组、分配角色、建立跨组协作机�?, taskType: 'learn', actionTarget: '/learning-center?from=onboarding', actionLabel: '去看�?, icon: <BookOpen className="w-4 h-4" />, tip: '多班组的核心不是"分组"，而是"分工"——售前、售中、售后各司其职，才能减少内部扯皮�? },
      { day: 10102, title: '案例�?人→15人的班组拆分', description: '看一个卫浴商家如何从1个组拆成3个组，效率提�?0%', taskType: 'learn', actionTarget: '/teams?from=onboarding', actionLabel: '看案�?, icon: <Lightbulb className="w-4 h-4" />, tip: '拆组的关键是"按职能分"而不�?按人头分"。售前咨�?组、售后处�?组、大促期间临时组1组�? },
      { day: 10103, title: '配置：创建班组并排班', description: '在系统中创建至少2个班组，并完成一周排�?, taskType: 'practice', actionTarget: '/teams?from=onboarding', actionLabel: '去配�?, icon: <Wrench className="w-4 h-4" />, tip: '先创�?个基础班组（如"售中客服�?�?售后客服�?），然后给每个组排一周班�? },
      { day: 10104, title: '验证：跨班组数据对比', description: '对比2个班组本周的KPI和质检数据，确认系统运转正�?, taskType: 'review', actionTarget: '/teams?from=onboarding', actionLabel: '去对�?, icon: <BarChart3 className="w-4 h-4" />, tip: '重点看：各组响应时长、工单解决率、赔付率。差异大的组需要针对性优化�? },
    ],
  },
  {
    id: 102, key: 'approval-flow', title: '赔付审批', description: '搭建分级审批流，杜绝超权赔付和资金漏�?, days: 4, color: 'green',
    icon: <Shield className="w-5 h-5" />,
    tasks: [
      { day: 10201, title: '看课：赔付审批的底层逻辑', description: '理解为什么分级审批能堵住资金漏洞', taskType: 'learn', actionTarget: '/learning-center?from=onboarding', actionLabel: '去看�?, icon: <BookOpen className="w-4 h-4" />, tip: '90%的超权赔付都发生�?主管直接赔了没人�?。分级审批的本质是让每一分钱都有审批人�? },
      { day: 10202, title: '案例：赔付率�?%降到1.5%', description: '看一个商家如何通过审批流堵住每�?万的赔付漏洞', taskType: 'learn', actionTarget: '/approval?from=onboarding', actionLabel: '看案�?, icon: <Lightbulb className="w-4 h-4" />, tip: '关键不是"不让�?，而是"赔了有人知道、有人负�?。审批流让每笔赔付可溯源�? },
      { day: 10203, title: '配置：设置审批阈值和规则', description: '配置主管审批额度、老板审批额度，启用超权拦�?, taskType: 'practice', actionTarget: '/approval?from=onboarding', actionLabel: '去配�?, icon: <Wrench className="w-4 h-4" />, tip: '建议起步值：主管可批�?00元，300-2000元需老板批，2000元以上必须带备注。跑1个月后再调�? },
      { day: 10204, title: '验证：模拟审批流�?, description: '提交一笔测试审批，走完整个审批链，确认规则生效', taskType: 'review', actionTarget: '/approval?from=onboarding', actionLabel: '去验�?, icon: <BarChart3 className="w-4 h-4" />, tip: '测试3种场景：①正常额度主管直�?②超额需老板�?③超权被拦截。全部通过才算配置完成�? },
    ],
  },
  {
    id: 103, key: 'cost-risk', title: '成本风控', description: '掌握成本核算和异常赔付预警，守住利润底线', days: 5, color: 'purple',
    icon: <AlertTriangle className="w-5 h-5" />,
    tasks: [
      { day: 10301, title: '看课：售后成本到底怎么�?, description: '学习售后成本的真实构成：显�?隐�?机会成本', taskType: 'learn', actionTarget: '/learning-center?from=onboarding', actionLabel: '去看�?, icon: <BookOpen className="w-4 h-4" />, tip: '很多老板只算"退了多少钱"，没�?处理退款花了多少人�?�?退货仓库占用多少成�?。这些隐性成本才是大头�? },
      { day: 10302, title: '案例：月�?万到月省8�?, description: '看一个商家如何通过成本预警和异常拦截扭�?, taskType: 'learn', actionTarget: '/business-tools?from=onboarding', actionLabel: '看案�?, icon: <Lightbulb className="w-4 h-4" />, tip: '核心动作�?个：①录入成本基�?②设置异常红�?③每周看亏损漏斗。数据驱动决策比拍脑袋省得多�? },
      { day: 10303, title: '配置：录入成本基线数�?, description: '在经营工具箱录入客服成本、退货成本、赔付成�?, taskType: 'practice', actionTarget: '/business-tools?from=onboarding', actionLabel: '去配�?, icon: <Wrench className="w-4 h-4" />, tip: '参考值：客服人均月成�?000-6000元、退货运费均�?0-80元、售后赔付均�?0-200元。先用估算值也可以�? },
      { day: 10304, title: '配置：启用异常红�?, description: '设置超权赔付、高频赔付、无理由补偿的检测规�?, taskType: 'practice', actionTarget: '/cockpit?from=onboarding', actionLabel: '去配�?, icon: <Wrench className="w-4 h-4" />, tip: '红警3个核心规则：①超权赔付（未经审批直接赔）②高频赔付（同客�?SKU短期多次赔）③无理由补偿�? },
      { day: 10305, title: '验证：查看亏损漏斗和异常报告', description: '确认成本数据正确录入、异常检测正常运�?, taskType: 'review', actionTarget: '/cockpit?from=onboarding', actionLabel: '去验�?, icon: <BarChart3 className="w-4 h-4" />, tip: '重点检查：单品盈利损耗是否显示正确、异常红警是否有误报/漏报�? },
    ],
  },
  {
    id: 104, key: 'data-driven', title: '数据驱动', description: '学会用数据说话，用看板做决策', days: 5, color: 'blue',
    icon: <BarChart3 className="w-5 h-5" />,
    tasks: [
      { day: 10401, title: '看课：数据驱动决策框�?, description: '学习如何�?凭感�?升级�?看数据做决策"', taskType: 'learn', actionTarget: '/learning-center?from=onboarding', actionLabel: '去看�?, icon: <BookOpen className="w-4 h-4" />, tip: '数据驱动的第一步不�?看报�?，而是"定义关键指标"�?个核心：赔付率、响应时长、满意度�? },
      { day: 10402, title: '案例：从月亏2万到月省5千的数据�?, description: '看一个商家如何用3张看板扭转亏�?, taskType: 'learn', actionTarget: '/kpi?from=onboarding', actionLabel: '看案�?, icon: <Lightbulb className="w-4 h-4" />, tip: '3张看板：①KPI看板（团队表现）②赔付看板（资金漏洞）③周报看板（趋势变化）。每周看1次就够了�? },
      { day: 10403, title: '配置：设置KPI目标和质检标准', description: '配置4个核心KPI指标和质检评分规则', taskType: 'practice', actionTarget: '/kpi?from=onboarding', actionLabel: '去配�?, icon: <Wrench className="w-4 h-4" />, tip: '参考值：响应时长�?5秒、满意度�?0%、转化率�?5%、赔付率�?%。先设宽松值，�?个月再收紧�? },
      { day: 10404, title: '配置：设置老板周看�?, description: '确认周看板数据源正确�?个核心数字可正常展示', taskType: 'practice', actionTarget: '/dashboard/boss-weekly?from=onboarding', actionLabel: '去查�?, icon: <Wrench className="w-4 h-4" />, tip: '周看�?个数字：本周赔付、KPI达标率、AI省了多少、有没有异常。每周一�?次�? },
      { day: 10405, title: '验证：用数据做一次决�?, description: '根据周看板数据，找出1个可优化点并制定行动方案', taskType: 'review', actionTarget: '/monthly-report?from=onboarding', actionLabel: '去验�?, icon: <BarChart3 className="w-4 h-4" />, tip: '试试回答�?个问题：①这周哪里最差？②为什么差？③下周怎么改？能答出来就算数据驱动入门了�? },
    ],
  },
  {
    id: 105, key: 'system-build', title: '体系搭建', description: '建立完整SOP和自检机制，让体系自运�?, days: 7, color: 'green',
    icon: <ClipboardCheck className="w-5 h-5" />,
    tasks: [
      { day: 10501, title: '看课：SOP不是写文档是做习�?, description: '理解SOP的本质——把最佳实践变成肌肉记�?, taskType: 'learn', actionTarget: '/learning-center?from=onboarding', actionLabel: '去看�?, icon: <BookOpen className="w-4 h-4" />, tip: 'SOP最大的敌人�?写了没人�?。好的SOP�?页纸+1个流程图+1个检查点，而不�?0页文档�? },
      { day: 10502, title: '案例�?个SOP让赔付率降一�?, description: '看退货SOP、换货SOP、投诉升级SOP如何标准�?, taskType: 'learn', actionTarget: '/training?from=onboarding', actionLabel: '看案�?, icon: <Lightbulb className="w-4 h-4" />, tip: '退货SOP最关键：①确认问题 ②判定责�?③给出方�?④录入系统。每一步都有话术模板�? },
      { day: 10503, title: '配置：创�?个核心SOP', description: '在系统中配置退货、换货、投诉升级的SOP流程', taskType: 'practice', actionTarget: '/training?from=onboarding', actionLabel: '去配�?, icon: <Wrench className="w-4 h-4" />, tip: '先做最常用�?个SOP：退货流程、换货流程、投诉升级流程。其他的后面慢慢加�? },
      { day: 10504, title: '配置：设置自检清单和周期提�?, description: '启用22条自检清单，设置每周提�?, taskType: 'practice', actionTarget: '/self-check?from=onboarding', actionLabel: '去配�?, icon: <Wrench className="w-4 h-4" />, tip: '22条预设清单已经覆盖了日常检查要点，直接启用即可。建议每周一早上做自检�? },
      { day: 10505, title: '配置：激励积分和关键词监�?, description: '设置积分规则和敏感词监控，建立正向激�?风险防范', taskType: 'practice', actionTarget: '/incentive?from=onboarding', actionLabel: '去配�?, icon: <Wrench className="w-4 h-4" />, tip: '积分规则建议：零投诉+5分、好�?3分、快速响�?2分。敏感词至少�?加微�?"私下转账""红包"�? },
      { day: 10506, title: '实战：跑一遍SOP全流�?, description: '模拟一个退货场景，从接单到结单走完整SOP', taskType: 'practice', actionTarget: '/training?from=onboarding', actionLabel: '去实�?, icon: <Swords className="w-4 h-4" />, tip: '选一个最近的真实退货案例，从头到尾按SOP走一遍。看看哪里卡壳、哪里可以优化�? },
      { day: 10507, title: '验证：确认体系可自运�?, description: '检查所有SOP、自检、激励、监控是否正常运�?, taskType: 'review', actionTarget: '/', actionLabel: '去验�?, icon: <BarChart3 className="w-4 h-4" />, tip: '自运转的标志：①SOP有人�?②自检有人�?③异常有人报 ④积分有人看�?�?有人"都有了就算自运转�? },
    ],
  },
  {
    id: 106, key: 'boss-cockpit', title: '老板驾驶�?, description: '学会用驾驶舱看全局，用数据管团�?, days: 5, color: 'purple',
    icon: <LayoutDashboard className="w-5 h-5" />,
    tasks: [
      { day: 10601, title: '看课：老板该看什么数�?, description: '理解驾驶�?个模块各自的意义和使用场�?, taskType: 'learn', actionTarget: '/learning-center?from=onboarding', actionLabel: '去看�?, icon: <BookOpen className="w-4 h-4" />, tip: '老板最该看�?个数字：①本周赔付总额 ②异常赔付数 ③AI省了多少。其他是辅助�? },
      { day: 10602, title: '案例：从"感觉�?�?知道亏在�?', description: '看一个老板如何用驾驶舱找到3个亏损漏�?, taskType: 'learn', actionTarget: '/cockpit?from=onboarding', actionLabel: '看案�?, icon: <Lightbulb className="w-4 h-4" />, tip: '老板最常犯的错�?只看总额不看结构"。SKU亏损排行和分类占比才是真正能指导行动的数据�? },
      { day: 10603, title: '配置：确认驾驶舱数据�?, description: '检�?个模块的数据源是否正常，录入降本基线', taskType: 'practice', actionTarget: '/cost-baseline?from=onboarding', actionLabel: '去配�?, icon: <Wrench className="w-4 h-4" />, tip: '先录入降本对比的基线数据（上线前的赔付率、退款率、响应时长、满意度），这样系统才能自动计算"省了多少"�? },
      { day: 10604, title: '配置：设置资金周报推�?, description: '启用每周资金周报，确认推送时�?, taskType: 'practice', actionTarget: '/cockpit?from=onboarding', actionLabel: '去配�?, icon: <Wrench className="w-4 h-4" />, tip: '资金周报每周一早上自动生成�?个维度：亏损总额、异常明细、AI价值、下周建议�? },
      { day: 10605, title: '验证：用驾驶舱做一次决�?, description: '查看驾驶舱全貌，根据数据制定1个优化行�?, taskType: 'review', actionTarget: '/cockpit?from=onboarding', actionLabel: '去验�?, icon: <BarChart3 className="w-4 h-4" />, tip: '试试回答：①亏损最多的是哪个产品？②异常赔付占比多少？③AI帮你省了多少？答出来驾驶舱就没白用�? },
    ],
  },
];

/* ── Task presets: staff (7 days) ── */
const TASKS_STAFF: TaskPreset[] = [
  { day: 1, title: '认识职盈学海', description: '了解AI助手能帮你做什�?, taskType: 'learn', actionTarget: '/ai-assistant', actionLabel: '去看�?, icon: <BookOpen className="w-4 h-4" />, tip: '职盈学海是你的AI客服搭档，遇到任何客户问题都可以来问它。先熟悉页面布局，知道每个功能在哪里�? },
  { day: 2, title: '试试AI解决�?, description: '输入一个客户问题，看AI怎么回复', taskType: 'practice', actionTarget: '/ai-assistant', actionLabel: '去试�?, icon: <MessageSquare className="w-4 h-4" />, tip: '选一个你最近遇到的真实客户问题输入，看看AI给出的判断和话术。不用纠结完美，先跑通流程�? },
  { day: 3, title: '话术模拟�?, description: '选一个场景练�?, taskType: 'practice', actionTarget: '/practice', actionLabel: '去练�?, icon: <Swords className="w-4 h-4" />, tip: '从预设场景中挑一个最常遇到的，试着回复后看AI打分�?个维度评估，哪里弱补哪里�? },
  { day: 4, title: '产品知识�?, description: '搜索一个你卖的产品参数', taskType: 'practice', actionTarget: '/knowledge-qa', actionLabel: '去搜�?, icon: <Search className="w-4 h-4" />, tip: '试试搜你主推产品的型号，看AI能回答多详细。知识库越完善，AI回答越专业�? },
  { day: 5, title: '常见问题练习', description: '练习3个高频问�?, taskType: 'practice', actionTarget: '/practice', actionLabel: '去练�?, icon: <Wrench className="w-4 h-4" />, tip: '�?水压�?�?催发�?�?签收破损"3个场景各练一遍，这三个是卫浴行业被问最多的�? },
  { day: 6, title: '独立使用AI', description: '不看提示，独立处�?个客户问�?, taskType: 'quiz', actionTarget: '/ai-assistant', actionLabel: '去挑�?, icon: <Brain className="w-4 h-4" />, tip: '这次不看任何操作指引，自己从头到尾用AI解决一个问题。完成后和AI推荐的对比，看看差距在哪�? },
  { day: 7, title: '通关测试', description: '完成3道考试�?, taskType: 'quiz', actionTarget: '/practice', actionLabel: '去测�?, icon: <ClipboardCheck className="w-4 h-4" />, tip: '3道场景题，检验你这周的学习成果�?0分以上为合格，不合格可以重新练习�? },
];

/* ── Task presets: manager (7天自学，专业�?1-5 人小体量卫浴商家) ── */
const TASKS_MANAGER: TaskPreset[] = [
  {
    day: 1,
    title: '全盘摸底诊断 + 梳理乱象根源',
    description: '盘点团队分工、售后痛点、财务现状，明确急需解决的问�?,
    taskType: 'practice',
    actionTarget: '/ai-assistant',
    actionLabel: '去诊�?,
    icon: <Search className="w-4 h-4" />,
    hardMetric: '完成诊断+确认落地优先�?,
    steps: [
      '盘点现有团队分工、接单、咨询、售后、发货全流程卡点，标注核心痛点优先级',
      '梳理目前售后痛点：赔付乱、沟通乱、无统一话术、成本无记录，明确急需解决的问�?,
      '盘点现有台账、财务记账现状：无核算、无利润统计、无数据复盘，同步适配SaaS工具基础功能',
      '根据诊断结果，确认落地优先级，按标准流程推进或调整重�?,
    ],
    deliverable: '商家乱象诊断清单 + 7天落地执行计划表',
    tip: '诊断�?天的基础，不要急着给方案，先自己把"�?说出来，越具体越好。问3个关键问题：你每天最头疼的事是什么？售后赔了多少钱你知道吗？员工犯错你怎么处理�?,
  },
  {
    day: 2,
    title: 'SaaS工具搭建 + 实操落地',
    description: '搭建SaaS基础架构，全员实操录入真实数�?,
    taskType: 'practice',
    actionTarget: '/companies',
    actionLabel: '去搭�?,
    icon: <Wrench className="w-4 h-4" />,
    hardMetric: '工具能用+10条真实数据录�?,
    steps: [
      '搭建SaaS基础架构：客户、订单、售后、备注、标签体�?,
      '分配员工账号权限、统一建档与跟进标�?,
      '确保全员掌握基础操作，每人能独立完成建档、售后登�?,
      '实操硬指标：全员录入10条真实客户数据（含基础信息、订单意�?历史订单），完成SaaS实操落地',
      '针对操作问题即时整改，不堆积问题',
    ],
    deliverable: 'SaaS基础框架搭建完成（全员能独立操作�? 10条真实客户数据录入完成证�?,
    tip: '今天不用急，一个功能一个功能来。每个人亲手操作3遍，比看10遍强�?0条真实数据录入是硬指标，必须完成，这是后面所有台账和财务的基础�?人团队时老板自己录入即可�?,
  },
  {
    day: 3,
    title: '卫浴专属话术库落�?+ 模拟对练',
    description: '搭建全套卫浴话术库，全员模拟对练确保会用',
    taskType: 'practice',
    actionTarget: '/templates',
    actionLabel: '去搭�?,
    icon: <MessageSquare className="w-4 h-4" />,
    hardMetric: '话术会用+模拟对练过关',
    steps: [
      '搭建全套卫浴专属话术库：咨询开场、产品介绍、异议应对、催单逼单',
      '售后专属话术：安抚、理赔、退换货、纠纷处理、差评挽�?,
      '统一对外口径，杜绝随意承�?,
      '全员模拟对练，确保每个人能熟练运用话术（1人团队用AI练兵场模拟实战）',
      '穿插实操纠错，针对话术运用中的问题即时整�?,
    ],
    deliverable: '可直接复制使用的全套话术�?+ 话术模拟对练合格证明',
    tip: '话术不用全背，先搞定最常用�?0条。模拟对练是关键，每个员工至少完�?轮对练才过关�?人团队的老板可以用AI练兵场代替人工对练，效果一样。重点不�?背话�?而是"用话�?�?,
  },
  {
    day: 4,
    title: '简易财务板�?+ 三合一台账体系搭建',
    description: '搭建简易财务板块和3大核心台账，学会对账方法',
    taskType: 'practice',
    actionTarget: '/business-tools',
    actionLabel: '去搭�?,
    icon: <Database className="w-4 h-4" />,
    hardMetric: '会记�?能对�?,
    steps: [
      '依托系统内置经营工具箱，搭建简易财务板块：营收统计、货品成本、固定开支、杂费、售后支出、月度简易利润核算，无需专业财务知识',
      '打�?大核心台账：订单台账、售后台账、财务收支台账，统一登记标准，简化操作流�?,
      '学会每日记账、对账方法，规范售后支出逐笔录入',
      '实操验收：现场完�?笔订单�?笔售后的记账流程，确保掌握方�?,
    ],
    deliverable: '简易财务全套模�?+ 3套台账模�?+ 统一登记规范 + 记账实操验收�?,
    tip: '台账最大的敌人不是"不会�?�?懒得�?。所以今天就用真实数据做一遍，让自己看到记和不记的区别。经营工具箱已经帮你把公式算好了，你只需要填数字就行�?,
  },
  {
    day: 5,
    title: '业务全流程SOP固化 + 实操纠错',
    description: '制定小团队标准SOP，全流程实操演练并清零所有问�?,
    taskType: 'practice',
    actionTarget: '/training',
    actionLabel: '去固�?,
    icon: <ClipboardCheck className="w-4 h-4" />,
    hardMetric: 'SOP落地+卡点清零',
    steps: [
      '制定1-5人团队标准SOP：接单→跟进→下单→发货→售后→复盘',
      '整合话术要点，避免重叠，明确每个人每天的核心工作、操作标�?,
      '杜绝私自承诺、私自赔付、私自降�?,
      '全流程实操演练：完整走一遍业务流程，排查卡点、即时整�?,
      '针对�?天的工具使用、记账、话术运用，进行集中纠错，解决所有未解决的实操问�?,
    ],
    deliverable: '小团队日常工作SOP流程�?+ 流程卡点整改清单 + 实操纠错报告',
    tip: 'SOP不是写出来的�?�?出来的。让员工按流程走一遍，走不通的地方才是真正需要修改的。今天也�?清零�?——前4天所有没解决的问题，今天必须全部清零�?,
  },
  {
    day: 6,
    title: '售后管控 + 成本预警规范搭建',
    description: '设定售后赔付红线和处理标准，建立成本预警机制',
    taskType: 'practice',
    actionTarget: '/cost-alert',
    actionLabel: '去搭�?,
    icon: <TrendingDown className="w-4 h-4" />,
    hardMetric: '明确规则+会用预警',
    steps: [
      '设定卫浴售后基础赔付红线、处理标准、退换货规范',
      '结合财务台账，明确售后支出管控边�?,
      '联动简易财务台账，建立基础售后支出成本预警机制',
      '学会识别异常支出、高售后订单，掌握拦截、降级处理方�?,
      '实操演练：模�?-3种常见售后场景（如理赔、退换货），确保团队能按规则执行',
    ],
    deliverable: '售后处理标准 + 赔付底线规则 + 成本预警执行标准 + 售后场景实操合格证明',
    tip: '售后是小商家最容易�?挖坑"的地方——员工怕差评就乱赔，赔着赔着利润就没了。今天核心是给自己一�?尺子"：什么能赔、什么不能赔、赔多少有标准。模拟演练比讲道理管�?00倍�?,
  },
  {
    day: 7,
    title: '整体复盘 + 固化落地 + 长效运维',
    description: '验收7天成果，确认自运转能力，制定长效运维方案',
    taskType: 'review',
    actionTarget: '/',
    actionLabel: '去复�?,
    icon: <BarChart3 className="w-4 h-4" />,
    hardMetric: '成果验收+会自�?,
    steps: [
      '逐项验收7天成果：SaaS工具是否正常使用、话术库是否落地、台账是否开始记录、SOP是否执行、售后规则是否明�?,
      '确认团队自运转能力：每个人能否独立完成本职工作，无需依赖他人',
      '制定长效运维方案：每�?每周/每月的固定动作清单，确保体系不退�?,
      '建立"问题升级机制"：团队能独立处理常规问题，知道什么情况需要升级、找谁处�?,
      '确认后续支持资源：线上答疑渠道、解锁旗舰版通道、订阅说�?,
    ],
    deliverable: '7天管理速成验收报告 + 长效运维方案 + 问题升级机制文档 + 后续支持资源清单',
    tip: '复盘不是走形式，要让自己�?我学会了什么、我改变了什�?。验收标准不�?别人觉得�?而是"自己能跑"。自运转的关键是简单——每�?分钟就能完成的固定动作，才不会退化�?,
  },
];

/* ── Task presets: full (45 days, keep existing) ── */
const TASKS_FULL_BASE: TaskPreset[] = [
  // ── 7天基础速成 Day 1-7（与专业版相同） ──
  { day: 1, title: '企业建档与团队盘�?, description: '完善企业基本信息（品类、平台、价格带），并录入现有客服人员信�?, taskType: 'practice', actionTarget: '/companies', actionLabel: '去建�?, icon: <Wrench className="w-4 h-4" />, tip: '完整的企业信息是后续AI功能的基础，越详细AI回答越精准。重点填写主营品类、销售平台和价格区间；同时按实际岗位录入客服：售中客服、售后客服、组长、主管，后续培训和KPI都会按岗位分别追踪�? },
  { day: 2, title: '产品档案初始�?, description: '填写核心产品品类、规格参数和安装要点', taskType: 'practice', actionTarget: '/product-profile', actionLabel: '去填�?, icon: <Wrench className="w-4 h-4" />, tip: '优先填写销量TOP10的产品，包括型号、坑距、安装方式。AI会基于这些信息生成更专业的话术�? },
  { day: 3, title: 'AI问题解决器初体验', description: '提交一个真实客户问题，体验AI诊断与话术生�?, taskType: 'learn', actionTarget: '/ai-assistant', actionLabel: '去体�?, icon: <BookOpen className="w-4 h-4" />, tip: '选一个你最近遇到的真实客户问题来测试，感受AI的分析逻辑。不需要完美，先跑通流程�? },
  { day: 4, title: '标准话术库搭�?, description: '导入行业模板或手动添加至�?条标准话�?, taskType: 'practice', actionTarget: '/templates', actionLabel: '去添�?, icon: <Wrench className="w-4 h-4" />, tip: '可以先导�?卫浴新手入门�?模板，再根据自己店铺特点补充修改。高频问题的话术优先整理�? },
  { day: 5, title: 'SOP流程确认', description: '审阅售前、售中、售后SOP模板，确认符合业务实�?, taskType: 'learn', actionTarget: '/training', actionLabel: '去审�?, icon: <BookOpen className="w-4 h-4" />, tip: '逐条对照你目前的实际操作，标注需要调整的地方。SOP是团队的共同语言，务必全员对齐�? },
  { day: 6, title: '完成首次AI诊断', description: '用AI诊断功能深度分析一个客户问题并获取话术', taskType: 'quiz', actionTarget: '/ai-assistant', actionLabel: '去诊�?, icon: <ClipboardCheck className="w-4 h-4" />, tip: '选择一个有争议的售后问题来诊断，对比AI判断和你的经验判断�? },
  { day: 7, title: '基建期复�?, description: '回顾本周成果，确认基建完成度，制定下周计�?, taskType: 'review', actionTarget: '/', actionLabel: '去复�?, icon: <BarChart3 className="w-4 h-4" />, tip: '复盘清单：①产品档案是否完整 ②话术库是否覆盖高频场景 ③SOP是否确认 ④客服是否全部录入。缺什么补什么�? },

];

/* ── Helpers ── */
function getTasksForTier(tier: RoleTier): TaskPreset[] {
  switch (tier) {
    case 'staff': return TASKS_STAFF;
    case 'manager': return TASKS_MANAGER;
    case 'full': return TASKS_FULL_BASE;
  }
}

function getPhasesForTier(tier: RoleTier): PhaseConfig[] {
  switch (tier) {
    case 'staff': return PHASE_STAFF;
    case 'manager': return PHASE_MANAGER;
    case 'full': return PHASE_FULL;
  }
}

function phaseClasses(color: string, type: 'border' | 'badge' | 'bg') {
  const map: Record<string, Record<string, string>> = {
    blue:   { border: 'border-sky-200', badge: 'bg-sky-100 text-blue-900', bg: 'bg-sky-50' },
    green:  { border: 'border-green-300', badge: 'bg-green-100 text-green-700', bg: 'bg-green-50' },
    purple: { border: 'border-purple-300', badge: 'bg-purple-100 text-purple-700', bg: 'bg-purple-50' },
  };
  return map[color]?.[type] || map.blue[type];
}

/* ── localStorage persistence ── */
function getStorageKey(tier: RoleTier): string {
  return `onboarding_progress_${tier}`;
}

function loadProgress(tier: RoleTier): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(getStorageKey(tier));
    if (!raw) return new Set();
    const arr: number[] = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveProgress(tier: RoleTier, completed: Set<number>) {
  try {
    localStorage.setItem(getStorageKey(tier), JSON.stringify([...completed]));
  } catch { /* ignore */ }
}

function isStarted(tier: RoleTier): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(getStorageKey(tier)) !== null;
}

/* ── Phase Header ── */
function PhaseHeader({ phase, completedCount, totalDays }: { phase: PhaseConfig; completedCount: number; totalDays: number }) {
  const percent = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;

  return (
    <div className={`rounded-xl ${phaseClasses(phase.color, 'bg')} border ${phaseClasses(phase.color, 'border')} p-4`}>
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-lg ${
              phase.color === 'blue' ? 'text-blue-800' : phase.color === 'green' ? 'text-green-800' : 'text-purple-800'
            }`}>
              {phase.label}
            </span>
            <span className="text-xs text-gray-500">Day {phase.range[0]}-{phase.range[1]}</span>
          </div>
          <p className="text-sm text-gray-600 mt-0.5">{phase.goal}</p>
        </div>
        <span className={`text-sm font-semibold ${
          phase.color === 'blue' ? 'text-blue-600' : phase.color === 'green' ? 'text-green-600' : 'text-purple-600'
        }`}>
          {percent}%
        </span>
      </div>
      <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            phase.color === 'blue' ? 'bg-blue-400' : phase.color === 'green' ? 'bg-green-400' : 'bg-purple-400'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/* ── Task Card ── */
function TaskCard({
  preset,
  completed,
  isLocked,
  onAction,
  onToggleComplete,
  roleTier,
}: {
  preset: TaskPreset;
  completed: boolean;
  isLocked: boolean;
  onAction: (target: string) => void;
  onToggleComplete: (day: number) => void;
  roleTier: RoleTier;
}) {
  const [tipOpen, setTipOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const phase = getPhasesForTier(roleTier).find(p => preset.day >= p.range[0] && preset.day <= p.range[1]);
  const hasDetails = roleTier === 'manager' && (preset.steps || preset.deliverable || preset.hardMetric);

  return (
    <div className={`relative rounded-xl border p-4 transition-all ${
      completed
        ? 'bg-white border-green-200 shadow-sm'
        : isLocked
        ? 'bg-gray-50 border-gray-200 opacity-60'
        : `bg-white ${phaseClasses(phase?.color || 'blue', 'border')} shadow-sm hover:shadow-md`
    }`}>
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          completed
            ? 'bg-green-100 text-green-600'
            : isLocked
            ? 'bg-gray-100 text-gray-400'
            : phase?.color === 'blue' ? 'bg-sky-100 text-blue-900'
              : phase?.color === 'green' ? 'bg-green-100 text-green-600'
              : 'bg-purple-100 text-purple-600'
        }`}>
          {completed ? <Check className="w-4 h-4" /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : preset.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              completed ? 'bg-green-100 text-green-700' : phaseClasses(phase?.color || 'blue', 'badge')
            }`}>
              Day {preset.day}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              {preset.taskType === 'learn' ? '学习' : preset.taskType === 'quiz' ? '测验' : preset.taskType === 'practice' ? '实操' : '复盘'}
            </span>
            {preset.hardMetric && !isLocked && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                completed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
              }`}>
                硬指�? {preset.hardMetric}
              </span>
            )}
          </div>
          <h4 className={`font-medium mb-1 ${completed ? 'text-gray-500 line-through' : isLocked ? 'text-gray-400' : 'text-gray-800'}`}>
            {preset.title}
          </h4>
          <p className={`text-sm ${completed ? 'text-gray-400' : isLocked ? 'text-gray-300' : 'text-gray-500'}`}>
            {preset.description}
          </p>

          {/* Steps & Deliverable expandable (manager 7-day plan) */}
          {!isLocked && hasDetails && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setStepsOpen(!stepsOpen)}
                className="flex items-center gap-1 text-xs text-blue-800 hover:text-blue-900 transition-colors font-medium"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>执行步骤与交付物</span>
                {stepsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {stepsOpen && (
                <div className="mt-2 space-y-2">
                  {preset.steps && preset.steps.length > 0 && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-xs font-semibold text-blue-900 mb-2">执行步骤</div>
                      <ol className="space-y-1.5">
                        {preset.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                            <span className="pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {preset.deliverable && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="text-xs font-semibold text-green-800 mb-1">当日交付</div>
                      <div className="text-xs text-green-700 leading-relaxed">{preset.deliverable}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tips */}
          {!isLocked && preset.tip && roleTier === 'staff' && (
            <div className="mt-2 p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-700 leading-relaxed">
              <span className="font-medium">操作指引�?/span>{preset.tip}
            </div>
          )}
          {!isLocked && preset.tip && roleTier !== 'staff' && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setTipOpen(!tipOpen)}
                className="flex items-center gap-1 text-xs text-blue-800 hover:text-blue-900 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{roleTier === 'manager' ? '学习要点' : '讲师Tips'}</span>
                {tipOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {tipOpen && (
                <div className="mt-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-blue-900 leading-relaxed">
                  {preset.tip}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="flex-shrink-0">
          {completed ? (
            <button
              onClick={() => onToggleComplete(preset.day)}
              className="inline-flex items-center gap-1 text-xs text-green-600 font-medium hover:text-green-700"
            >
              <Check className="w-3.5 h-3.5" /> 已完�?
            </button>
          ) : isLocked ? (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Day {preset.day}解锁
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction(preset.actionTarget)}
                className={`h-8 text-xs gap-1 ${
                  phase?.color === 'blue' ? 'border-blue-300 text-blue-600 hover:bg-blue-50'
                    : phase?.color === 'green' ? 'border-green-300 text-green-600 hover:bg-green-50'
                    : phase?.color === 'purple' ? 'border-purple-300 text-purple-600 hover:bg-purple-50'
                    : 'border-sky-200 text-blue-900 hover:bg-sky-50'
                }`}
              >
                {preset.actionLabel}
                <ChevronRight className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                onClick={() => onToggleComplete(preset.day)}
                className={`h-8 text-xs gap-1 ${
                  phase?.color === 'blue' ? 'bg-[#2B7DE9] hover:bg-[#1a6dd4]'
                    : phase?.color === 'green' ? 'bg-green-500 hover:bg-green-600'
                    : phase?.color === 'purple' ? 'bg-purple-500 hover:bg-purple-600'
                    : 'bg-blue-900 hover:bg-blue-950'
                } text-white`}
              >
                <Check className="w-3 h-3" />
                完成
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function OnboardingFlowPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const role = profile?.role || 'staff';
  const roleTier = getRoleTier(role);
  const tasks = getTasksForTier(roleTier);
  const phases = getPhasesForTier(roleTier);
  const totalDays = tasks.length;

  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [started, setStarted] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load advanced modules progress from localStorage
  useEffect(() => {
    if (roleTier === 'full') {
      try {
        const saved = localStorage.getItem('onboarding_advanced_modules');
        if (saved) setCompletedModules(new Set(JSON.parse(saved) as string[]));
      } catch { /* ignore */ }
    }
  }, [roleTier]);

  // Load from localStorage after mount (+ Supabase for ent_manager)
  useEffect(() => {
    const localProgress = loadProgress(roleTier);
    setStarted(isStarted(roleTier));

    // For ent_manager, also load from Supabase
    if (roleTier === 'manager' && user?.id && profile?.companyId) {
      (async () => {
        try {
          const res = await fetch(`/api/onboarding-tasks?user_id=${user.id}&company_id=${profile.companyId}`);
          if (res.ok) {
            const { data } = await res.json();
            if (data && Array.isArray(data)) {
              const supabaseDays = new Set(
                data.filter((t: { status: string; day_number: number }) => t.status === 'completed').map((t: { day_number: number }) => t.day_number)
              );
              // Merge: union of local and supabase
              const merged = new Set([...localProgress, ...supabaseDays]);
              setCompletedDays(merged);
              saveProgress(roleTier, merged);
              setMounted(true);
              return;
            }
          }
        } catch { /* fallback to local */ }
        setCompletedDays(localProgress);
        setMounted(true);
      })();
    } else {
      setCompletedDays(localProgress);
      setMounted(true);
    }
  }, [roleTier, user?.id, profile?.companyId]);

  const handleStart = useCallback(() => {
    saveProgress(roleTier, new Set());
    setStarted(true);
    toast.success(roleTier === 'full' ? '7天基础+进阶模块已启动！' : roleTier === 'manager' ? '7天管理速成已启动！' : '7天任务已启动�?);
  }, [roleTier]);

  const handleToggleComplete = useCallback((day: number) => {
    setCompletedDays(prev => {
      const next = new Set(prev);
      const isCompleting = !next.has(day);
      if (isCompleting) {
        next.add(day);
      } else {
        next.delete(day);
      }
      saveProgress(roleTier, next);
      if (isCompleting) {
        toast.success(`Day ${day} 已完成！`);
      }
      // Sync to Supabase for ent_manager
      if (roleTier === 'manager' && user?.id && profile?.companyId) {
        fetch('/api/onboarding-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: profile.companyId,
            user_id: user.id,
            day_number: day,
            status: isCompleting ? 'completed' : 'pending',
          }),
        }).catch(() => { /* silent fail, local progress saved */ });
      }
      return next;
    });
  }, [roleTier, user?.id, profile?.companyId]);

  const handleAction = useCallback((target: string) => {
    router.push(target);
  }, [router]);

  // Toggle advanced module completion
  const handleToggleModule = useCallback((moduleKey: string) => {
    setCompletedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleKey)) {
        next.delete(moduleKey);
      } else {
        next.add(moduleKey);
        toast.success(`"${ADVANCED_MODULES.find(m => m.key === moduleKey)?.title}" 模块已完成！`);
      }
      localStorage.setItem('onboarding_advanced_modules', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Compute stats
  const completedCount = tasks.filter(t => completedDays.has(t.day)).length;
  const overallPercent = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;

  // Current day = first uncompleted day, or totalDays+1 if all done
  const currentDay = tasks.find(t => !completedDays.has(t.day))?.day || totalDays + 1;

  // Group by phase
  const groupedByPhase = phases.map(phase => ({
    phase,
    presets: tasks.filter(t => t.day >= phase.range[0] && t.day <= phase.range[1]),
  }));

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">加载�?..</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-md">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{ROLE_TITLES[roleTier]}</h1>
              <PageHint text={roleTier === 'manager' ? '自己学会管理——专业版7天从诊断到闭环，独立掌握管理方法�? : '自己学会管理——旗舰版7天基础+6进阶模块，从零到会到精通�?} />
            </div>
          </div>
        </div>

        {/* ── Not started: Start card ── */}
        {!started ? (
          <div className="bg-white rounded-2xl shadow-lg border border-blue-200 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              开始你的{ROLE_TITLES[roleTier]}
            </h2>
            <p className="text-gray-500 mb-2 max-w-md mx-auto">
              {roleTier === 'staff'
                ? '我们为你精选了7天核心任务，帮助你快速掌握日常操作�?
                : roleTier === 'manager'
                ? '专为1-5人小体量卫浴商家设计�?天从诊断乱象到闭环落地，自己学会管理�?
                : '我们为你精心设计�?天基础速成+6个自选进阶模块，从基础到精通按自己节奏来�?}
            </p>
            <div className="flex items-center justify-center gap-6 mb-6 text-sm text-gray-600">
              {phases.map(phase => (
                <div key={phase.key} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${
                    phase.color === 'blue' ? 'bg-blue-400' : phase.color === 'green' ? 'bg-green-400' : 'bg-purple-400'
                  }`} />
                  <span>{phase.label} {phase.range[1] - phase.range[0] + 1}�?/span>
                </div>
              ))}
            </div>
            <Button
              onClick={handleStart}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg px-8 gap-2"
            >
              <Play className="w-4 h-4" />
              开始{roleTier === 'full' ? '7天基础+进阶' : roleTier === 'manager' ? '学习' : '7天任�?}
            </Button>
          </div>
        ) : (
          <>
            {/* ── Overall progress ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-800">整体进度</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-500">
                    {roleTier === 'full' ? (
                      <>基础 <span className="font-bold text-blue-600">{completedCount}</span>/{totalDays} �?· 进阶 <span className="font-bold text-purple-600">{completedModules.size}</span>/{ADVANCED_MODULES.length} 模块</>
                    ) : (
                      <>已完�?<span className="font-bold text-blue-600">{completedCount}</span>/{totalDays} �?/>
                    )}
                  </span>
                  {roleTier !== 'full' && (
                    <span className="text-gray-500">
                      当前: Day {Math.min(currentDay, totalDays)}
                    </span>
                  )}
                  <span className="font-bold text-blue-600 text-lg">{overallPercent}%</span>
                </div>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-700"
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
            </div>

            {/* ── Phases ── */}
            <div className="space-y-6 animate-fade-in-up">
              {groupedByPhase.map(({ phase, presets }) => {
                const phaseCompleted = presets.filter(p => completedDays.has(p.day)).length;
                return (
                  <div key={phase.key}>
                    <PhaseHeader phase={phase} completedCount={phaseCompleted} totalDays={presets.length} />
                    <div className="mt-3 space-y-3">
                      {presets.map((preset) => {
                        const completed = completedDays.has(preset.day);
                        // Locked = any previous day not yet completed
                        const locked = !completed && preset.day > 1 && !tasks.slice(0, preset.day - 1).every(t => completedDays.has(t.day));
                        return (
                          <TaskCard
                            key={preset.day}
                            preset={preset}
                            completed={completed}
                            isLocked={locked}
                            onAction={handleAction}
                            onToggleComplete={handleToggleComplete}
                            roleTier={roleTier}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* ── Advanced Modules (flagship only) ── */}
              {roleTier === 'full' && (
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Rocket className="w-5 h-5 text-purple-600" />
                    <h2 className="font-bold text-lg text-gray-800">进阶模块</h2>
                    <span className="text-sm text-gray-500 ml-2">
                      已完�?{completedModules.size}/{ADVANCED_MODULES.length} 个模�?
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    7天基础完成后，自选以下模块深入学习。不限时间、不限顺序，完成一个标记一个�?
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ADVANCED_MODULES.map((mod) => {
                      const isCompleted = completedModules.has(mod.key);
                      return (
                        <div
                          key={mod.key}
                          className={`rounded-xl border-2 p-5 transition-all ${
                            isCompleted
                              ? 'border-green-300 bg-green-50'
                              : 'border-blue-100 bg-white hover:border-blue-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{mod.icon}</span>
                              <h3 className="font-bold text-gray-800">{mod.title}</h3>
                            </div>
                            {isCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
                          </div>
                          <p className="text-sm text-gray-500 mb-3">{mod.description}</p>
                          <div className="text-xs text-gray-400 mb-3">
                            每模块结构：看课 �?案例 �?配置功能 �?验证效果
                          </div>
                          <div className="flex gap-2">
                            {mod.tasks.map((task, idx) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => router.push(task.actionTarget || '#')}
                              >
                                {task.title}
                              </Button>
                            ))}
                            <Button
                              variant={isCompleted ? 'outline' : 'default'}
                              size="sm"
                              className={`text-xs h-7 ml-auto ${
                                isCompleted ? '' : 'bg-green-600 hover:bg-green-700'
                              }`}
                              onClick={() => handleToggleModule(mod.key)}
                            >
                              {isCompleted ? '取消完成' : '标记完成'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Manager upgrade card ── */}
              {roleTier === 'manager' && (
                <div className="mt-6 bg-gradient-to-r from-slate-50 to-sky-50 border border-slate-200 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-sky-400 to-blue-800 flex items-center justify-center flex-shrink-0 shadow-md">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-blue-900 mb-1">完成7天管理速成�?/h3>
                      <p className="text-sm text-blue-800 mb-3">
                        咨询开通旗舰版，解�?大进阶模�?老板驾驶舱，让团队真正运转起来�?
                      </p>
                      <Button
                        onClick={() => router.push('/contact')}
                        size="sm"
                        className="bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-900 hover:to-blue-950 text-white gap-1"
                      >
                        咨询开�?<ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Completion celebration ── */}
            {overallPercent === 100 && (
              <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-6 text-center">
                <Award className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-purple-800 mb-1">
                  恭喜完成{ROLE_TITLES[roleTier]}�?
                </h3>
                <p className="text-sm text-purple-600 mb-4">
                  {roleTier === 'staff'
                    ? '你已掌握核心功能，可以开始日常操作了'
                    : roleTier === 'manager'
                    ? '7天管理速成完成！SaaS工具已搭建，话术库已落地，台账已建立，体系可以自运转�?
                    : '你已从零到一建立起专业客服体系，可以独立运转�?}
                </p>
                {roleTier === 'manager' && (
                  <Button
                    onClick={() => router.push('/contact')}
                    className="mb-3 bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-900 hover:to-blue-950 text-white gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> 了解旗舰�?<ArrowRight className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  onClick={() => router.push('/')}
                  variant="outline"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50 gap-2"
                >
                  返回仪表�?<ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
