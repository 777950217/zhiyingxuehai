'use client';

import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, BookOpen, Notebook, ClipboardCheck, Award,
  ShieldAlert, CheckSquare, Clock, Users, Calendar, BarChart3,
  FileText, AlertTriangle, Wrench, Package, Headphones, Video,
  Database, TrendingDown, TrendingUp, ChartColumn, Siren, Filter,
  FileChartColumn, CalendarDays, ScrollText, Lightbulb, Calculator,
  Stamp, Map, Droplets, Scale, Monitor, BookMarked, MessageSquare,
  FileCheck, Puzzle, UsersRound, Swords, Zap, Stethoscope,
  ClipboardList, BookOpenCheck, LayoutTemplate, User, UserPlus,
} from 'lucide-react';

// ========== 全部40项权限定义 ==========
export const ALL_MODULES = [
  // ── 核心 ──
  { id: 'dashboard', label: '工作台', icon: LayoutDashboard, group: 'core' },
  // ── 主管学堂 ──
  { id: 'learning-path', label: '学习与实操', icon: BookOpen, group: 'learning' },
  { id: 'knowledge-notes', label: '课程笔记', icon: Notebook, group: 'learning' },
  // ── 管控看板 ──
  { id: 'quality-feedback', label: '质检反馈', icon: ClipboardCheck, group: 'control' },
  { id: 'incentive', label: '激励积分', icon: Award, group: 'control' },
  { id: 'keyword-monitor', label: '行为监控', icon: ShieldAlert, group: 'control' },
  { id: 'self-check', label: '自检清单', icon: CheckSquare, group: 'control' },
  { id: 'scheduling', label: '人员排班', icon: Clock, group: 'control' },
  { id: 'agents', label: '客服管理', icon: Users, group: 'control' },
  { id: 'leave-request', label: '请假审批', icon: Calendar, group: 'control' },
  // ── 经营工具 ──
  { id: 'kpi-assessment', label: 'KPI考核管理', icon: BarChart3, group: 'biz-tools' },
  { id: 'work-orders', label: '工单台账', icon: FileText, group: 'biz-tools' },
  { id: 'cost-alert', label: '成本预警', icon: AlertTriangle, group: 'biz-tools' },
  { id: 'business-tools', label: '经营工具箱', icon: Wrench, group: 'biz-tools' },
  { id: 'product-profile', label: '产品档案', icon: Package, group: 'biz-tools' },
  { id: 'after-sales-guide', label: '售后攻略', icon: Headphones, group: 'biz-tools' },
  { id: 'product-videos', label: '产品使用视频', icon: Video, group: 'biz-tools' },
  { id: 'my-knowledge', label: '我的知识库', icon: Database, group: 'biz-tools' },
  // ── 驾驶舱（旗舰版专属） ──
  { id: 'cockpit', label: '亏损透视', icon: TrendingDown, group: 'cockpit' },
  { id: 'cost-baseline', label: '降本对比', icon: ChartColumn, group: 'cockpit' },
  { id: 'cockpit-anomaly', label: '异常红警', icon: Siren, group: 'cockpit' },
  { id: 'profit-funnel', label: '单品盈利漏斗', icon: Filter, group: 'cockpit' },
  { id: 'weekly-report', label: '资金周报', icon: FileChartColumn, group: 'cockpit' },
  { id: 'monthly-report', label: '月度简报', icon: CalendarDays, group: 'cockpit' },
  { id: 'rules-and-trends', label: '规则解读', icon: ScrollText, group: 'cockpit' },
  { id: 'insights', label: '经营洞察', icon: Lightbulb, group: 'cockpit' },
  { id: 'roi-ledger', label: 'ROI账本', icon: Calculator, group: 'cockpit' },
  // ── 审批管理（旗舰版专属） ──
  { id: 'approval', label: '赔付审批流', icon: Stamp, group: 'approval' },
  // ── 新人培训 ──
  { id: 'newbie-training', label: '学习地图', icon: Map, group: 'training' },
  { id: 'training-basics', label: '卫浴基础知识', icon: Droplets, group: 'training' },
  { id: 'training-rules', label: '全平台规则速查', icon: Scale, group: 'training' },
  { id: 'training-guide', label: '系统实操指南', icon: Monitor, group: 'training' },
  { id: 'training-sop', label: '客服流程手册', icon: BookMarked, group: 'training' },
  { id: 'training-scripts', label: '高频快捷话术', icon: MessageSquare, group: 'training' },
  { id: 'training-exam', label: '阶段考核标准', icon: FileCheck, group: 'training' },
  { id: 'training-parts', label: '配件图鉴', icon: Puzzle, group: 'training' },
  { id: 'training-team', label: '团队进度', icon: UsersRound, group: 'training' },
  // ── AI练兵场 ──
  { id: 'practice', label: '话术练兵场', icon: Swords, group: 'ai-practice' },
  { id: 'ai-assistant', label: 'AI急救站', icon: Zap, group: 'ai-practice' },
  // ── AI体检站 ──
  { id: 'ai-checkup-quality', label: '质检体检', icon: Stethoscope, group: 'ai-checkup' },
  { id: 'ai-checkup-plan', label: '方案体检', icon: ClipboardList, group: 'ai-checkup' },
  // ── AI质检 ──
  { id: 'team-qc', label: 'AI质检', icon: FileCheck, group: 'ai-qc' },
  // ── 团队知识库 ──
  { id: 'team-knowledge', label: '团队知识库', icon: BookOpen, group: 'team-knowledge' },
  // ── 团队绩效 ──
  { id: 'team-performance', label: '团队绩效', icon: TrendingUp, group: 'team-performance' },
  // ── 任务分发 ──
  { id: 'task-dispatch', label: '任务分发', icon: ClipboardList, group: 'task-dispatch' },
  // ── 合规管控 ──
  { id: 'compliance-dashboard', label: '合规管控', icon: ShieldAlert, group: 'compliance' },
  // ── AI智能排班 ──
  { id: 'ai-scheduling', label: '智能排班', icon: CalendarDays, group: 'ai-scheduling' },
  // ── 行业规则 ──
  { id: 'rules', label: '规则库', icon: BookOpenCheck, group: 'industry' },
  { id: 'templates', label: '模板库', icon: LayoutTemplate, group: 'industry' },
  // ── 设置 ──
  { id: 'settings', label: '个人中心', icon: User, group: 'settings' },
  { id: 'team-seats', label: '添加坐席', icon: UserPlus, group: 'settings' },
];

