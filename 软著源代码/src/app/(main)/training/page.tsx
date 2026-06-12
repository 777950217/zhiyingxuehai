'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { trainingModules } from '@/lib/training-data';
import { useAuth } from '@/lib/auth-context';
import {
  GraduationCap, Clock, CheckCircle2, PlayCircle, Users, AlertCircle,
  ClipboardCheck, UserPlus, BookOpen, Briefcase, Award, ChevronDown,
  ChevronUp, CircleDot, CircleCheck, CircleX, Circle,
  ClipboardList, MessageSquare, AlertTriangle, Lightbulb,
  ExternalLink, BarChart3, Copy, Eye, Settings2,
  UserCheck, FileText, Target, TrendingUp,
  Zap, ShieldAlert, Brain, Crown, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { PermissionLocked } from '@/components/permission-locked';

/* ========== Types ========== */
type ModuleStatus = '未开�? | '进行�? | '已完�?;
type AgentTrainingStatus = '未开�? | '学习�? | '待考核' | '已通过' | '需复习';
type OnboardingStepStatus = '待分�? | '已完�? | '未开�? | '进行�? | '通过' | '未通过';
type TabKey = 'onboarding' | 'progress' | 'manage';

const DAILY_PRACTICE_SCENARIOS = [
  { id: 1, title: '水压低投�?, desc: '客户反馈花洒水压不足，如何安抚并解决', icon: '💧' },
  { id: 2, title: '安装条件不符', desc: '客户想装智能马桶但卫生间条件不满�?, icon: '🔧' },
  { id: 3, title: '客服态度投诉', desc: '客户投诉客服态度差，如何处理升级', icon: '😤' },
  { id: 4, title: '催发货处�?, desc: '客户催发货但仓库缺货，如何应�?, icon: '📦' },
  { id: 5, title: '退货退款争�?, desc: '客户要求退货但超过退货期，如何沟�?, icon: '💰' },
  { id: 6, title: '产品参数咨询', desc: '客户询问复杂安装参数，如何准确回�?, icon: '📋' },
];

const STAFF_COURSES = [
  { id: 'c1', title: 'AI助手使用入门', desc: '学会用AI助手3秒出话术', icon: Zap, category: '基础', duration: '10分钟' },
  { id: 'c2', title: '常见问题话术�?, desc: '掌握高频问题的标准回�?, icon: ShieldAlert, category: '基础', duration: '15分钟' },
  { id: 'c3', title: '产品参数速查', desc: '快速查找产品安装参�?, icon: Brain, category: '进阶', duration: '10分钟' },
  { id: 'c4', title: '投诉处理技�?, desc: '应对客户投诉�?步法', icon: ShieldAlert, category: '进阶', duration: '20分钟' },
];

const STATUS_CONFIG: Record<ModuleStatus, { bg: string; icon: React.ReactNode }> = {
  '未开�?: { bg: 'bg-gray-100 text-gray-600', icon: <Clock className="w-3.5 h-3.5" /> },
  '进行�?: { bg: 'bg-blue-100 text-blue-700', icon: <PlayCircle className="w-3.5 h-3.5" /> },
  '已完�?: { bg: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

const AGENT_STATUS_COLORS: Record<AgentTrainingStatus, string> = {
  '未开�?: 'bg-gray-100 text-gray-600',
  '学习�?: 'bg-blue-100 text-blue-700',
  '待考核': 'bg-slate-100 text-blue-900',
  '已通过': 'bg-green-100 text-green-700',
  '需复习': 'bg-red-100 text-red-700',
};

/* ========== Onboarding Config ========== */
interface OnboardingStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  details: string[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'account',
    label: '分配账号',
    icon: <UserPlus className="w-5 h-5" />,
    description: '管理员为新员工创建系统账号，分配角色和权�?,
    details: [
      '管理员在"用户管理"中创建员工账号，角色设为staff',
      '将登录邮箱和初始密码告知新员�?,
      '新员工首次登录后建议修改密码',
      '确认账号可正常访问工作台功能',
    ],
  },
  {
    id: 'course',
    label: '完成课程',
    icon: <BookOpen className="w-5 h-5" />,
    description: '完成3天培训课程的学习和情景考核',
    details: [
      'Day1：产品基础+售中流程（测量判断、旗帜颜色、地址发货�?,
      'Day2：售后处�?安装流程（上报流程、安装单流程�?,
      'Day3：综合情景考核�?道题�?0分以上通过�?,
      '未通过考核需复习重�?,
    ],
  },
  {
    id: 'intern',
    label: '跟班实习',
    icon: <Briefcase className="w-5 h-5" />,
    description: '在老员工带领下实战操作，熟悉日常工作流�?,
    details: [
      '跟随老员工观�?-2天，了解日常工作节奏',
      '在老员工监督下处理客户咨询，逐步独立操作',
      '学习使用AI助手和产品知识库',
      '老员工确认可独立上岗后，标记实习完成',
    ],
  },
  {
    id: 'exam',
    label: '考核上岗',
    icon: <Award className="w-5 h-5" />,
    description: '通过最终考核，正式独立上�?,
    details: [
      '由主管安排最终实操考核（模拟真实客户场景）',
      '考核内容：产品知识应�?流程操作+话术运用',
      '考核通过后正式分配岗�?,
      '未通过则延长实习期�?周后重新考核',
    ],
  },
];

/* ========== SOP Flow types ========== */
const SOP_CATEGORIES = [
  { id: '售前流程', label: '售前流程', color: 'orange', desc: '咨询接待→需求确认→促单成交' },
  { id: '售中流程', label: '售中流程', color: 'blue', desc: '订单确认→物流跟进→签收确认' },
  { id: '售后流程', label: '售后流程', color: 'green', desc: '退换货→投诉处理→差评应对' },
  { id: '日常管理', label: '日常管理', color: 'purple', desc: '交接班→排班→数据汇�? },
  { id: '大促流程', label: '大促流程', color: 'red', desc: '备战→值班→复�? },
] as const;

type SopCategoryColor = 'orange' | 'blue' | 'green' | 'purple' | 'red';

const CATEGORY_STYLE: Record<SopCategoryColor, { bg: string; border: string; text: string; lightBg: string }> = {
  orange: { bg: 'bg-sky-100', border: 'border-sky-200', text: 'text-blue-950', lightBg: 'bg-sky-50' },
  blue: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700', lightBg: 'bg-blue-50' },
  green: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700', lightBg: 'bg-green-50' },
  purple: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700', lightBg: 'bg-purple-50' },
  red: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', lightBg: 'bg-red-50' },
};

interface SopStep {
  title: string;
  description: string;
  script: string;
  note: string;
}

interface SopTemplate {
  id: string;
  category: string;
  name: string;
  scenario: string;
  steps: SopStep[];
  role: string;
  isPreset: boolean;
  version: number;
}

interface OnboardingRecord {
  userId: string;
  userName: string;
  steps: Record<string, OnboardingStepStatus>;
  createdAt: string;
}

/* ========== Course type ========== */
interface Course {
  id: string;
  title: string;
  category: string;
  description: string | null;
  feishu_doc_url: string | null;
  is_preset: boolean;
}

/* ========== Hooks ========== */
function useTrainingProgress(profile: { id?: string; companyId?: string } | null) {
  const { authFetch } = useAuth();
  const [progress, setProgress] = useState<Record<string, { completed: boolean; timestamp: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    const fetchProgress = async () => {
      try {
        const res = await authFetch(`/api/training-data?type=progress&userId=${profile.id}`);
        if (res.ok) {
          const data = await res.json();
          const mapped: Record<string, { completed: boolean; timestamp: number }> = {};
          for (const item of data.data || []) {
            const moduleId = item.module_id as string;
            const currentStep = (item.current_step as number) || 0;
            const completed = item.completed as boolean;
            for (let i = 0; i < currentStep; i++) {
              mapped[`${moduleId}_step_${i}`] = { completed: true, timestamp: Date.now() };
            }
            if (completed) {
              mapped[moduleId] = { completed: true, timestamp: Date.now() };
            }
          }
          setProgress(mapped);
        }
      } catch { /* fallback empty */ }
      setLoading(false);
    };
    fetchProgress();
  }, [profile?.id]);
  return { progress, loading };
}

function useExamRecords(profile: { id?: string } | null) {
  const { authFetch } = useAuth();
  const [records, setRecords] = useState<Record<string, { score: number; answers: number[]; date: string; passed: boolean }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) { setLoading(false); return; }
    const fetchExams = async () => {
      setLoading(true);
      try {
        const res = await authFetch(`/api/training-data?type=exams&userId=${profile.id}`);
        if (res.ok) {
          const data = await res.json();
          const mapped: Record<string, { score: number; answers: number[]; date: string; passed: boolean }> = {};
          for (const item of data.data || []) {
            mapped[item.user_id as string || 'current_user'] = {
              score: item.score as number,
              answers: typeof item.answers === 'string' ? JSON.parse(item.answers as string) : (item.answers as number[]) || [],
              date: (item.created_at as string) || new Date().toISOString(),
              passed: item.passed as boolean,
            };
          }
          setRecords(mapped);
        }
      } catch { /* fallback empty */ }
      finally { setLoading(false); }
    };
    fetchExams();
  }, [profile?.id]);
  return { records, loading };
}

function useOnboardingRecords(profile: { companyId?: string } | null) {
  const { authFetch } = useAuth();
  const [records, setRecords] = useState<OnboardingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.companyId) { setLoading(false); return; }
    const fetchOnboarding = async () => {
      setLoading(true);
      try {
        const res = await authFetch(`/api/training-data?type=onboarding&companyId=${profile.companyId}`);
        if (res.ok) {
          const data = await res.json();
          const mapped: OnboardingRecord[] = (data.data || []).map((item: Record<string, unknown>) => ({
            userId: item.user_id as string,
            userName: (item.user_name as string) || '未知',
            steps: {
              account: (item.step1_status as OnboardingStepStatus) || '待分�?,
              course: (item.step2_status as OnboardingStepStatus) || '未开�?,
              intern: (item.step3_status as OnboardingStepStatus) || '未开�?,
              exam: (item.step4_status as OnboardingStepStatus) || '未开�?,
            },
          }));
          setRecords(mapped);
        }
      } catch { /* fallback empty */ }
      finally { setLoading(false); }
    };
    fetchOnboarding();
  }, [profile?.companyId]);
  return { records, loading };
}

function useSopTemplates() {
  const { authFetch } = useAuth();
  const [templates, setTemplates] = useState<SopTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSop = async () => {
      try {
        const res = await authFetch('/api/sop-templates');
        if (res.ok) {
          const data = await res.json();
          const mapped = (data.data || []).map((t: Record<string, unknown>) => ({
            id: t.id as string,
            category: t.category as string,
            name: t.name as string,
            scenario: (t.scenario as string) || '',
            steps: typeof t.steps_json === 'string' ? JSON.parse(t.steps_json as string) : (t.steps_json as SopStep[]) || [],
            role: (t.role as string) || '',
            isPreset: (t.is_preset as boolean) || false,
            version: (t.version as number) || 1,
          }));
          setTemplates(mapped);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchSop();
  }, []);

  return { templates, loading };
}

function useCourses() {
  const { authFetch } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await authFetch('/api/courses');
        if (res.ok) {
          const data = await res.json();
          setCourses(data.data || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  return { courses, loading };
}

/* ========== Helper functions ========== */
function getModuleStatus(moduleId: string, stepCount: number, progress: Record<string, { completed: boolean; timestamp: number }>): ModuleStatus {
  let completedCount = 0;
  for (let i = 0; i < stepCount; i++) {
    if (progress[`${moduleId}_step_${i}`]?.completed) completedCount++;
  }
  if (completedCount === 0) return '未开�?;
  if (completedCount >= stepCount) return '已完�?;
  return '进行�?;
}

function getStepStatusColor(status: OnboardingStepStatus): string {
  switch (status) {
    case '已完�?: case '通过': return 'text-green-600 bg-green-100';
    case '未通过': return 'text-red-600 bg-red-100';
    case '进行�?: return 'text-blue-600 bg-blue-100';
    case '待分�?: return 'text-blue-700 bg-slate-100';
    default: return 'text-gray-500 bg-gray-100';
  }
}

function getStepIcon(status: OnboardingStepStatus): React.ReactNode {
  switch (status) {
    case '已完�?: case '通过': return <CircleCheck className="w-5 h-5 text-green-500" />;
    case '未通过': return <CircleX className="w-5 h-5 text-red-500" />;
    case '进行�?: return <CircleDot className="w-5 h-5 text-blue-500" />;
    case '待分�?: return <CircleDot className="w-5 h-5 text-sky-400" />;
    default: return <Circle className="w-5 h-5 text-gray-300" />;
  }
}

function getCourseCompletion(progress: Record<string, { completed: boolean; timestamp: number }>): number {
  const allModules = trainingModules.filter((m) => m.steps.length > 0);
  const totalSteps = allModules.reduce((s, m) => s + m.steps.length, 0);
  if (totalSteps === 0) return 0;
  const completedSteps = allModules.reduce((s, m) => {
    let c = 0;
    for (let i = 0; i < m.steps.length; i++) {
      if (progress[`${m.id}_step_${i}`]?.completed) c++;
    }
    return s + c;
  }, 0);
  return Math.round((completedSteps / totalSteps) * 100);
}

const copyText = (text: string, label: string) => {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${label}已复制`),
    () => toast.error('复制失败')
  );
};

/* ========== 7天快速上手课程（专业版） ========== */
const PRO_7DAY_COURSES = [
  { day: 1, title: '了解你的客服团队', desc: '摸清团队现状——几个人、几个岗、各自干什�?, topics: ['团队架构梳理', '岗位职责划分', '现有问题诊断'] },
  { day: 2, title: '搭建基础质检标准', desc: '什么能说、什么不能说，先定红�?, topics: ['质检维度设计', '评分标准制定', '扣分红线定义'] },
  { day: 3, title: '制定KPI指标', desc: '3-5个核心指标，让客服知道怎么干才算好', topics: ['核心指标选取', '目标值设�?, '达标率计�?] },
  { day: 4, title: '排班与分�?, desc: '谁上早班谁上晚班，忙时闲时怎么安排', topics: ['排班原则', '班次设计', '弹性调班机�?] },
  { day: 5, title: '成本意识入门', desc: '每单赚多少、退货亏多少，心里要有数', topics: ['成本构成拆解', '退货成本计�?, '利润核算入门'] },
  { day: 6, title: '话术规范建立', desc: '高频场景统一话术，新手也能快速上�?, topics: ['话术分类梳理', '标准回复模板', 'AI辅助生成话术'] },
  { day: 7, title: '复盘与优�?, desc: '跑了一圈，看看哪里好哪里要�?, topics: ['数据复盘方法', '问题定位分析', '下一轮优化计�?] },
];

/* ========== 45天体系搭建课程（旗舰版） ========== */
const FLAGSHIP_45DAY_COURSES = [
  {
    phase: 1, phaseTitle: '第一阶段：基础搭建�?-15天）', phaseColor: 'bg-sky-100 text-sky-700 border-sky-200',
    courses: [
      { day: '1-3', title: '质检体系搭建', desc: '建立完整的质检评分体系，覆盖售�?售中/售后全流�?, topics: ['质检维度设计(5�?', '评分权重分配', '红线规则定义', '质检流程制度�?] },
      { day: '4-6', title: 'KPI体系搭建', desc: '制定分层KPI体系，不同岗位不同指�?, topics: ['岗位指标差异�?, '目标值设定方�?, '达标�?改进率双�?, 'KPI与绩效挂�?] },
      { day: '7-9', title: '排班制度建立', desc: '科学排班，覆盖高峰低谷，兼顾员工体验', topics: ['流量分析排班�?, '弹性调班机�?, '跨班组协作排�?, '排班工具使用'] },
      { day: '10-12', title: '话术规范体系', desc: '全场景话术标准化，新�?天能上手', topics: ['话术分类体系', '标准回复模板�?, 'AI话术生成', '话术考核机制'] },
      { day: '13-15', title: 'SOP流程沉淀', desc: '把好做法写下来，让经验可复制', topics: ['SOP编写规范', '关键流程文档�?, 'SOP版本管理', '新人SOP培训'] },
    ],
  },
  {
    phase: 2, phaseTitle: '第二阶段：深度优化（16-30天）', phaseColor: 'bg-amber-100 text-amber-700 border-amber-200',
    courses: [
      { day: '16-18', title: '成本管控体系', desc: '精确核算每单成本，找出利润漏水点', topics: ['成本拆解6大项', '退�?赔付成本追踪', '利润预警机制', '成本优化方案'] },
      { day: '19-21', title: '数据驱动决策', desc: '用数据说话，不凭感觉做管�?, topics: ['核心数据看板', '日报/周报/月报', '异常数据预警', '数据复盘方法�?] },
      { day: '22-24', title: '跨班组协�?, desc: '多班组协同作战，信息不脱�?, topics: ['跨组工单流转', '班组间知识共�?, '统一质检标准', '班组PK激�?] },
      { day: '25-27', title: '客户满意度提�?, desc: '从被动响应到主动服务', topics: ['满意度调研设�?, '服务触点优化', '投诉预防机制', '客户分级运营'] },
      { day: '28-30', title: '大促备战方案', desc: '618/�?1不怕，提前准备不慌�?, topics: ['大促排班方案', '话术预案准备', '应急预案制�?, '大促后复�?] },
    ],
  },
  {
    phase: 3, phaseTitle: '第三阶段：体系固化（31-45天）', phaseColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    courses: [
      { day: '31-33', title: 'SOP持续迭代', desc: 'SOP不是写完就完了，要持续更�?, topics: ['SOP反馈机制', '月度评审更新', '版本变更记录', '新人SOP培训流程'] },
      { day: '34-36', title: '培训体系搭建', desc: '让新客服7天能独立上岗', topics: ['培训大纲设计', '每日一练机�?, '模拟考核体系', '培训效果评估'] },
      { day: '37-39', title: '持续改进机制', desc: '管理不是一次性的事，要持续迭�?, topics: ['PDCA循环', '改进提案机制', '月度管理复盘', '目标调整方法'] },
      { day: '40-42', title: '管理能力进阶', desc: '从管事到管人，提升管理效�?, topics: ['绩效面谈技�?, '团队激励方�?, '冲突处理能力', '向上管理沟�?] },
      { day: '43-45', title: '体系验收与交�?, desc: '45天到了，检验成�?, topics: ['体系完整性检�?, '数据对比(前后)', '管理规范文档�?, '后续优化计划'] },
    ],
  },
];

const CATEGORY_ICONS: Record<string, string> = {
  '基础培训': '📘', '产品知识': '🔧', '售前技�?: '💼', '售后技�?: '🛡�?, '大促专题': '🔥',
};

const CATEGORY_COLORS: Record<string, string> = {
  '基础培训': 'bg-blue-100 text-blue-700',
  '产品知识': 'bg-emerald-100 text-emerald-700',
  '售前技�?: 'bg-sky-100 text-blue-900',
  '售后技�?: 'bg-purple-100 text-purple-700',
  '大促专题': 'bg-red-100 text-red-700',
};

/* ========== Main Component ========== */
export default function TrainingPage() {
  const { profile, authFetch } = useAuth();
  const role = profile?.role || 'staff';
  const companyPlan = profile?.companyPlan || '';
  const isStaff = role === 'staff' || role === 'personal_user';
  const isPersonal = role === 'personal_user';
  const isManager = role === 'enterprise_manager';
  const isAdmin = role === 'admin' || role === 'enterprise_admin';
  const showTaskFlow = !isStaff;

  // 三版本培训标题区�?
  const trainingVersion = (() => {
    if (isPersonal) return { title: '客服管理入门', subtitle: 'AI带你从零学起�?天掌握核心技�?, tag: '通用�?, tagColor: 'bg-gray-100 text-gray-700 border-gray-200' };
    if (isAdmin || companyPlan === 'enterprise') return { title: '45天体系搭�?, subtitle: '45天搭建完整管理体系，管控无死�?, tag: '定制�?, tagColor: 'bg-purple-100 text-purple-700 border-purple-200' };
    return { title: '7天快速上�?, subtitle: '7天跑通质检/排班/KPI，够用不浪费', tag: '标准�?, tagColor: 'bg-sky-100 text-blue-700 border-sky-200' };
  })();
  const showManagement = isManager || isAdmin;
  const { progress, loading: progressLoading } = useTrainingProgress(profile);
  const { records: examRecords, loading: examLoading } = useExamRecords(profile);
  const { records: onboardingRecords, loading: onboardingLoading } = useOnboardingRecords(profile);
  const { templates: sopTemplates, loading: sopLoading } = useSopTemplates();
  const { courses, loading: coursesLoading } = useCourses();

  const [activeTab, setActiveTab] = useState<TabKey>('onboarding');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [myOnboarding, setMyOnboarding] = useState<Record<string, OnboardingStepStatus>>({});
  const [sopExpandedSop, setSopExpandedSop] = useState<Set<string>>(new Set());
  const [sopExpandedStep, setSopExpandedStep] = useState<Set<string>>(new Set());
  const [activeSopCategory, setActiveSopCategory] = useState<string>('售前流程');
  const [manageSubTab, setManageSubTab] = useState<'team' | 'courses' | 'sop'>('team');

  // Onboarding completion check
  const onboardingComplete = myOnboarding.account === '已完�?
    && (myOnboarding.course === '已完�? || myOnboarding.course === '通过')
    && (myOnboarding.intern === '已完�? || myOnboarding.intern === '进行�?)
    && (myOnboarding.exam === '通过' || myOnboarding.exam === '已完�?);

  // Load my onboarding
  useEffect(() => {
    if (!profile?.id) return;
    const fetchMyOnboarding = async () => {
      try {
        const res = await authFetch(`/api/training-data?type=onboarding&userId=${profile.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.data && data.data.length > 0) {
            const item = data.data[0];
            setMyOnboarding({
              account: item.step1_status || '已完�?,
              course: item.step2_status || '未开�?,
              intern: item.step3_status || '未开�?,
              exam: item.step4_status || '未开�?,
            });
          }
        }
      } catch { /* fallback empty */ }
    };
    fetchMyOnboarding();
  }, [profile?.id]);

  const saveMyOnboarding = async (data: Record<string, OnboardingStepStatus>) => {
    setMyOnboarding(data);
    try {
      await authFetch('/api/training-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'onboarding',
          userId: profile?.id,
          companyId: profile?.companyId,
          step1Status: data.account,
          step2Status: data.course,
          step3Status: data.intern,
          step4Status: data.exam,
        }),
      });
    } catch { /* ignore */ }
  };

  const coursePercent = getCourseCompletion(progress);
  const examRecord = examRecords['current_user'];
  const examPassed = examRecord?.passed ?? false;

  const autoCourseStatus = (): OnboardingStepStatus => {
    if (coursePercent === 100 && examPassed) return '已完�?;
    if (coursePercent > 0) return '进行�?;
    return '未开�?;
  };

  const getMyOnboarding = (): Record<string, OnboardingStepStatus> => {
    const saved = { ...myOnboarding };
    return {
      account: saved.account || '已完�?,
      course: autoCourseStatus(),
      intern: saved.intern || '未开�?,
      exam: saved.exam || '未开�?,
    };
  };

  const myCurrentOnboarding = getMyOnboarding();

  // Overall progress
  const allModules = trainingModules.filter((m) => m.steps.length > 0);
  const totalSteps = allModules.reduce((s, m) => s + m.steps.length, 0);
  const completedSteps = allModules.reduce((s, m) => {
    let c = 0;
    for (let i = 0; i < m.steps.length; i++) {
      if (progress[`${m.id}_step_${i}`]?.completed) c++;
    }
    return s + c;
  }, 0);
  const overallPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Day-by-day progress
  const dayProgress = useMemo(() => {
    return [1, 2, 3].map((day) => {
      const dayModules = trainingModules.filter((m) => m.day === day);
      let tSteps = 0;
      let cSteps = 0;
      for (const mod of dayModules) {
        tSteps += mod.steps.length;
        for (let i = 0; i < mod.steps.length; i++) {
          if (progress[`${mod.id}_step_${i}`]?.completed) cSteps++;
        }
      }
      return { day, totalSteps: tSteps, completedSteps: cSteps, percent: tSteps > 0 ? Math.round((cSteps / tSteps) * 100) : 0 };
    });
  }, [progress]);

  // Team data from onboarding records
  const teamData = useMemo(() => {
    return onboardingRecords.map((record) => {
      const stepIds = ONBOARDING_STEPS.map((s) => s.id);
      const done = stepIds.filter((id) => {
        const s = record.steps[id];
        return s === '已完�? || s === '通过';
      }).length;
      const percent = Math.round((done / stepIds.length) * 100);
      let status: AgentTrainingStatus = '未开�?;
      if (percent === 100) status = '已通过';
      else if (record.steps.course === '进行�? || record.steps.intern === '进行�?) status = '学习�?;
      else if (record.steps.exam === '未通过') status = '需复习';
      else if (percent > 0) status = '学习�?;
      return { ...record, percent, status };
    });
  }, [onboardingRecords]);

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const updateMyStep = (stepId: string, status: OnboardingStepStatus) => {
    const updated = { ...myCurrentOnboarding, [stepId]: status };
    saveMyOnboarding(updated);
  };

  const updateOnboardingRecord = async (userId: string, stepId: string, status: OnboardingStepStatus) => {
    try {
      await authFetch('/api/training-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'onboarding',
          userId,
          companyId: profile?.companyId,
          step: stepId,
          stepStatus: status,
        }),
      });
      toast.success('状态已更新');
    } catch {
      toast.error('更新失败');
    }
  };

  const computeOnboardingPercent = (steps: Record<string, OnboardingStepStatus>): number => {
    const stepIds = ONBOARDING_STEPS.map((s) => s.id);
    const done = stepIds.filter((id) => {
      const s = steps[id];
      return s === '已完�? || s === '通过';
    }).length;
    return Math.round((done / stepIds.length) * 100);
  };

  const toggleSopExpanded = (sopId: string) => {
    setSopExpandedSop((prev) => {
      const next = new Set(prev);
      if (next.has(sopId)) next.delete(sopId);
      else next.add(sopId);
      return next;
    });
  };

  const toggleSopStepExpanded = (stepKey: string) => {
    setSopExpandedStep((prev) => {
      const next = new Set(prev);
      if (next.has(stepKey)) next.delete(stepKey);
      else next.add(stepKey);
      return next;
    });
  };

  const categorySopList = sopTemplates.filter((t) => t.category === activeSopCategory);

  /* ========== Render ========== */
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-sky-400" />
            {trainingVersion.title}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${trainingVersion.tagColor}`}>{trainingVersion.tag}</span>
          </h1>
          <p className="text-gray-500 mt-1">{trainingVersion.subtitle}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">总体进度</div>
          <div className="text-2xl font-bold text-sky-400">{overallPercent}%</div>
          <div className="text-xs text-gray-400">已学 {completedSteps}/{totalSteps} �?/div>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-sky-400 to-blue-800 transition-all duration-500"
          style={{ width: `${overallPercent}%` }}
        />
      </div>

      {/* 版本专属课程路线�?*/}
      {!isPersonal && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {companyPlan === 'enterprise' || isAdmin ? (
            /* 旗舰�?45天三阶段 */
            <div className="space-y-6">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-500" />
                45天体系搭建路线图
              </h2>
              {FLAGSHIP_45DAY_COURSES.map((phase) => (
                <div key={phase.phase}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${phase.phaseColor}`}>
                      {phase.phaseTitle}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {phase.courses.map((course) => (
                      <div key={course.day} className="rounded-lg border border-slate-100 bg-slate-50 p-3 hover:shadow-sm transition-shadow">
                        <div className="text-[10px] text-gray-400 mb-1">Day {course.day}</div>
                        <div className="text-sm font-semibold text-gray-800 mb-1">{course.title}</div>
                        <div className="text-xs text-gray-500 mb-2">{course.desc}</div>
                        <div className="flex flex-wrap gap-1">
                          {course.topics.map((t) => (
                            <span key={t} className="text-[10px] bg-white border border-slate-200 text-gray-500 px-1.5 py-0.5 rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* 专业�?7天课�?*/
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Zap className="w-5 h-5 text-sky-500" />
                7天快速上手路线图
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PRO_7DAY_COURSES.map((course) => (
                  <div key={course.day} className="rounded-lg border border-slate-100 bg-slate-50 p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center">{course.day}</span>
                      <span className="text-sm font-semibold text-gray-800">{course.title}</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2 ml-8">{course.desc}</div>
                    <div className="flex flex-wrap gap-1 ml-8">
                      {course.topics.map((t) => (
                        <span key={t} className="text-[10px] bg-white border border-slate-200 text-gray-500 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====== Three Tabs ====== */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        <button
          onClick={() => setActiveTab('onboarding')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'onboarding' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          入职培训
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
            activeTab === 'progress' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          我的进度
          {!onboardingComplete && (
            <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-sky-400 rounded-full border-2 border-white" title="请先完成入职流程" />
          )}
        </button>
        {isManager && (
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'manage' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            培训管理
          </button>
        )}
      </div>

      {/* ====== Tab 1: 入职培训 / 每日一�?====== */}
      {activeTab === 'onboarding' && (
        <div className="space-y-6">
          {isStaff ? (
            /* ─── staff: 每日一�?+ 基础课程（轻量入口） ─── */
            <>
              <div className="bg-gradient-to-r from-blue-900 to-blue-950 rounded-xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Target className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">每日一�?/h2>
                    <p className="text-blue-200 text-sm">每天练一题，话术越来越熟</p>
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-100 mb-1">今日场景</p>
                  <p className="text-white font-medium">{DAILY_PRACTICE_SCENARIOS[new Date().getDate() % DAILY_PRACTICE_SCENARIOS.length].title}</p>
                  <p className="text-blue-200 text-sm mt-1">{DAILY_PRACTICE_SCENARIOS[new Date().getDate() % DAILY_PRACTICE_SCENARIOS.length].desc}</p>
                </div>
                <Link
                  href="/practice"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-900 rounded-lg font-medium hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <Zap className="w-4 h-4" /> 开始练�?
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/practice" className="block rounded-xl shadow-md border border-blue-100 bg-white p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center"><Zap className="w-5 h-5 text-sky-400" /></div>
                    <h3 className="font-semibold text-gray-800">话术模拟�?/h3>
                  </div>
                  <p className="text-sm text-gray-500">输入客户问题，AI秒出专业话术</p>
                </Link>
                <Link href="/product-knowledge" className="block rounded-xl shadow-md border border-blue-100 bg-white p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center"><BookOpen className="w-5 h-5 text-sky-400" /></div>
                    <h3 className="font-semibold text-gray-800">产品知识�?/h3>
                  </div>
                  <p className="text-sm text-gray-500">搜索产品参数、安装要求、故障代�?/p>
                </Link>
                <Link href="/rules" className="block rounded-xl shadow-md border border-blue-100 bg-white p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center"><ShieldAlert className="w-5 h-5 text-sky-400" /></div>
                    <h3 className="font-semibold text-gray-800">行业规则�?/h3>
                  </div>
                  <p className="text-sm text-gray-500">72条行业规则，避免踩坑违规</p>
                </Link>
                <Link href="/knowledge-qa" className="block rounded-xl shadow-md border border-blue-100 bg-white p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center"><Brain className="w-5 h-5 text-sky-400" /></div>
                    <h3 className="font-semibold text-gray-800">智能问答</h3>
                  </div>
                  <p className="text-sm text-gray-500">有不懂的？随时问AI助手</p>
                </Link>
              </div>

              <div className="bg-white rounded-xl shadow-md border border-blue-100 p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-sky-400" /> 入门课程�?
                </h3>
                <div className="space-y-3">
                  {STAFF_COURSES.filter(c => c.category === '基础').map(course => {
                          const IconComp = course.icon;
                          return (
                    <div key={course.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-sky-100 hover:bg-sky-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-blue-900">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-800">{course.title}</span>
                          <p className="text-xs text-gray-500">{course.desc}</p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-sky-100 text-blue-900">{course.category}</span>
                    </div>
                  );
                })}
                </div>
              </div>
              {/* 进阶课程�?*/}
              <div className="bg-white rounded-xl shadow-md border border-blue-100 p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-900" /> 进阶课程�?
                </h3>
                <div className="space-y-3">
                {STAFF_COURSES.filter(c => c.category === '进阶').map(course => {
                  const IconComp = course.icon;
                  return (
                    <div key={course.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-sky-100 hover:bg-sky-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-900">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-800">{course.title}</span>
                          <p className="text-xs text-gray-500">{course.desc}</p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-900">{course.category}</span>
                    </div>
                  );
                })}
                </div>
              </div>
            </>
          ) : (
          /* ─── manager/ent_admin: 入职培训（原有逻辑�?─── */
          <>
          {!onboardingComplete && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-sky-400 shrink-0" />
              <div className="text-sm text-blue-900">
                <span className="font-medium">建议先完成入职流�?/span>，再进入课程学习。入职流程是上岗的基础保障�?
              </div>
            </div>
          )}

          {/* My onboarding progress */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-sky-400" />
              {isManager ? '入职流程管理' : '我的入职进度'}
            </h3>

            {/* Step progress bar */}
            <div className="flex items-center mb-8">
              {ONBOARDING_STEPS.map((step, idx) => {
                const status = myCurrentOnboarding[step.id];
                const isDone = status === '已完�? || status === '通过';
                const isActiveStep = status === '进行�? || status === '待分�?;
                return (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isDone ? 'bg-green-500 text-white' :
                        isActiveStep ? 'bg-blue-900 text-white' :
                        'bg-gray-200 text-gray-400'
                      }`}>
                        {isDone ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                      </div>
                      <span className={`text-xs mt-2 font-medium ${isDone ? 'text-green-600' : isActiveStep ? 'text-blue-900' : 'text-gray-400'}`}>
                        {step.label}
                      </span>
                      <span className={`text-xs mt-0.5 px-2 py-0.5 rounded-full ${getStepStatusColor(status)}`}>
                        {status}
                      </span>
                    </div>
                    {idx < ONBOARDING_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 mb-10 rounded ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Expandable step details */}
            <div className="space-y-3">
              {ONBOARDING_STEPS.map((step) => {
                const status = myCurrentOnboarding[step.id];
                const isExpanded = expandedSteps.has(step.id);
                const isDone = status === '已完�? || status === '通过';

                return (
                  <div key={step.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleStep(step.id)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      {getStepIcon(status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{step.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStepStatusColor(status)}`}>
                            {status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <div className="mt-3 space-y-2">
                          {step.details.map((detail, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-sky-400 mt-0.5 flex-shrink-0">�?/span>
                              <span className="text-gray-700">{detail}</span>
                            </div>
                          ))}
                        </div>

                        {/* Self action buttons */}
                        {!isManager && (
                          <div className="mt-4 flex gap-2">
                            {step.id === 'account' && status !== '已完�? && (
                              <button type="button" onClick={() => updateMyStep('account', '已完�?)} className="px-3 py-1.5 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-900 transition-colors">
                                标记账号已分�?
                              </button>
                            )}
                            {step.id === 'intern' && status === '未开�? && (
                              <button type="button" onClick={() => updateMyStep('intern', '进行�?)} className="px-3 py-1.5 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-900 transition-colors">
                                开始实�?
                              </button>
                            )}
                            {step.id === 'intern' && status === '进行�? && (
                              <button type="button" onClick={() => updateMyStep('intern', '已完�?)} className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                                实习完成
                              </button>
                            )}
                            {step.id === 'exam' && status === '未开�? && (
                              <button type="button" onClick={() => updateMyStep('exam', '通过')} className="px-3 py-1.5 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-900 transition-colors">
                                开始考核
                              </button>
                            )}
                          </div>
                        )}

                        {/* Manager action buttons */}
                        {isManager && (
                          <div className="mt-4 flex gap-2">
                            {step.id === 'account' && status === '待分�? && (
                              <button type="button" onClick={() => updateMyStep('account', '已完�?)} className="px-3 py-1.5 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-900 transition-colors">
                                确认已分�?
                              </button>
                            )}
                            {step.id === 'intern' && status !== '已完�? && (
                              <button type="button" onClick={() => updateMyStep('intern', status === '未开�? ? '进行�? : '已完�?)} className="px-3 py-1.5 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-900 transition-colors">
                                {status === '未开�? ? '开始实�? : '确认实习完成'}
                              </button>
                            )}
                            {step.id === 'exam' && status === '未开�? && (
                              <button type="button" onClick={() => updateMyStep('exam', '通过')} className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                                考核通过
                              </button>
                            )}
                            {step.id === 'exam' && status === '未通过' && (
                              <button type="button" onClick={() => updateMyStep('exam', '通过')} className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                                重新考核通过
                              </button>
                            )}
                            {step.id === 'exam' && status === '通过' && (
                              <button type="button" onClick={() => updateMyStep('exam', '未通过')} className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                                标记未通过
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick link to course */}
            {myCurrentOnboarding.course !== '已完�? && (
              <div className="mt-4 p-4 bg-sky-50 border border-sky-100 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-sky-400" />
                  <span className="text-sm text-blue-900">
                    课程进度 {coursePercent}%，{examPassed ? '考核已通过' : '完成课程后继续入职流�?}
                  </span>
                </div>
                <Link href="/training/exam" className="px-3 py-1.5 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-900 transition-colors">
                  去学�?
                </Link>
              </div>
            )}
          </div>

          {/* SOP quick reference */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-sky-400" />
              操作流程速查
            </h3>
            <p className="text-sm text-gray-500 mb-4">标准作业流程，每步含操作说明、话术参考和注意事项�?/p>

            {/* Category tabs */}
            <div className="flex gap-2 flex-wrap mb-4">
              {SOP_CATEGORIES.map((cat) => {
                const style = CATEGORY_STYLE[cat.color as SopCategoryColor];
                const count = sopTemplates.filter((t) => t.category === cat.id).length;
                const isActive = activeSopCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveSopCategory(cat.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      isActive ? `${style.bg} ${style.border} ${style.text} shadow-sm` : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div>{cat.label}</div>
                    {count > 0 && <div className="text-xs mt-0.5 opacity-60">{count}个流�?/div>}
                  </button>
                );
              })}
            </div>

            {/* SOP list */}
            {sopLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-400" />
              </div>
            ) : categorySopList.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>该分类暂无流程模�?/p>
              </div>
            ) : (
              <div className="space-y-3">
                {categorySopList.map((sop) => {
                  const isExpanded = sopExpandedSop.has(sop.id);
                  return (
                    <div key={sop.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleSopExpanded(sop.id)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                          <ClipboardList className="w-4 h-4 text-blue-900" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{sop.name}</span>
                            {sop.isPreset && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">预设</span>}
                            {sop.role && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{sop.role}</span>}
                          </div>
                          {sop.scenario && <p className="text-sm text-gray-500 mt-0.5 truncate">{sop.scenario}</p>}
                        </div>
                        <div className="text-xs text-gray-400 mr-2">{sop.steps.length}�?/div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50/50">
                          <div className="p-4 space-y-3">
                            {sop.steps.map((step, stepIdx) => {
                              const stepKey = `${sop.id}_step_${stepIdx}`;
                              const isStepExpanded = sopExpandedStep.has(stepKey);
                              return (
                                <div key={stepIdx} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => toggleSopStepExpanded(stepKey)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                                  >
                                    <div className="w-6 h-6 rounded-full bg-blue-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                      {stepIdx + 1}
                                    </div>
                                    <span className="font-medium text-gray-900 text-sm">{step.title}</span>
                                    {isStepExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />}
                                  </button>

                                  {isStepExpanded && (
                                    <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
                                      {step.description && <div className="text-sm text-gray-700 pl-9">{step.description}</div>}
                                      {step.script && (
                                        <div className="ml-9 p-3 bg-green-50 border border-green-200 rounded-lg relative">
                                          <div className="flex items-start gap-2">
                                            <MessageSquare className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1">
                                              <div className="text-xs text-green-600 font-medium mb-1">话术参�?/div>
                                              <div className="text-sm text-green-800 whitespace-pre-wrap">{step.script}</div>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => copyText(step.script, '话术')}
                                              className="text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-100 transition-colors flex-shrink-0"
                                            >
                                              <Copy className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                      {step.note && (
                                        <div className="ml-9 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                          <div className="flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                                            <div className="text-sm text-blue-900">{step.note}</div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div className="px-4 pb-3 flex items-center justify-between text-xs text-gray-400">
                            <span>v{sop.version} · {sop.role}</span>
                            {isAdmin && (
                              <Link href={`/sop?edit=${sop.id}`} className="text-sky-400 hover:text-blue-950 transition-colors">
                                在SOP管理中编�?
                              </Link>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

            {/* ─── 升级旗舰版引导（�?manager 可见�?─── */}
            {isManager && (
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-6 text-white mt-6">
                <div className="flex items-center gap-3 mb-3">
                  <Crown className="h-6 w-6 text-sky-400" />
                  <h3 className="text-lg font-bold">学完这些还不够？</h3>
                </div>
                <p className="text-blue-100 text-sm mb-4">
                  咨询开通旗舰版�?5天全流程自学体系，更多实战模块、更细管控维度，独立操盘全盘客服体系
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-400 hover:bg-sky-500 text-blue-950 font-semibold rounded-lg transition-all active:scale-95"
                >
                  咨询开�?
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
            {/* ─── 升级专业�?旗舰版引导（�?personal_user 可见�?─── */}
            {isPersonal && (
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-6 text-white mt-6">
                <div className="flex items-center gap-3 mb-3">
                  <Crown className="h-6 w-6 text-sky-400" />
                  <h3 className="text-lg font-bold">咨询开通专业版/旗舰�?/h3>
                </div>
                <p className="text-blue-100 text-sm mb-4">
                  整套成熟体系线上配齐，自主研读自主练习，小白也能独立上手。专业版7天快速入门，旗舰�?5天全盘搞�?
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-400 hover:bg-sky-500 text-blue-950 font-semibold rounded-lg transition-all active:scale-95"
                >
                  咨询开�?
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
        </>
          )}{/* end role-based branching */}
        </div>
      )}

      {/* ====== Tab 2: 我的进度 ====== */}
      {activeTab === 'progress' && (
        isStaff ? (
          <div className="flex justify-center py-12"><PermissionLocked title="我的进度" description="升级至主管版即可解锁课程体系" /></div>
        ) : (
        <div className="space-y-6">
          {!onboardingComplete && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-sky-400 shrink-0" />
              <div className="text-sm text-blue-900">
                <span className="font-medium">建议先完成入职流�?/span>，入职流程是学习课程的基础�?
              </div>
            </div>
          )}

          {/* Day-by-day progress cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {dayProgress.map(({ day, totalSteps: ts, completedSteps: cs, percent }) => (
              <div key={day} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-900 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-sky-100 text-blue-900 flex items-center justify-center text-sm font-bold">D{day}</span>
                    Day {day}
                  </span>
                  <span className="text-2xl font-bold text-sky-400">{percent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-blue-800 transition-all duration-500" style={{ width: `${percent}%` }} />
                </div>
                <div className="text-xs text-gray-500">已完�?{cs}/{ts} �?/div>
              </div>
            ))}
          </div>

          {/* Module details per day */}
          {[1, 2, 3].map((day) => {
            const dayModules = trainingModules.filter((m) => m.day === day && m.steps.length > 0);
            if (dayModules.length === 0) return null;
            return (
              <div key={day} className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-sky-400" />
                  Day {day} 课程模块
                </h3>
                <div className="space-y-3">
                  {dayModules.map((mod) => {
                    const status = getModuleStatus(mod.id, mod.steps.length, progress);
                    const statusCfg = STATUS_CONFIG[status];
                    let modCompleted = 0;
                    for (let i = 0; i < mod.steps.length; i++) {
                      if (progress[`${mod.id}_step_${i}`]?.completed) modCompleted++;
                    }
                    return (
                      <div key={mod.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{mod.icon}</span>
                            <span className="font-medium text-gray-900">{mod.name}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${statusCfg.bg}`}>
                            {statusCfg.icon} {status}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                          <div className="h-1.5 rounded-full bg-blue-900 transition-all" style={{ width: `${mod.steps.length > 0 ? Math.round((modCompleted / mod.steps.length) * 100) : 0}%` }} />
                        </div>
                        <div className="text-xs text-gray-500">{modCompleted}/{mod.steps.length} 步完�?/div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Course list */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-400" />
              培训课程
            </h3>
            {coursesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
              </div>
            ) : courses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <BookOpen className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm">暂无课程内容</p>
              </div>
            ) : (
              <div className="space-y-3">
                {courses.map((course) => {
                  const hasUrl = !!course.feishu_doc_url;
                  return (
                    <div key={course.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-sky-100 transition-all group">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl shrink-0">{CATEGORY_ICONS[course.category] || '📖'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">{course.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[course.category] || 'bg-gray-100 text-gray-600'}`}>
                              {course.category}
                            </span>
                          </div>
                          {course.description && <p className="text-sm text-gray-500 mt-1">{course.description}</p>}
                        </div>
                        <div className="shrink-0">
                          {hasUrl ? (
                            <a href={course.feishu_doc_url!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-900 hover:text-blue-950 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 transition-colors">
                              <BookOpen className="w-4 h-4" /> 去学�?<ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-400 px-3 py-1.5 rounded-lg bg-gray-50">
                              <Clock className="w-4 h-4" /> 敬请期待
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Exam result */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-sky-400" />
              考核结果
            </h3>
            {examRecord ? (
              <div className="flex items-center gap-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ${examPassed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {examRecord.score}�?
                </div>
                <div>
                  <div className={`text-lg font-semibold ${examPassed ? 'text-green-600' : 'text-red-600'}`}>
                    {examPassed ? '已通过' : '未通过'}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">考核日期：{new Date(examRecord.date).toLocaleDateString()}</div>
                  {!examPassed && (
                    <Link href="/training/exam" className="inline-block mt-2 px-3 py-1.5 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-900 transition-colors">
                      重新考核
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <Award className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">尚未参加考核</p>
                <Link href="/training/exam" className="inline-block mt-3 px-4 py-2 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-900 transition-colors">
                  前往考核
                </Link>
              </div>
            )}
          </div>
        </div>
        )
      )}

      {/* ====== Tab 3: 培训管理 ====== */}
      {activeTab === 'manage' && (
        !showManagement ? (
          <div className="flex justify-center py-12"><PermissionLocked title="培训管理" description="升级至主管版即可解锁团队管理功能" /></div>
        ) : (
        <div className="space-y-6">
          {/* Sub-tabs */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'team' as const, label: '团队进度', icon: <Users className="w-4 h-4" /> },
              { key: 'courses' as const, label: '课程管理', icon: <BookOpen className="w-4 h-4" /> },
              { key: 'sop' as const, label: 'SOP管理', icon: <ClipboardList className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setManageSubTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border flex items-center gap-1.5 ${
                  manageSubTab === tab.key
                    ? 'bg-sky-50 border-sky-200 text-blue-950 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ====== Sub-tab: Team Progress ====== */}
          {manageSubTab === 'team' && (
            <div className="space-y-6">
              {/* Stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: '团队人数', value: teamData.length, color: 'text-gray-700', bg: 'bg-gray-50' },
                  { label: '培训�?, value: teamData.filter((a) => a.status === '学习�?).length, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: '已通过', value: teamData.filter((a) => a.status === '已通过').length, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: '需复习', value: teamData.filter((a) => a.status === '需复习').length, color: 'text-red-600', bg: 'bg-red-50' },
                ].map((stat) => (
                  <div key={stat.label} className={`${stat.bg} rounded-xl p-4 text-center`}>
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Team table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">团队入职进度</h3>
                  <span className="text-xs text-gray-400">{teamData.length} �?/span>
                </div>
                {onboardingLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-400" />
                  </div>
                ) : teamData.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p>暂无新人入职记录</p>
                    <p className="text-sm mt-1">�?用户管理"中添加员工后，入职流程将自动开�?/p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-6 py-3 text-gray-600 font-medium">姓名</th>
                          {ONBOARDING_STEPS.map((s) => (
                            <th key={s.id} className="text-left px-4 py-3 text-gray-600 font-medium">{s.label}</th>
                          ))}
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">总进�?/th>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamData.map((record) => (
                          <tr key={record.userId} className="border-t border-gray-50 hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium text-gray-900">{record.userName}</td>
                            {ONBOARDING_STEPS.map((s) => {
                              const status = record.steps[s.id] || '未开�?;
                              return (
                                <td key={s.id} className="px-4 py-3">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStepStatusColor(status)}`}>
                                    {status}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${computeOnboardingPercent(record.steps) === 100 ? 'bg-green-500' : 'bg-blue-900'}`}
                                    style={{ width: `${computeOnboardingPercent(record.steps)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500">{computeOnboardingPercent(record.steps)}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                {record.steps.account === '待分�? && (
                                  <button type="button" onClick={() => updateOnboardingRecord(record.userId, 'account', '已完�?)} className="text-xs px-2 py-1 rounded bg-sky-50 text-blue-800 hover:bg-sky-100 transition-colors">
                                    分配
                                  </button>
                                )}
                                {record.steps.exam === '未开�? && (
                                  <button type="button" onClick={() => updateOnboardingRecord(record.userId, 'exam', '通过')} className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                                    通过
                                  </button>
                                )}
                                {record.steps.exam === '通过' && (
                                  <button type="button" onClick={() => updateOnboardingRecord(record.userId, 'exam', '未通过')} className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                                    撤回
                                  </button>
                                )}
                                {record.steps.intern === '进行�? && (
                                  <button type="button" onClick={() => updateOnboardingRecord(record.userId, 'intern', '已完�?)} className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                                    实习完成
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* Alert for agents needing review */}
                {teamData.some((a) => a.status === '需复习') && (
                  <div className="px-6 py-3 bg-red-50 border-t border-red-100 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-700">
                      {teamData.filter((a) => a.status === '需复习').map((a) => a.userName).join('�?)}需要复习，建议重新学习对应模块
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ====== Sub-tab: Course Management ====== */}
          {manageSubTab === 'courses' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-400" />
                课程管理
              </h3>
              <p className="text-sm text-gray-500 mb-6">管理培训课程和飞书文档链接，课程按分类展示给学员�?/p>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: '可用课程', value: courses.length, color: 'text-blue-900' },
                  { label: '已开�?, value: courses.filter((c) => c.feishu_doc_url).length, color: 'text-green-600' },
                  { label: '筹备�?, value: courses.filter((c) => !c.feishu_doc_url).length, color: 'text-gray-500' },
                  { label: '完成�?, value: '--', color: 'text-blue-600' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Course list */}
              {coursesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
                </div>
              ) : courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <BookOpen className="w-12 h-12 mb-3 opacity-40" />
                  <p className="text-sm">暂无课程内容</p>
                  <p className="text-xs mt-1">可在SOP管理中添加预设课�?/p>
                </div>
              ) : (
                <div className="space-y-3">
                  {courses.map((course) => (
                    <div key={course.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl shrink-0">{CATEGORY_ICONS[course.category] || '📖'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">{course.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[course.category] || 'bg-gray-100 text-gray-600'}`}>
                              {course.category}
                            </span>
                          </div>
                          {course.description && <p className="text-sm text-gray-500 mt-1">{course.description}</p>}
                        </div>
                        <div className="shrink-0">
                          {course.feishu_doc_url ? (
                            <a href={course.feishu_doc_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-900 hover:text-blue-950 px-2 py-1 rounded bg-sky-50">
                              <Eye className="w-3.5 h-3.5" /> 预览
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded">未开�?/span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ====== Sub-tab: SOP Management ====== */}
          {manageSubTab === 'sop' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-sky-400" />
                SOP流程管理
              </h3>
              <p className="text-sm text-gray-500 mb-6">管理标准作业流程模板，包括话术参考和注意事项�?/p>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {SOP_CATEGORIES.map((cat) => {
                  const count = sopTemplates.filter((t) => t.category === cat.id).length;
                  const style = CATEGORY_STYLE[cat.color as SopCategoryColor];
                  return (
                    <div key={cat.id} className={`p-3 rounded-lg ${style.lightBg} border ${style.border}`}>
                      <div className={`text-xl font-bold ${style.text}`}>{count}</div>
                      <div className="text-xs text-gray-500 mt-1">{cat.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* SOP list by category */}
              {sopLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-400" />
                </div>
              ) : (
                SOP_CATEGORIES.map((cat) => {
                  const catTemplates = sopTemplates.filter((t) => t.category === cat.id);
                  const style = CATEGORY_STYLE[cat.color as SopCategoryColor];
                  return (
                    <div key={cat.id} className="mb-6 last:mb-0">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-sm font-semibold ${style.text}`}>{cat.label}</span>
                        <span className="text-xs text-gray-400">{cat.desc}</span>
                        <span className="text-xs text-gray-400 ml-auto">{catTemplates.length}个流�?/span>
                      </div>
                      {catTemplates.length === 0 ? (
                        <p className="text-sm text-gray-400 py-3 text-center">暂无模板</p>
                      ) : (
                        <div className="space-y-2">
                          {catTemplates.map((sop) => (
                            <div key={sop.id} className="border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0`}>
                                <FileText className={`w-4 h-4 ${style.text}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 text-sm">{sop.name}</span>
                                  {sop.isPreset && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">预设</span>}
                                  {sop.role && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{sop.role}</span>}
                                </div>
                                {sop.scenario && <p className="text-xs text-gray-500 mt-0.5 truncate">{sop.scenario}</p>}
                              </div>
                              <div className="text-xs text-gray-400">{sop.steps.length}�?/div>
                              <div className="text-xs text-gray-400">v{sop.version}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        )
      )}

    </div>
  );
}
