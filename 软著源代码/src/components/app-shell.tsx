'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useAuth, UserProfile } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  Menu, LogOut, Bell, Home,
  LayoutDashboard, LayoutList, GraduationCap, Target, Lightbulb, User,
  CalendarCheck, Calendar, BookOpen, Compass,
  MessageSquare, Swords,
  BarChart3, ClipboardList, TrendingDown, TrendingUp, Users,
  Search, Database, Scale,
  Settings, CreditCard, UserCircle,
  ChevronDown, ChevronRight, KeyRound,
  Headphones, ShieldCheck, Shield, ShieldAlert, Briefcase, Lock, AlertTriangle, Clock, FileBarChart, Phone, FileText, Download, Sparkles, Calculator, Route as RouteIcon, CircleHelp, Award, Package, Filter, FileCheck, ClipboardCheck, X, Zap, Brain, NotebookPen, Stethoscope, MessageCircleWarning, Receipt, Activity, ClipboardPen, UserPlus, DollarSign, Wrench, Library,
} from 'lucide-react';
import { ReactNode, useState, useEffect, useCallback } from 'react';
import OnboardingTour from '@/components/onboarding-tour';
import IndustryDialog, { getIndustryProfile } from '@/components/industry-dialog';
import { ConsultDialog } from '@/components/consult-dialog';

// ─── Navigation type definitions ───
interface NavChild {
  href: string;
  label: string;
  icon: ReactNode;
  feature?: string;
  tag?: ReactNode;
  roles?: string[];
}

interface NavGroup {
  key: string;
  label: string;
  subtitle?: string;
  icon: ReactNode;
  children: NavChild[];
  /** Which roles can see this entire group. Empty = all roles */
  roles?: string[];
}