// ========== 预设模板 ==========
export const PERMISSION_TEMPLATES: Record<string, {
  name: string;
  description: string;
  permissions: string[];
}> = {
  '客服角色': {
    name: '客服角色',
    description: '只能学习+练兵+基础工具',
    permissions: [
      'dashboard', 'learning-path', 'knowledge-notes',
      'newbie-training', 'training-basics', 'training-rules', 'training-guide',
      'training-sop', 'training-scripts', 'training-exam', 'training-parts', 'training-team',
      'practice', 'ai-assistant',
      'after-sales-guide', 'my-knowledge', 'product-videos',
      'settings',
    ],
  },
  '主管助理': {
    name: '主管助理',
    description: '客服全部+管控+部分经营工具',
    permissions: [
      // 客服角色全部
      'dashboard', 'learning-path', 'knowledge-notes',
      'newbie-training', 'training-basics', 'training-rules', 'training-guide',
      'training-sop', 'training-scripts', 'training-exam', 'training-parts', 'training-team',
      'practice', 'ai-assistant',
      'after-sales-guide', 'my-knowledge', 'product-videos',
      'settings',
      // 管控
      'quality-feedback', 'incentive', 'self-check',
      'scheduling', 'agents', 'leave-request',
      // 经营工具
      'kpi-assessment', 'work-orders', 'business-tools', 'product-profile',
      'cost-alert',
      // 行业规则
      'rules', 'templates',
    ],
  },
  '全权限': {
    name: '全权限',
    description: '除老板专属外全部（不含异常红警/经营洞察/赔付审批流）',
    permissions: ALL_MODULES
      .filter(m => !['cockpit-anomaly', 'insights', 'approval'].includes(m.id))
      .map(m => m.id),
  },
  '全选': {
    name: '全选',
    description: '所有40项',
    permissions: ['ALL'],
  },
};

// ========== 分组名称 ==========
const GROUP_NAMES: Record<string, string> = {
  'core': '核心',
  'learning': '主管学堂',
  'control': '管控看板',
  'biz-tools': '经营工具',
  'cockpit': '驾驶舱',
  'approval': '审批管理',
  'training': '新人培训',
  'ai-practice': 'AI练兵场',
  'ai-checkup': 'AI体检站',
  'ai-qc': 'AI质检',
  'team-knowledge': '团队知识库',
  'team-performance': '团队绩效',
  'task-dispatch': '任务分发',
  'compliance': '合规管控',
  'ai-scheduling': 'AI智能排班',
  'industry': '行业规则',
  'settings': '设置',
};

// ========== 旗舰版专属分组（专业版过滤掉） ==========
const FLAGSHIP_ONLY_GROUPS = ['cockpit', 'approval'];

// ========== 老板专属权限（旗舰版内也不可分配） ==========
const BOSS_ONLY = ['cockpit-anomaly', 'insights', 'approval'];

// ========== 老板专属分组（非老板直接隐藏整个分组） ==========
const BOSS_ONLY_GROUPS = ['cockpit'];

interface PermissionSelectorProps {
  selectedPermissions: string[];
  onPermissionsChange: (permissions: string[]) => void;
  selectedTemplate?: string;
  onTemplateChange?: (template: string) => void;
  isEnterprise?: boolean;
  isBoss?: boolean;
}

const GROUP_ORDER = [
  'core', 'learning', 'control', 'biz-tools',
  'cockpit', 'approval', 'training', 'ai-practice',
  'ai-checkup', 'ai-qc', 'team-knowledge', 'team-performance',
  'task-dispatch', 'compliance', 'ai-scheduling', 'industry', 'settings',
];