// ─── Navigation structure: 教→学→练→考→�?闭环 ───
const NAV_GROUPS: NavGroup[] = [
  // ─── 首页（所有角色） ───
  {
    key: 'home',
    label: '首页看板',
    icon: <LayoutDashboard className="w-5 h-5" />,
    children: [
      { href: '/', label: '数据看板', icon: <LayoutDashboard className="w-5 h-5" />, feature: 'dashboard' },
    ],
  },

  // ─── 创始人后台（admin专属�?───
  {
    key: 'founder',
    label: '创始人后�?,
    subtitle: '平台管理与运�?,
    icon: <Shield className="w-5 h-5" />,
    roles: ['admin'],
    children: [
      { href: '/admin', label: '数据总览', icon: <BarChart3 className="w-5 h-5" />, feature: 'admin', roles: ['admin'] },
      { href: '/admin/knowledge-extraction', label: '知识萃取', icon: <Brain className="w-5 h-5" />, feature: 'admin', roles: ['admin'] },
      { href: '/admin/audit-logs', label: '审计日志', icon: <FileText className="w-5 h-5" />, feature: 'admin', roles: ['admin'] },
      { href: '/admin/backup', label: '数据备份', icon: <Download className="w-5 h-5" />, feature: 'admin', roles: ['admin'] },
      { href: '/cockpit', label: '驾驶�?, icon: <TrendingDown className="w-5 h-5" />, feature: 'cockpit', roles: ['admin'] },
      { href: '/consultant', label: '顾问面板', icon: <Briefcase className="w-5 h-5" />, feature: 'consultant', roles: ['admin'] },
    ],
  },

  // ─── 主管学堂（专业版主管 + 旗舰版老板�?───
  {
    key: 'school',
    label: '主管学堂',
    subtitle: '学习与实�?,
    icon: <GraduationCap className="w-5 h-5" />,
    roles: ['enterprise_manager', 'enterprise_admin'],
    children: [
      { href: '/learning-path', label: '学习与实�?, icon: <BookOpen className="w-5 h-5" />, feature: 'learning-path' },
      { href: '/knowledge-notes', label: '课程笔记', icon: <NotebookPen className="w-5 h-5" />, feature: 'knowledge-notes' },
    ],
  },

  // ─── 管控看板（主�?旗舰版老板�?───
  {
    key: 'control',
    label: '管控看板',
    subtitle: '日常盯什�?,
    icon: <BarChart3 className="w-5 h-5" />,
    roles: ['enterprise_manager', 'enterprise_admin'],
    children: [
      { href: '/kpi-assessment', label: 'KPI考核', icon: <Target className="w-5 h-5" />, feature: 'kpi-assessment' },
      { href: '/quality', label: '质检评分', icon: <ClipboardCheck className="w-5 h-5" />, feature: 'quality' },
      { href: '/quality-feedback', label: '质检反馈', icon: <MessageCircleWarning className="w-5 h-5" />, feature: 'quality-feedback' },
      { href: '/incentive', label: '激励积�?, icon: <Award className="w-5 h-5" />, feature: 'incentive' },
      { href: '/keyword-monitor', label: '行为监控', icon: <ShieldAlert className="w-5 h-5" />, feature: 'keyword-monitor' },
      { href: '/self-check', label: '自检清单', icon: <ClipboardCheck className="w-5 h-5" />, feature: 'self-check' },
      { href: '/scheduling', label: '排班管理', icon: <Clock className="w-5 h-5" />, feature: 'scheduling' },
      { href: '/agents', label: '客服管理', icon: <Users className="w-5 h-5" />, feature: 'agents' },
      { href: '/roi-ledger', label: 'ROI账本', icon: <DollarSign className="w-5 h-5" />, feature: 'roi' },
    ],
  },

  // ─── 经营工具（主�?老板�?───
  {
    key: 'business-tools',
    label: '经营工具',
    subtitle: '管经�?,
    icon: <Calculator className="w-5 h-5" />,
    roles: ['enterprise_manager', 'enterprise_admin'],
    children: [
      { href: '/kpi-assessment', label: 'KPI考核管理', icon: <Target className="w-5 h-5" />, feature: 'kpi-assessment' },
      { href: '/work-orders', label: '工单台账', icon: <ClipboardList className="w-5 h-5" />, feature: 'work-orders' },
      { href: '/cost-alert', label: '成本预警', icon: <TrendingDown className="w-5 h-5" />, feature: 'cost-alert' },
      { href: '/business-tools', label: '经营工具�?, icon: <Calculator className="w-5 h-5" />, feature: 'business-tools' },
      { href: '/product-profile', label: '产品档案', icon: <Package className="w-5 h-5" />, feature: 'product-profile' },
      { href: '/my-knowledge', label: '我的知识�?, icon: <Library className="w-5 h-5" />, feature: 'my-knowledge' },
      { href: '/industry-knowledge', label: '行业知识�?, icon: <BookOpen className="w-5 h-5" />, feature: 'industry-knowledge' },
    ],
  },

  // ─── 数据看板（专业版主管专属�?───
  {
    key: 'report-to-boss',
    label: '数据看板',
    subtitle: '用数据说�?,
    icon: <FileBarChart className="w-5 h-5" />,
    roles: ['enterprise_manager'],
    children: [
      { href: '/dashboard/boss-weekly', label: '经营周览', icon: <TrendingUp className="w-5 h-5" />, feature: 'boss-weekly' },
      { href: '/monthly-report', label: '月度简�?, icon: <BarChart3 className="w-5 h-5" />, feature: 'monthly-report' },
      { href: '/learning-profile', label: '学堂成果', icon: <Award className="w-5 h-5" />, feature: 'learning-profile' },
      { href: '/rules-and-trends', label: '规则解读', icon: <Scale className="w-5 h-5" />, feature: 'rules-and-trends' },
      { href: '/insights', label: '管理洞察', icon: <Lightbulb className="w-5 h-5" />, feature: 'insights' },
      { href: '/product-knowledge', label: '产品智库', icon: <Database className="w-5 h-5" />, feature: 'product-knowledge' },
      { href: '/roi-ledger', label: 'ROI账本', icon: <DollarSign className="w-5 h-5" />, feature: 'roi' },
    ],
  },

  // ─── 驾驶舱（旗舰版老板 + 创始人） ───
  {
    key: 'cockpit',
    label: '驾驶�?,
    subtitle: '每天看的',
    icon: <TrendingUp className="w-5 h-5" />,
    roles: ['enterprise_admin', 'admin'],
    children: [
      { href: '/cockpit', label: '亏损透视', icon: <TrendingDown className="w-5 h-5" />, feature: 'cockpit' },
      { href: '/cost-baseline', label: '降本对比', icon: <TrendingUp className="w-5 h-5" />, feature: 'cost-baseline' },
      { href: '/cockpit?tab=anomaly', label: '异常红警', icon: <AlertTriangle className="w-5 h-5" />, feature: 'cockpit' },
      { href: '/profit-funnel', label: '单品盈利漏斗', icon: <Filter className="w-5 h-5" />, feature: 'profit-funnel' },
      { href: '/weekly-report', label: '资金周报', icon: <FileBarChart className="w-5 h-5" />, feature: 'weekly-report' },
      { href: '/cockpit-tutorial', label: '驾驶舱教�?, icon: <GraduationCap className="w-5 h-5" />, feature: 'cockpit-tutorial' },
      { href: '/rules-and-trends', label: '规则解读', icon: <Scale className="w-5 h-5" />, feature: 'rules-and-trends' },
      { href: '/insights', label: '经营洞察', icon: <Lightbulb className="w-5 h-5" />, feature: 'insights' },
    ],
  },

  // ─── 审批管理（旗舰版老板 + 创始人） ───
  {
    key: 'approval',
    label: '审批管理',
    icon: <FileCheck className="w-5 h-5" />,
    roles: ['enterprise_admin', 'admin'],
    children: [
      { href: '/approval', label: '赔付审批�?, icon: <FileCheck className="w-5 h-5" />, feature: 'approval' },
    ],
  },



  // ─── 新人培训（员�?主管共享�?───
  {
    key: 'newbie-training',
    label: '新人培训',
    subtitle: '一线速上�?,
    icon: <GraduationCap className="w-5 h-5" />,
    children: [
      { href: '/newbie-training', label: '📋 学习地图', icon: <Compass className="w-4 h-4" />, feature: 'newbie-training', roles: ['admin', 'enterprise_manager'] },
      { href: '/newbie-training?module=1', label: '行业基础知识', icon: <BookOpen className="w-4 h-4" />, feature: 'newbie-training', roles: ['admin', 'enterprise_manager'] },
      { href: '/newbie-training?module=2', label: '全平台规则速查', icon: <ShieldAlert className="w-4 h-4" />, feature: 'newbie-training', roles: ['admin', 'enterprise_manager'] },
      { href: '/newbie-training?module=3', label: '系统实操指南', icon: <ClipboardList className="w-4 h-4" />, feature: 'newbie-training', roles: ['admin', 'enterprise_manager'] },
      { href: '/newbie-training?module=4', label: '售中工作细则', icon: <FileText className="w-4 h-4" />, feature: 'newbie-training', roles: ['admin', 'enterprise_manager'] },
      { href: '/newbie-training?module=8', label: '特殊配件图鉴', icon: <Package className="w-4 h-4" />, feature: 'newbie-training', roles: ['admin', 'enterprise_manager'] },
      { href: '/newbie-training?module=5', label: '售后工作手册', icon: <Scale className="w-4 h-4" />, feature: 'newbie-training', roles: ['admin', 'enterprise_manager'] },
      { href: '/newbie-training?module=6', label: '快捷话术速查', icon: <MessageSquare className="w-4 h-4" />, feature: 'newbie-training', roles: ['admin', 'enterprise_manager'] },
      { href: '/newbie-training?module=7', label: '阶段考核标准', icon: <Award className="w-4 h-4" />, feature: 'newbie-training', roles: ['admin', 'enterprise_manager'] },
      { href: '/newbie-training?module=team-progress', label: '👥 团队进度', icon: <Users className="w-4 h-4" />, roles: ['admin', 'enterprise_manager', 'enterprise_admin'] },
    ],
  },

  // ─── AI练兵场（员工/主管共享�?───
  {
    key: 'practice',
    label: 'AI练兵�?,
    subtitle: '实战出真�?,
    icon: <Target className="w-5 h-5" />,
    children: [
      { href: '/practice', label: '话术练兵�?, icon: <Swords className="w-5 h-5" />, feature: 'practice' },
      { href: '/ai-assistant', label: 'AI急救�?, icon: <MessageSquare className="w-5 h-5" />, feature: 'ai-assistant' },
      { href: '/after-sales-guide', label: '售后攻略', icon: <Wrench className="w-5 h-5" />, feature: 'after-sales-guide' },
    ],
  },

  // ─── AI体检站（个人�?专业版主�?旗舰版老板，子项按角色区分�?───
  {
    key: 'ai-checkup',
    label: 'AI体检�?,
    subtitle: 'AI帮你查漏补缺',
    icon: <Stethoscope className="w-5 h-5" />,
    roles: ['personal_user', 'enterprise_manager', 'enterprise_admin', 'admin'],
    children: [
      { href: '/ai-checkup/speech', label: '话术体检', icon: <MessageCircleWarning className="w-5 h-5" />, roles: ['personal_user', 'enterprise_manager'] },
      { href: '/ai-checkup/sop', label: 'SOP体检', icon: <ClipboardCheck className="w-5 h-5" />, roles: ['personal_user', 'enterprise_manager'] },
      { href: '/ai-checkup/case', label: '案例体检', icon: <Receipt className="w-5 h-5" />, roles: ['personal_user', 'enterprise_manager'] },
      { href: '/ai-checkup/quality', label: '质检体检', icon: <Activity className="w-5 h-5" />, roles: ['personal_user', 'enterprise_manager', 'enterprise_admin'] },
      { href: '/ai-checkup/plan', label: '方案体检', icon: <ClipboardPen className="w-5 h-5" />, roles: ['personal_user', 'enterprise_admin'] },
    ],
  },

  // ─── 行业规则（共享） ───
  {
    key: 'rules',
    label: '行业规则',
    subtitle: '合规有依�?,
    icon: <Scale className="w-5 h-5" />,
    children: [
      { href: '/rules', label: '规则�?, icon: <Scale className="w-5 h-5" />, feature: 'rules' },
      { href: '/templates', label: '模板�?, icon: <FileText className="w-5 h-5" />, feature: 'templates' },
    ],
  },



  // ─── 我的（所有角色） ───
  {
    key: 'my',
    label: '我的',
    icon: <User className="w-5 h-5" />,
    children: [
      { href: '/settings', label: '个人中心', icon: <UserCircle className="w-5 h-5" />, feature: 'settings' },
      { href: '/team/seats', label: '添加坐席', icon: <UserPlus className="w-5 h-5" />, feature: 'team-seats', roles: ['enterprise_manager', 'enterprise_admin'] },
      { href: '/membership', label: '订阅管理', icon: <CreditCard className="w-5 h-5" />, feature: 'membership' },
      { href: '/admin', label: '顾问后台', icon: <ShieldCheck className="w-5 h-5" />, feature: 'admin', roles: ['admin', 'enterprise_manager'] },
      { href: '/admin/audit-logs', label: '审计日志', icon: <FileText className="w-5 h-5" />, feature: 'admin', roles: ['admin'] },
      { href: '/admin/backup', label: '数据备份', icon: <Download className="w-5 h-5" />, feature: 'admin', roles: ['admin'] },
      { href: '/consultant', label: '顾问面板', icon: <Briefcase className="w-5 h-5" />, feature: 'consultant', roles: ['admin', 'enterprise_manager'] },
      { href: '/contact', label: '联系我们', icon: <Phone className="w-5 h-5" />, feature: 'contact' },
    ],
  },
];

// All menu items visible to all roles (locked items show PermissionLocked page)

// ─── Personal User Sidebar (custom grouped structure) ───
interface PersonalSidebarProps {
  pathname: string;
  expandedGroups: Record<string, boolean>;
  toggleGroup: (key: string) => void;
  setSidebarOpen: (open: boolean) => void;
  isPathLocked: (href: string) => boolean;
  role: 'personal_user' | 'efficiency_user';
}

const PERSONAL_NAV_GROUPS = [
  {
    key: 'learn',
    label: '学习中心',
    icon: <GraduationCap className="w-5 h-5" />,
    defaultExpanded: false,
    children: [
      { href: '/growth-dashboard', label: '成果看板', icon: <Award className="w-4 h-4" /> },
      { href: '/learning-path/role', label: '角色认知�?, icon: <Compass className="w-4 h-4" /> },
      { href: '/learning-path/target', label: '目标管理�?, icon: <Target className="w-4 h-4" /> },
      { href: '/learning-path/team', label: '团队带教�?, icon: <Users className="w-4 h-4" /> },
      { href: '/learning-path/business', label: '业务落地�?, icon: <BarChart3 className="w-4 h-4" /> },
    ],
  },
  {
    key: 'ai',
    label: 'AI工作助手',
    icon: <Sparkles className="w-5 h-5" />,
    defaultExpanded: true,
    children: [
      { href: '/ai-assistant', label: 'AI急救�?, icon: <MessageSquare className="w-4 h-4" /> },
      { href: '/after-sales-guide', label: '售后攻略', icon: <Wrench className="w-4 h-4" /> },
      { href: '/quality-feedback', label: '质检反馈', icon: <MessageCircleWarning className="w-4 h-4" /> },
      { href: '/data-input', label: '数据录入', icon: <Database className="w-4 h-4" /> },
      { href: '/ai-reports', label: '周报月报/复盘', icon: <FileText className="w-4 h-4" /> },
      { href: '/chat-check', label: '对话自检', icon: <MessageSquare className="w-4 h-4" /> },
      { href: '/cda-analysis', label: 'CDA分析', icon: <BarChart3 className="w-4 h-4" /> },
    ],
  },
  {
    key: 'product-profile-personal',
    label: '产品档案',
    icon: <Package className="w-5 h-5" />,
    defaultExpanded: false,
    children: [
      { href: '/product-profile-personal', label: '产品档案', icon: <Package className="w-4 h-4" /> },
    ],
  },
  {
    key: 'ai-checkup',
    label: 'AI体检�?,
    icon: <Stethoscope className="w-5 h-5" />,
    defaultExpanded: true,
    children: [
      { href: '/ai-checkup/speech', label: '话术体检', icon: <MessageCircleWarning className="w-4 h-4" /> },
      { href: '/ai-checkup/sop', label: 'SOP体检', icon: <ClipboardCheck className="w-4 h-4" /> },
      { href: '/ai-checkup/case', label: '案例体检', icon: <Receipt className="w-4 h-4" /> },
      { href: '/ai-checkup/quality', label: '质检体检', icon: <Activity className="w-4 h-4" /> },
      { href: '/ai-checkup/plan', label: '方案体检', icon: <ClipboardPen className="w-4 h-4" /> },
    ],
  },
  {
    key: 'tools',
    label: '知识工具',
    icon: <Lightbulb className="w-5 h-5" />,
    defaultExpanded: false,
    children: [
      { href: '/management-plan', label: '我的管理方案', icon: <GraduationCap className="w-4 h-4" /> },
      { href: '/practice', label: '话术练兵�?, icon: <Swords className="w-4 h-4" /> },
      { href: '/knowledge-notes', label: '知识笔记', icon: <BookOpen className="w-4 h-4" /> },
      { href: '/templates', label: '模板�?, icon: <FileText className="w-4 h-4" /> },
      { href: '/my-knowledge', label: '我的知识�?, icon: <Library className="w-4 h-4" /> },
    ],
  },
  {
    key: 'business-tools-personal',
    label: '经营工具',
    icon: <Calculator className="w-5 h-5" />,
    defaultExpanded: true,
    children: [
      { href: '/kpi-assessment', label: 'KPI考核管理', icon: <Target className="w-4 h-4" />, feature: 'kpi-assessment' },
    ],
  },
  {
    key: 'personal',
    label: '我的',
    icon: <User className="w-5 h-5" />,
    defaultExpanded: false,
    children: [
      { href: '/membership', label: '订阅管理', icon: <CreditCard className="w-4 h-4" /> },
      { href: '/settings', label: '个人中心', icon: <UserCircle className="w-4 h-4" /> },
    ],
  },
];

// Locked features for personal_user with explanation tooltips
const PERSONAL_LOCKED_FEATURES: { href: string; label: string; icon: ReactNode; desc: string }[] = [
  { href: '/work-orders', label: '工单管理', icon: <ClipboardList className="w-4 h-4" />, desc: '售后问题分配到人，处理进度一目了然，不再漏单' },
  { href: '/teams', label: '班组管理', icon: <Users className="w-4 h-4" />, desc: '按班组排�?分工，谁在岗谁请假一眼看�? },
  { href: '/cost-alert', label: '成本预警', icon: <AlertTriangle className="w-4 h-4" />, desc: '售后赔付自动统计，超标立刻提醒，堵住隐形亏损' },
  { href: '/customer-records', label: '售后管理', icon: <FileText className="w-4 h-4" />, desc: '5维打分质检，话�?态度/响应/合规/解决率，替你盯质�? },
  { href: '/business-tools', label: '经营工具�?, icon: <Calculator className="w-4 h-4" />, desc: '商品定价+月度盈亏+出纳台账，算清每笔账' },
];

// Locked features for efficiency_user (管理版专�?
const EFFICIENCY_LOCKED_FEATURES: { href: string; label: string; icon: ReactNode; desc: string }[] = [
  { href: '/learning-path', label: '管理课程(25�?', icon: <GraduationCap className="w-4 h-4" />, desc: '25节系统管理课，从0�?掌握客服团队管理方法�? },
  { href: '/ai-checkup/quality', label: '质检体检', icon: <Activity className="w-4 h-4" />, desc: 'AI深度诊断质检体系漏洞，精准定位改进方�? },
  { href: '/ai-checkup/plan', label: '方案体检', icon: <ClipboardPen className="w-4 h-4" />, desc: 'AI评估管理方案可行性，出具优化建议' },

  { href: '/ai-reports', label: '周报月报/复盘', icon: <FileText className="w-4 h-4" />, desc: '一键生成周报月报，数据复盘不再费时费力' },
  { href: '/chat-check', label: '管理工具�?, icon: <Briefcase className="w-4 h-4" />, desc: '对话自检+CDA分析+概念卡，管理诊断三合一' },
  ...PERSONAL_LOCKED_FEATURES,
];

function PersonalSidebar({ pathname, expandedGroups, toggleGroup, setSidebarOpen, isPathLocked, role }: PersonalSidebarProps) {
  const router = useRouter();
  // Initialize default expanded state
  const [localExpanded, setLocalExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of PERSONAL_NAV_GROUPS) {
      initial[g.key] = g.defaultExpanded;
    }
    return initial;
  });
  const [lockedTip, setLockedTip] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showTrialDialog, setShowTrialDialog] = useState(false);
  const [trialingHref, setTrialingHref] = useState<string | null>(null);
  const [showTrialValueCard, setShowTrialValueCard] = useState(false);

  // ── Gray trial: efficiency_user can trial 1 locked feature per month ──
  const getTrialMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };
  const canTrialThisMonth = (href: string): boolean => {
    if (role !== 'efficiency_user') return false;
    const key = `efficiency_trial_${href.replace(/\//g, '_')}_${getTrialMonthKey()}`;
    return !localStorage.getItem(key);
  };
  const markTrialUsed = (href: string) => {
    const key = `efficiency_trial_${href.replace(/\//g, '_')}_${getTrialMonthKey()}`;
    localStorage.setItem(key, '1');
    // Also set a session flag so PermissionLocked components let the user through
    sessionStorage.setItem('efficiency_trial_active', href);
  };
  const handleLockedClick = (href: string) => {
    if (role === 'efficiency_user' && canTrialThisMonth(href)) {
      setTrialingHref(href);
      setShowTrialDialog(true);
    } else {
      setShowUpgradeDialog(true);
    }
  };

  const isExpanded = (key: string) => {
    if (expandedGroups[key] !== undefined) return expandedGroups[key];
    return localExpanded[key] ?? false;
  };

  const handleToggle = (key: string) => {
    setLocalExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    toggleGroup(key);
  };

  return (
    <>
      {/* Home link */}
      <Link
        href="/growth-dashboard"
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-base font-semibold transition-colors duration-200 mb-0.5
          ${pathname === '/growth-dashboard'
            ? 'text-[#2B7DE9] bg-white/10'
            : 'text-white/70 hover:text-[#2B7DE9] hover:bg-white/10'
          }
        `}
      >
        <span className={`shrink-0 ${pathname === '/growth-dashboard' ? 'text-[#2B7DE9]' : 'text-white/50'}`}>
          <Home className="w-5 h-5" />
        </span>
        <span>首页</span>
      </Link>

      {PERSONAL_NAV_GROUPS.map(group => {
        const expanded = isExpanded(group.key);
        const isActive = group.children.some(c => pathname === c.href || pathname.startsWith(c.href + '/'));
        return (
          <div key={group.key} className="mb-0.5">
            <button
              onClick={() => handleToggle(group.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-base font-semibold transition-colors duration-200
                ${isActive ? 'text-[#2B7DE9]' : 'text-white/70 hover:text-[#2B7DE9] hover:bg-white/10'}
              `}
            >
              <span className={`shrink-0 ${isActive ? 'text-[#2B7DE9]' : 'text-white/50'}`}>{group.icon}</span>
              <span className="flex-1 text-left">{group.label}</span>
              {expanded
                ? <ChevronDown className="w-4 h-4 text-white/40" />
                : <ChevronRight className="w-4 h-4 text-white/40" />
              }
            </button>
            {expanded && (
              <div className="mt-0.5 space-y-0.5 ml-3 pl-3 border-l border-white/10">
                {group.children.map(child => {
                  const childActive = pathname === child.href;
                  const locked = isPathLocked(child.href);
                  return (
                    <Link
                      key={`${group.key}-${child.label}`}
                      href={locked ? '#' : child.href}
                      onClick={(e) => {
                        if (locked) { e.preventDefault(); handleLockedClick(child.href); return; }
                        setSidebarOpen(false);
                      }}
                      className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                        ${locked
                          ? 'text-white/30 cursor-pointer hover:text-white/50'
                          : childActive
                            ? 'bg-white/15 text-[#2B7DE9] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-4 before:rounded-full before:bg-[#2B7DE9]'
                            : 'text-white/50 hover:bg-white/10 hover:text-[#2B7DE9]'
                        }
                      `}
                    >
                      <span className={locked ? 'text-white/20' : ''}>{child.icon}</span>
                      <span>{child.label}</span>
                      {locked && <span className="ml-auto flex items-center gap-1 text-[10px] text-white/40"><Lock className="w-3 h-3" />管理版专�?/span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Locked features preview section */}
      <div className="mt-2 pt-2 border-t border-white/10">
        <button
          onClick={() => handleToggle('_locked')}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-base font-semibold text-white/50 hover:text-white/70 hover:bg-white/5 transition-colors duration-200"
        >
          <Lock className="w-5 h-5 text-amber-400/70" />
          <span className="flex-1 text-left">{role === 'efficiency_user' ? '管理版功�? : '专业版功�?}</span>
          {isExpanded('_locked')
            ? <ChevronDown className="w-4 h-4 text-white/30" />
            : <ChevronRight className="w-4 h-4 text-white/30" />
          }
        </button>
        {isExpanded('_locked') && (
          <div className="mt-0.5 space-y-0.5 ml-3 pl-3 border-l border-white/10">
            {(role === 'efficiency_user' ? EFFICIENCY_LOCKED_FEATURES : PERSONAL_LOCKED_FEATURES).map(feat => (
              <button
                key={feat.href}
                onClick={() => handleLockedClick(feat.href)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:text-white/60 hover:bg-white/5 transition-all duration-200"
              >
                <span className="text-white/30">{feat.icon}</span>
                <span>{feat.label}</span>
                <Lock className="w-3 h-3 text-amber-400/50 ml-auto" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Unified upgrade dialog for efficiency_user */}
      {showUpgradeDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">管理版专属功�?/h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                您当前为<span className="font-semibold text-cyan-600">99效率�?/span>账号，本功能为客服管理专属权限，解锁<span className="font-semibold">980买断�?/span>即可解锁全套管理课程+深度AI诊断+团队管控工具。开通时99年费可抵扣，实际支付881元�?
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowUpgradeDialog(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                暂不开�?
              </button>
              <Link
                href="/intro"
                onClick={() => { setShowUpgradeDialog(false); setSidebarOpen(false); }}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all text-sm text-center"
              >
                了解管理�?
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Trial dialog: free 1-time experience this week */}
      {showTrialDialog && trialingHref && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-cyan-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">本月免费体验1�?/h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                效率版用户每月可免费体验1次管理版功能。体验后可对比功能价值，决定是否开通管理版�?80买断�?9年费可抵扣）�?
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => { setShowTrialDialog(false); setTrialingHref(null); }}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                暂不体验
              </button>
              <button
                onClick={() => {
                  markTrialUsed(trialingHref);
                  setShowTrialDialog(false);
                  router.push(trialingHref);
                  setSidebarOpen(false);
                  // Show value comparison card after a short delay
                  setTimeout(() => setShowTrialValueCard(true), 3000);
                  setTrialingHref(null);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all text-sm"
              >
                确认体验
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trial value comparison card */}
      {showTrialValueCard && (
        <div className="fixed bottom-6 right-6 z-[60] max-w-xs">
          <div className="bg-white rounded-2xl shadow-2xl p-4 border border-cyan-100">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-cyan-500" />
              <span className="font-bold text-sm text-gray-900">体验结束，对比一�?/span>
            </div>
            <div className="text-xs text-gray-500 space-y-1 mb-3">
              <p>�?效率�?9/年：AI急救+3项体检+练兵�?档案+模板</p>
              <p>🚀 管理�?80�?25�?�?项体检+KPI+复盘+管理工具</p>
              <p className="text-cyan-600 font-semibold">开通管理版可抵�?9年费</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTrialValueCard(false)}
                className="flex-1 text-xs py-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50"
              >
                知道�?
              </button>
              <Link
                href="/intro"
                onClick={() => setShowTrialValueCard(false)}
                className="flex-1 text-xs py-1.5 bg-cyan-500 text-white font-semibold rounded-lg text-center hover:bg-cyan-600"
              >
                了解管理�?
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Helpers ───
function getRoleBadgeStyle(role: string) {
  switch (role) {
    case 'admin': return 'bg-red-500/20 text-red-300';
    case 'enterprise_admin': return 'bg-purple-500/20 text-purple-300';
    case 'enterprise_manager': return 'bg-sky-500/20 text-sky-300';
    case 'personal_user': return 'bg-green-500/20 text-green-300';
    default: return 'bg-white/10 text-white/50';
  }
}

function getRoleLabel(role: string, companyPlan?: string) {
  switch (role) {
    case 'admin': return '超级管理�?;
    case 'enterprise_admin': return '企业老板';
    case 'enterprise_manager': return companyPlan === 'enterprise' ? '主管/班组�? : '老板/主管';
    case 'personal_user': return '个人学员';
    case 'staff': return '客服';
    default: return '用户';
  }
}

// ─── Component ───
export default function AppShell({ children }: { children: ReactNode }) {
  const { profile, user, signOut, authFetch } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ home: true, 'learning-path': true, 'business-tools': true });
  const [unreadCount, setUnreadCount] = useState(0);

  const role = profile?.role || 'staff';
  const displayName = profile?.displayName || user?.email || '用户';
  const roleBadgeStyle = getRoleBadgeStyle(role);
  const roleLabel = getRoleLabel(role, profile?.companyPlan);

  const [insightUnreadCount, setInsightUnreadCount] = useState(0);
  const [consultOpen, setConsultOpen] = useState(false);

  // Personal user: only learning/AI/knowledge menus, management all locked
  // Staff: only workstation + AI + training + knowledge + work-orders(own)
  const effectiveGroups: NavGroup[] = useMemo(() => {
    if (role === 'personal_user') {
      const coreTag = <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-sky-500/20 text-[#2B7DE9] font-medium leading-none">核心</span>;
      return [
        { key: 'learning-path', label: '课程学习', icon: <BookOpen className="w-5 h-5" />, children: [
          { href: '/learning-path', label: '课程学习', icon: <BookOpen className="w-5 h-5" />, feature: 'learning-path', tag: coreTag },
          { href: '/learning-path#compass', label: '角色认知�?, icon: <Compass className="w-5 h-5" />, feature: 'learning-path' },
          { href: '/learning-path#target', label: '目标管理�?, icon: <Target className="w-5 h-5" />, feature: 'learning-path' },
          { href: '/learning-path#users', label: '团队带教�?, icon: <Users className="w-5 h-5" />, feature: 'learning-path' },
          { href: '/learning-path#barchart', label: '业务落地�?, icon: <BarChart3 className="w-5 h-5" />, feature: 'learning-path' },
          { href: '/ai-assistant', label: 'AI急救�?, icon: <MessageSquare className="w-5 h-5" />, feature: 'ai-assistant', tag: coreTag },
          { href: '/practice', label: '话术练兵�?, icon: <Swords className="w-5 h-5" />, feature: 'practice' },
          { href: '/after-sales-guide', label: '售后攻略', icon: <Wrench className="w-5 h-5" />, feature: 'after-sales-guide' },
          { href: '/my-knowledge', label: '我的知识�?, icon: <Library className="w-5 h-5" />, feature: 'my-knowledge' },
          { href: '/knowledge-notes', label: '课程笔记', icon: <NotebookPen className="w-5 h-5" />, feature: 'knowledge-notes' },
          { href: '/templates', label: '模板�?, icon: <FileText className="w-5 h-5" />, feature: 'templates' },
          { href: '/kpi-assessment', label: 'KPI考核管理', icon: <Target className="w-5 h-5" />, feature: 'kpi-assessment' },
        ]},
        { key: 'my', label: '我的', icon: <User className="w-5 h-5" />, children: [

          { href: '/knowledge-qa', label: '知识问答', icon: <Brain className="w-5 h-5" />, feature: 'knowledge-qa' },
          { href: '/learning-profile', label: '成果看板', icon: <BarChart3 className="w-5 h-5" />, feature: 'learning-profile' },
          { href: '/membership', label: '订阅管理', icon: <CreditCard className="w-5 h-5" />, feature: 'membership' },
          { href: '/contact', label: '联系我们', icon: <Phone className="w-5 h-5" />, feature: 'contact' },
          { href: '/settings', label: '个人中心', icon: <UserCircle className="w-5 h-5" />, feature: 'settings' },
          { href: '/help', label: '帮助中心', icon: <CircleHelp className="w-5 h-5" />, feature: 'help' },
        ]},
      ];
    }

    if (role === 'staff') {
      return [
        // ─── 工作�?───
        { key: 'workbench', label: '工作�?, subtitle: '每天看的', icon: <LayoutList className="w-5 h-5" />, roles: ['staff'], children: [
          { href: '/my-workspace', label: '个人工作�?, icon: <LayoutList className="w-5 h-5" />, roles: ['staff'] },
          { href: '/my-tasks', label: '我的待办', icon: <ClipboardList className="w-5 h-5" />, roles: ['staff'] },
          { href: '/quick-actions', label: '快捷操作', icon: <Zap className="w-5 h-5" />, roles: ['staff'] },
        ]},
        // ─── 日常办公 ───
        { key: 'daily-work', label: '日常办公', subtitle: '日常做什�?, icon: <ClipboardList className="w-5 h-5" />, roles: ['staff'], children: [
          { href: '/work-orders', label: '我的工单', icon: <ClipboardList className="w-5 h-5" />, roles: ['staff'] },
          { href: '/notifications', label: '消息通知', icon: <Bell className="w-5 h-5" />, roles: ['staff'] },
          { href: '/my-schedule', label: '排班查看', icon: <Calendar className="w-5 h-5" />, roles: ['staff'] },
          { href: '/leave-request', label: '请假申请', icon: <FileText className="w-5 h-5" />, roles: ['staff'] },
          { href: '/quality-feedback', label: '质检反馈', icon: <MessageCircleWarning className="w-5 h-5" />, roles: ['staff'] },
          { href: '/my-knowledge', label: '我的知识�?, icon: <Library className="w-5 h-5" />, roles: ['staff'] },
        ]},
        // ─── 个人数据 ───
        { key: 'personal-data', label: '个人数据', subtitle: '我的表现', icon: <BarChart3 className="w-5 h-5" />, roles: ['staff'], children: [
          { href: '/my-kpi', label: '个人KPI', icon: <Target className="w-5 h-5" />, roles: ['staff'] },
          { href: '/my-quality', label: '个人质检评分', icon: <ShieldCheck className="w-5 h-5" />, roles: ['staff'] },
          { href: '/my-incentive', label: '个人激励积�?, icon: <Award className="w-5 h-5" />, roles: ['staff'] },
          { href: '/my-report', label: '个人工作报表', icon: <BarChart3 className="w-5 h-5" />, roles: ['staff'] },
        ]},
        // ─── 学习中心 ───
        { key: 'staff-learning', label: '学习中心', subtitle: '在岗学习', icon: <GraduationCap className="w-5 h-5" />, roles: ['staff'], children: [
          { href: '/learning-path', label: '在岗课程', icon: <BookOpen className="w-5 h-5" />, roles: ['staff'] },
          { href: '/knowledge-notes', label: '课程笔记', icon: <NotebookPen className="w-5 h-5" />, roles: ['staff'] },
          { href: '/business-rules', label: '业务规范', icon: <BookOpen className="w-5 h-5" />, roles: ['staff'] },
          { href: '/self-check-guide', label: '自查须知', icon: <ClipboardCheck className="w-5 h-5" />, roles: ['staff'] },
        ]},
        // ─── 个人中心 ───
        { key: 'my', label: '个人中心', icon: <User className="w-5 h-5" />, roles: ['staff'], children: [
          { href: '/settings', label: '账号设置', icon: <Settings className="w-5 h-5" />, roles: ['staff'] },
          { href: '/settings#password', label: '密码修改', icon: <KeyRound className="w-5 h-5" />, roles: ['staff'] },
          { href: '/settings#profile', label: '我的资料', icon: <UserCircle className="w-5 h-5" />, roles: ['staff'] },
        ]},
      ];
    }

    return NAV_GROUPS;
  }, [role]);

  // Fetch unread notification count
  const fetchUnread = useCallback(async () => {
    if (!profile?.companyId) return;
    try {
      const res = await authFetch(`/api/notifications?company_id=${profile.companyId}&limit=100`);
      if (res.ok) {
        const { data } = await res.json();
        setUnreadCount(Array.isArray(data) ? data.filter((n: { is_read?: boolean }) => !n.is_read).length : 0);
      }
    } catch { /* ignore */ }
  }, [profile?.companyId, authFetch]);

  // Fetch unread insight count
  const fetchInsightUnread = useCallback(async () => {
    if (!profile?.companyId) return;
    try {
      const res = await authFetch(`/api/insights?limit=1&is_read=false`);
      if (res.ok) {
        const data = await res.json();
        setInsightUnreadCount(data.unread || 0);
      }
    } catch { /* ignore */ }
  }, [profile?.companyId, authFetch]);

  useEffect(() => { fetchUnread(); const t = setInterval(fetchUnread, 60000); return () => clearInterval(t); }, [fetchUnread]);
  useEffect(() => { fetchInsightUnread(); const t = setInterval(fetchInsightUnread, 60000); return () => clearInterval(t); }, [fetchInsightUnread]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Auto-expand the group containing the current route
  useEffect(() => {
    for (const group of NAV_GROUPS) {
      if (group.children.some(c => pathname === c.href || pathname.startsWith(c.href + '/'))) {
        setExpandedGroups(prev => ({ ...prev, [group.key]: true }));
      }
    }
  }, [pathname]);

  // Check if a group is visible for current role
  // Permission mapping: which paths are locked for which roles
  const STAFF_LOCKED_PATHS = ['/rules', '/kpi', '/kpi-assessment', '/customer-records', '/cost-alert', '/admin', '/consultant', '/business-tools', '/teams', '/agents', '/reports', '/onboarding-flow', '/companies', '/users', '/monthly-report', '/cockpit', '/cost-baseline', '/profit-funnel', '/approval', '/weekly-report', '/incentive', '/keyword-monitor', '/self-check', '/knowledge-reminder', '/dashboard/boss-weekly', '/quality', '/scheduling', '/rules-and-trends', '/insights', '/team/seats', '/learning-profile', '/staff-management', '/product-knowledge', '/knowledge-qa', '/ai-checkup'];
  const MANAGER_LOCKED_PATHS = ['/admin', '/consultant', '/cockpit', '/profit-funnel', '/approval', '/weekly-report', '/cost-baseline'];
  const PRO_MANAGER_ONLY_LOCKED_PATHS: string[] = []; // 专业版manager已开放班组管理（单班组模式）
  const PERSONAL_LOCKED_PATHS = ['/rules', '/kpi', '/work-orders', '/customer-records', '/cost-alert', '/admin', '/consultant', '/agents', '/teams', '/reports', '/business-tools', '/product-knowledge', '/onboarding-flow', '/companies', '/users', '/training', '/newbie-training', '/monthly-report', '/cockpit', '/cost-baseline', '/profit-funnel', '/approval', '/weekly-report', '/incentive', '/keyword-monitor', '/self-check', '/knowledge-reminder', '/dashboard/boss-weekly', '/quality', '/scheduling', '/rules-and-trends'];
  const EFFICIENCY_LOCKED_PATHS = [
    // 继承 personal_user 的全部锁�?
    ...['/rules', '/kpi', '/work-orders', '/customer-records', '/cost-alert', '/admin', '/consultant', '/agents', '/teams', '/reports', '/business-tools', '/product-knowledge', '/onboarding-flow', '/companies', '/users', '/training', '/newbie-training', '/monthly-report', '/cockpit', '/cost-baseline', '/profit-funnel', '/approval', '/weekly-report', '/incentive', '/keyword-monitor', '/self-check', '/knowledge-reminder', '/dashboard/boss-weekly', '/quality', '/scheduling', '/rules-and-trends'],
    // 效率版额外锁定：管理课程、深度诊断、KPI工具、管理工具包
    '/learning-path', '/ai-checkup/quality', '/ai-checkup/plan', '/ai-reports', '/chat-check', '/cda-analysis', '/data-input',
  ];
  const TRIAL_EXPIRED_MANAGER_PATHS = ['/rules', '/kpi-assessment', '/work-orders', '/customer-records', '/cost-alert', '/training'];
  const isTrialExpired = !!(profile?.trialEndAt && new Date(profile.trialEndAt) < new Date());
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [showIndustryDialog, setShowIndustryDialog] = useState(false);
  const [showEfficiencyOnboard, setShowEfficiencyOnboard] = useState(false);

  useEffect(() => {
    if (!profile?.trialEndAt) { setTrialDaysLeft(null); return; }
    setTrialDaysLeft(Math.ceil((new Date(profile.trialEndAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }, [profile?.trialEndAt]);

  // Show industry dialog for personal_user on first login
  useEffect(() => {
    if ((profile?.role === 'personal_user' || profile?.role === 'efficiency_user') && !getIndustryProfile()) {
      setShowIndustryDialog(true);
    }
  }, [profile?.role]);

  // Show efficiency onboarding dialog once for efficiency_user
  useEffect(() => {
    if (profile?.role === 'efficiency_user' && !localStorage.getItem('efficiency_onboarded')) {
      setShowEfficiencyOnboard(true);
    }
  }, [profile?.role]);
  const isPathLocked = (href: string): boolean => {
    if (role === 'admin') return false;
    // 旗舰版老板：全功能访问，只锁管理员工具 + AI体检站中不该看的子项
    if (role === 'enterprise_admin') {
      if (['/admin', '/consultant'].includes(href)) return true;
      if (['/ai-checkup/speech', '/ai-checkup/sop', '/ai-checkup/case'].includes(href)) return true;
      return false;
    }
    // 个人版：锁定所有企业管理工�?
    if (role === 'personal_user') return PERSONAL_LOCKED_PATHS.includes(href);
    // 99效率版：锁定企业管理工具 + 管理课程/深度诊断/KPI/管理工具�?
    if (role === 'efficiency_user') {
      // If user is trialing this feature this session, unlock it
      const trialActive = typeof window !== 'undefined' ? sessionStorage.getItem('efficiency_trial_active') : null;
      if (trialActive && (href === trialActive || href.startsWith(trialActive))) return false;
      return EFFICIENCY_LOCKED_PATHS.includes(href);
    }
    // 试用到期的专业版主管：额外锁定管理功�?
    if (isTrialExpired && role === 'enterprise_manager') {
      return MANAGER_LOCKED_PATHS.includes(href) || TRIAL_EXPIRED_MANAGER_PATHS.includes(href);
    }
    // 专业版主管：锁管理员工具 + AI体检站中不该看的子项
    if (role === 'enterprise_manager') {
      if (MANAGER_LOCKED_PATHS.includes(href)) return true;
      if (['/ai-checkup/plan'].includes(href)) return true;
      if (profile?.companyPlan !== 'enterprise' && PRO_MANAGER_ONLY_LOCKED_PATHS.includes(href)) return true;
      return false;
    }
    // staff: 锁定企业管理 + AI体检站（全部�?
    return STAFF_LOCKED_PATHS.some(p => href === p || (p === '/ai-checkup' && href.startsWith('/ai-checkup')));
  };

  const isGroupVisible = (group: NavGroup) => {
    // Founder (admin): 只看创始人后台导�?
    if (role === 'admin') {
      const founderVisibleGroups = ['founder', 'home', 'my'];
      return founderVisibleGroups.includes(group.key);
    }
    // Hide team monitoring group entirely for personal/efficiency users
    if ((role === 'personal_user' || role === 'efficiency_user') && group.key === 'team') return false;
    // Boss (enterprise_admin): 驾驶�?+ 审批管理 + AI体检�?+ 经营工具 + 新人培训 + 学习 + 首页看板 + 我的
    if (role === 'enterprise_admin') {
      const bossVisibleGroups = ['home', 'school', 'control', 'cockpit', 'approval', 'ai-checkup', 'business-tools', 'newbie-training', 'practice', 'rules', 'my'];
      return bossVisibleGroups.includes(group.key);
    }
    if (!group.roles || group.roles.length === 0) return true;
    return group.roles.includes(role);
  };

  // Check if a child item is visible for current role
  const isChildVisible = (child: NavChild) => {
    if (child.roles && child.roles.length > 0 && !child.roles.includes(role)) return false;
    return true;
  };

  // Dynamic label for personal users
  const getGroupLabel = (group: NavGroup) => {
    if (role === 'personal_user' && group.key === 'home') return '学习中心';
    return group.label;
  };
  const getGroupSubtitle = (group: NavGroup) => {
    if (role === 'personal_user' && group.key === 'home') return '每天进步一点点';
    return group.subtitle;
  };
  const getChildLabel = (group: NavGroup, child: NavChild) => {
    if (role === 'personal_user' && group.key === 'home' && child.href === '/') return '学习中心';
    return child.label;
  };

  // Determine if a group is "active" (has an active child)
  const isGroupActive = (group: NavGroup) => {
    return group.children.some(c => pathname === c.href || pathname.startsWith(c.href + '/'));
  };

  // Page header name
  const getHeaderName = () => {
    for (const group of NAV_GROUPS) {
      for (const child of group.children) {
        if (pathname === child.href || pathname.startsWith(child.href + '/')) {
          return `${getGroupLabel(group)} / ${getChildLabel(group, child)}`;
        }
      }
    }
    return '职盈学海';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ─── Sidebar ─── */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#0F2B46]
        flex flex-col transition-transform duration-200
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <Link
          href={role === 'personal_user' || role === 'efficiency_user' ? '/growth-dashboard' : '/'}
          className="h-16 flex items-center gap-2.5 px-5 border-b border-white/10 shrink-0 cursor-pointer hover:bg-white/5 transition-colors duration-200"
        >
          <div className="w-9 h-9 rounded-lg bg-[#2B7DE9] flex items-center justify-center text-white text-base font-bold shadow-md shadow-black/30">
            �?
          </div>
          <span className="text-lg font-bold text-white">职盈学海</span>
          {role === 'efficiency_user' ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-medium">效率版·个人提�?/span>
          ) : role === 'personal_user' ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium">管理版·团队管�?/span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2B7DE9]/20 text-[#2B7DE9] font-medium">Pro</span>
          )}
        </Link>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {/* Personal user: custom grouped sidebar */}
          {role === 'personal_user' || role === 'efficiency_user' ? (
            <PersonalSidebar
              pathname={pathname}
              expandedGroups={expandedGroups}
              toggleGroup={(key: string) => toggleGroup(key)}
              setSidebarOpen={setSidebarOpen}
              isPathLocked={isPathLocked}
              role={role as 'personal_user' | 'efficiency_user'}
            />
          ) : (
          /* Standard sidebar for other roles */
          <>
          {effectiveGroups.filter(isGroupVisible).map(group => {
            const visibleChildren = group.children.filter(isChildVisible);
            if (visibleChildren.length === 0) return null;

            const expanded = expandedGroups[group.key];
            const active = isGroupActive(group);
            const isHome = group.key === 'home';

            return (
              <div key={group.key} className="mb-0.5">
                {/* Group header */}
                <button
                  onClick={() => {
                    if (isHome) {
                      // 首页看板：点击分组标题直接跳转到首页
                      const firstHref = group.children[0]?.href || '/';
                      router.push(firstHref);
                      setSidebarOpen(false);
                      return;
                    }
                    toggleGroup(group.key);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-base font-semibold transition-colors duration-200
                    ${active
                      ? 'text-[#2B7DE9] border-b-2 border-sky-400/50'
                      : 'text-white/70 hover:text-[#2B7DE9] hover:bg-white/10 hover:border-b-2 hover:border-sky-400/30'
                    }
                    ${isHome ? 'cursor-pointer' : 'cursor-pointer'}
                  `}
                >
                  <span className={`shrink-0 ${active ? 'text-[#2B7DE9]' : 'text-white/50'}`}>{group.icon}</span>
                  <div className="flex-1 text-left">
                    <span>{getGroupLabel(group)}</span>
                    {getGroupSubtitle(group) && (
                      <span className="ml-1.5 text-xs text-white/40 font-normal">{getGroupSubtitle(group)}</span>
                    )}
                  </div>
                  {!isHome && (
                    expanded
                      ? <ChevronDown className="w-5 h-5 text-white/40" />
                      : <ChevronRight className="w-5 h-5 text-white/40" />
                  )}
                </button>

                {/* Children */}
                {(isHome || expanded) && (
                  <div className={`mt-0.5 space-y-0.5 ${isHome ? '' : 'ml-3 pl-3 border-l border-white/10'}`}>
                    {visibleChildren.map(child => {
                      // For newbie-training module children, match full URL with query params
                      let childActive: boolean;
                      if (child.href.startsWith('/newbie-training')) {
                        const currentFull = pathname + (searchParams.toString() ? '?' + searchParams.toString() : '');
                        if (child.href === '/newbie-training') {
                          childActive = pathname === '/newbie-training' && !searchParams.get('module');
                        } else {
                          childActive = currentFull === child.href;
                        }
                      } else {
                        childActive = pathname === child.href || pathname.startsWith(child.href + '/');
                      }
                      const isNotifications = child.feature === 'notifications';

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                            ${childActive
                              ? 'bg-white/15 text-[#2B7DE9] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-4 before:rounded-full before:bg-[#2B7DE9]'
                              : 'text-white/50 hover:bg-white/10 hover:text-[#2B7DE9]'
                            }
                          `}
                        >
                          {child.icon}
                          <span className={isPathLocked(child.href) ? 'text-white/40' : ''}>{getChildLabel(group, child)}</span>
                          {child.tag}
                          {isPathLocked(child.href) && (
                            <Lock className="w-3 h-3 text-[#2B7DE9]/50 ml-auto" />
                          )}
                          {isNotifications && unreadCount > 0 && (
                            <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                          {child.href === '/insights' && insightUnreadCount > 0 && (
                            <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold px-1 leading-none">
                              {insightUnreadCount > 99 ? '99+' : insightUnreadCount}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          </>
          )}
          {/* (now part of nav groups) */}
          {false && role === 'admin' && (
            <div className="pt-2 border-t border-white/10 mt-2">
              <Link
                href="/consultant"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors
                  ${pathname === '/consultant'
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-white/40 hover:bg-white/5 hover:text-purple-400'
                  }
                `}
              >
                <Headphones className="w-5 h-5" />
                <span>顾问后台</span>
              </Link>
            </div>
          )}
        </nav>

        {/* Bottom: User info + Sign out */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-blue-900/40">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{displayName}</div>
              <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleBadgeStyle}`}>
                {roleLabel}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full text-white/50 hover:text-red-400 hover:bg-white/5 justify-start gap-2"
          >
            <LogOut className="w-5 h-5" />
            退出登�?
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden transition-opacity duration-200" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg text-white/40 hover:bg-gray-100">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium text-gray-700">{getHeaderName()}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              role === 'admin' ? 'bg-red-100 text-red-700' :
              role === 'enterprise_admin' ? 'bg-purple-100 text-purple-700' :
              role === 'enterprise_manager' ? 'bg-sky-100 text-sky-700' :
              role === 'personal_user' ? 'bg-emerald-100 text-emerald-700' :
              'bg-gray-100 text-gray-600'
            }`}>{roleLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/notifications" className="relative p-1.5 rounded-lg text-white/40 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-sm text-white/40">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {displayName.charAt(0)}
              </div>
              <span className="max-w-[120px] truncate">{displayName}</span>
            </div>
          </div>
        </header>

        {/* Trial expired warning banner */}
        {role === 'personal_user' ? (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-[#2B7DE9]" />
              <span className="text-blue-900 font-medium">管理起步�?/span>
            </div>
            <button onClick={() => setConsultOpen(true)} className="text-sm font-medium text-blue-900 hover:underline">
              咨询开通专业版
            </button>
          </div>
        ) : profile?.trialEndAt && new Date(profile.trialEndAt) < new Date() ? (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-amber-800 font-medium">专业版试用已到期</span>
              <span className="text-amber-600">管理功能已锁定，请开通专业版继续使用</span>
            </div>
            <button onClick={() => setConsultOpen(true)} className="text-sm font-medium text-blue-900 hover:underline">
              咨询开�?
            </button>
          </div>
        ) : null}
        {profile?.trialEndAt && new Date(profile.trialEndAt) >= new Date() && trialDaysLeft !== null && trialDaysLeft <= 3 && (
            <div className="bg-sky-50 border-b border-sky-200 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-[#2B7DE9]" />
                <span className="text-blue-900 font-medium">专业版试用剩�?{trialDaysLeft} �?/span>
                <span className="text-sky-600">到期后管理功能将锁定</span>
              </div>
              <button onClick={() => setConsultOpen(true)} className="text-sm font-medium text-blue-900 hover:underline">
                咨询开�?
              </button>
            </div>
        )}
        <ConsultDialog open={consultOpen} onOpenChange={setConsultOpen} title="咨询开�? />

        {/* Page content */}
        <main className="flex-1 p-4 pt-6 lg:p-6 lg:pt-8 overflow-auto bg-gray-50">
          {children}
          {/* ICP 备案号预�?*/}
          <footer className="mt-8 pb-4 text-center text-xs text-gray-400">
            ICP备案号：待审�?
          </footer>
        </main>
      </div>

      {/* First-use onboarding tour */}
      <OnboardingTour />

      {/* Industry selection dialog for personal_user */}
      {showIndustryDialog && (
        <IndustryDialog
          onComplete={(profile) => {
            setShowIndustryDialog(false);
            const prompt = encodeURIComponent(`帮我生成${profile.industry}的第一句客服话术`);
            window.location.href = `/ai-assistant?prompt=${prompt}`;
          }}
        />
      )}

      {/* Efficiency user onboarding dialog - shown once */}
      {showEfficiencyOnboard && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-5 text-white">
              <h2 className="text-xl font-bold">欢迎来到职盈学海【效率版】！</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-green-500 text-lg mt-0.5">�?/span>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    <span className="font-semibold">已解锁：</span>AI急救站（不限次）+ 3项AI体检 + 话术练兵�?+ 产品档案 + 模板�?
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 text-lg mt-0.5">🔒</span>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    <span className="font-semibold">管理课程</span>、质检/方案体检、KPI工具等为【管理版】专�?
                  </p>
                </div>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed border-t pt-3">
                需要系统学管理、带团队？随时开通管理版�?9年费可抵扣！
              </p>
              <button
                onClick={() => {
                  localStorage.setItem('efficiency_onboarded', '1');
                  setShowEfficiencyOnboard(false);
                }}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all text-base"
              >
                知道了，开始提效！
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