export function PermissionSelector({
  selectedPermissions,
  onPermissionsChange,
  selectedTemplate,
  onTemplateChange,
  isEnterprise = false,
  isBoss = false,
}: PermissionSelectorProps) {
  const [localPermissions, setLocalPermissions] = useState<string[]>(selectedPermissions);

  useEffect(() => {
    setLocalPermissions(selectedPermissions);
  }, [selectedPermissions]);

  // 过滤模块：旗舰版显示全部，专业版过滤驾驶舱+审批管理；非老板隐藏老板专属分组+权限
  const filteredModules = ALL_MODULES.filter(m => {
    if (!isEnterprise && FLAGSHIP_ONLY_GROUPS.includes(m.group)) return false;
    if (!isBoss && BOSS_ONLY_GROUPS.includes(m.group)) return false;
    if (!isBoss && BOSS_ONLY.includes(m.id)) return false;
    return true;
  });

  // 按分组归类，保持GROUP_ORDER顺序
  const modulesByGroup: [string, typeof ALL_MODULES][] = [];
  const seen = new Set<string>();
  for (const group of GROUP_ORDER) {
    const items = filteredModules.filter(m => m.group === group && !seen.has(m.id));
    if (items.length > 0) {
      modulesByGroup.push([group, items]);
      items.forEach(m => seen.add(m.id));
    }
  }

  // 应用模板
  const applyTemplate = (templateKey: string) => {
    const template = PERMISSION_TEMPLATES[templateKey];
    if (!template) return;

    let perms: string[];
    if (templateKey === '全选') {
      perms = filteredModules.map(m => m.id);
    } else {
      // 过滤掉：专业版不显示的分组 + 老板专属分组/权限
      perms = template.permissions.filter(p => {
        const mod = ALL_MODULES.find(m => m.id === p);
        if (!mod) return false;
        if (!isEnterprise && FLAGSHIP_ONLY_GROUPS.includes(mod.group)) return false;
        if (!isBoss && BOSS_ONLY_GROUPS.includes(mod.group)) return false;
        if (!isBoss && BOSS_ONLY.includes(mod.id)) return false;
        return true;
      });
    }
    setLocalPermissions(perms);
    onPermissionsChange(perms);
    onTemplateChange?.(templateKey);
  };

  // 切换单个权限
  const togglePermission = (permissionId: string) => {
    const newPermissions = localPermissions.includes(permissionId)
      ? localPermissions.filter(p => p !== permissionId)
      : [...localPermissions, permissionId];
    setLocalPermissions(newPermissions);
    onPermissionsChange(newPermissions);
    onTemplateChange?.('');
  };

  // 全选/取消全选
  const toggleAll = () => {
    const allIds = filteredModules.map(m => m.id);
    if (localPermissions.length === allIds.length) {
      setLocalPermissions([]);
      onPermissionsChange([]);
    } else {
      setLocalPermissions(allIds);
      onPermissionsChange(allIds);
    }
    onTemplateChange?.('');
  };

  return (
    <div className="space-y-4">
      {/* 预设模板 */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">预设模板</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PERMISSION_TEMPLATES).map(([key, template]) => (
            <Button
              key={key}
              variant={selectedTemplate === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyTemplate(key)}
              className={selectedTemplate === key
                ? 'bg-sky-500 hover:bg-sky-600 text-white'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'}
            >
              {key}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAll}
            className="border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            {localPermissions.length === filteredModules.length ? '取消全选' : '全选'}
          </Button>
        </div>
      </div>

      {/* 权限勾选列表 */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">
          功能模块 <span className="text-slate-400 font-normal">(已选 {localPermissions.length}/{filteredModules.length} 项)</span>
        </label>
        <div className="border rounded-lg divide-y bg-white">
          {modulesByGroup.map(([group, modules]) => {
            const isBossGroup = !isEnterprise ? false : BOSS_ONLY.some(b => modules.some(m => m.id === b));
            return (
              <div key={group} className="p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
                  <span>{GROUP_NAMES[group] || group}</span>
                  {FLAGSHIP_ONLY_GROUPS.includes(group) && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600">
                      旗舰版
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                  {modules.map((module) => {
                    const Icon = module.icon;
                    const isChecked = localPermissions.includes(module.id);
                    const isBoss = BOSS_ONLY.includes(module.id);
                    return (
                      <label
                        key={module.id}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors text-xs ${
                          isChecked
                            ? 'bg-sky-50 border border-sky-200'
                            : 'bg-slate-50 border border-transparent hover:bg-slate-100'
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => togglePermission(module.id)}
                          className="scale-75 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                        />
                        <Icon className={`w-3.5 h-3.5 ${isChecked ? 'text-sky-600' : 'text-slate-400'}`} />
                        <span className={`${isChecked ? 'text-sky-700 font-medium' : 'text-slate-600'}`}>
                          {module.label}
                        </span>
                        {isBoss && (
                          <span className="text-[10px] text-rose-400 ml-auto">总监</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 简化版：只显示当前用户的权限标签
export function PermissionBadges({ permissions }: { permissions: string[] }) {
  const modules = ALL_MODULES.filter(m => permissions.includes(m.id));

  if (modules.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {modules.slice(0, 5).map((module) => {
        const Icon = module.icon;
        return (
          <Badge key={module.id} variant="secondary" className="text-xs flex items-center gap-1">
            <Icon className="w-3 h-3" />
            {module.label}
          </Badge>
        );
      })}
      {modules.length > 5 && (
        <Badge variant="outline" className="text-xs">
          +{modules.length - 5}
        </Badge>
      )}
    </div>
  );
}
