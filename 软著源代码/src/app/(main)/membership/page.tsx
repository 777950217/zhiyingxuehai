'use client';

import { useAuth } from '@/lib/auth-context';
import {
  ArrowLeft, ArrowRight, CheckCircle2, XCircle, Zap,
  Bot, ShieldCheck, BookMarked, Wrench, Target,
  MessageSquare, GraduationCap, BarChart3, Brain,
  BookOpen, Star, TrendingUp, Users, Crown, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/* ─── 滚动淡入 ─── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ─── 3版本定价 ─── */
const PLANS = [
  {
    key: 'personal',
    name: '个人�?,
    desc: '1人起步·自我提�?,
    price: '¥980',
    period: '/�?,
    priceNote: '',
    color: 'from-sky-400/10 to-blue-400/5',
    border: 'border-sky-400/20',
    btnBg: 'bg-sky-400 hover:bg-sky-500 text-blue-950',
    tagColor: 'bg-sky-400/10 text-sky-300',
    icon: Zap,
    features: [
      { section: '学习中心', items: [
        { text: '25课客服管理系统课', on: true },
        { text: 'AI批改作业+结业证书', on: true },
        { text: '每日一�?学习档案', on: true },
      ]},
      { section: 'AI工作助手', items: [
        { text: 'AI急救站（对话记录保存�?, on: true },
        { text: '5项AI体检（话�?SOP/案例/质检/方案�?, on: true },
        { text: '售后攻略', on: true },
        { text: 'AI对话次数：基础5�?, on: true },
      ]},
      { section: '知识管理', items: [
        { text: '我的知识库（4大分类）', on: true },
        { text: '知识库全7大分�?, on: false },
      ]},
      { section: '管理工具', items: [
        { text: 'KPI规划�?, on: true },
        { text: '团队管理', on: false },
        { text: '质检反馈闭环', on: false },
        { text: '行业规则推�?, on: false },
      ]},
    ],
  },
  {
    key: 'professional',
    name: '专业�?,
    desc: '5人团队·高效管�?,
    price: '¥6,800',
    period: '/�?,
    priceNote: '2年付8.8�?¥11,936/2�?,
    color: 'from-sky-400/15 to-blue-400/8',
    border: 'border-sky-400/30',
    btnBg: 'bg-sky-400 hover:bg-sky-500 text-blue-950',
    tagColor: 'bg-sky-400/10 text-sky-300',
    recommended: true,
    icon: Star,
    features: [
      { section: '学习中心', items: [
        { text: '个人版全部课�?AI批改', on: true },
        { text: '新人9模块自助培训', on: true },
        { text: '培训阶段追踪+实操考核', on: true },
      ]},
      { section: 'AI工作助手', items: [
        { text: 'AI急救站（对话记录保存�?, on: true },
        { text: '5项AI体检全功�?, on: true },
        { text: '售后攻略+知识库全7大分�?, on: true },
        { text: 'AI对话次数�?0�?�?, on: true },
      ]},
      { section: '团队管理', items: [
        { text: '5人团队·单班组管理', on: true },
        { text: '质检反馈闭环', on: true },
        { text: 'KPI管理+方案设计�?, on: true },
        { text: '行业规则实时推�?, on: true },
        { text: '成本预警+工单管理', on: true },
      ]},
      { section: '专属服务', items: [
        { text: '标准服务响应', on: true },
        { text: '专属顾问陪跑', on: false },
      ]},
    ],
  },
  {
    key: 'enterprise',
    name: '旗舰�?,
    desc: '15人团队·全量管�?,
    price: '¥9,800',
    period: '/�?,
    priceNote: '2年付8.8�?¥17,248/2�?,
    color: 'from-purple-400/15 to-purple-400/5',
    border: 'border-purple-400/30',
    btnBg: 'bg-purple-500 hover:bg-purple-600 text-white',
    tagColor: 'bg-purple-400/10 text-purple-300',
    icon: Crown,
    features: [
      { section: '学习中心', items: [
        { text: '专业版全部课�?培训', on: true },
        { text: 'CDA深度数据分析报告', on: true },
      ]},
      { section: 'AI工作助手', items: [
        { text: '专业版全部AI功能', on: true },
        { text: 'AI对话次数：不�?, on: true },
      ]},
      { section: '团队管理', items: [
        { text: '15人团队·多班组跨组管控', on: true },
        { text: '多店独立核算', on: true },
        { text: '质检闭环+KPI+成本+工单', on: true },
      ]},
      { section: '决策工具', items: [
        { text: '财务看板+驾驶�?, on: true },
        { text: 'ROI账本+异常检�?, on: true },
        { text: '趋势预警+经营日报', on: true },
      ]},
      { section: '专属服务', items: [
        { text: '专属顾问陪跑', on: true },
        { text: '优先响应+定制化支�?, on: true },
      ]},
    ],
  },
];

/* ─── 功能横比�?─── */
const COMPARE_ROWS = [
  { feature: '管理系统�?, personal: '25�?, pro: '全量+培训', flagship: '全量+CDA' },
  { feature: 'AI体检�?, personal: '5项基础', pro: '5项全功能', flagship: '5项全功能' },
  { feature: '售后攻略', personal: '�?, pro: '�?, flagship: '�? },
  { feature: '我的知识�?, personal: '4大分�?, pro: '�?大分�?, flagship: '�?大分�? },
  { feature: 'AI急救�?, personal: '基础5�?, pro: '50�?�?, flagship: '不限' },
  { feature: '质检反馈闭环', personal: '�?, pro: '�?, flagship: '�? },
  { feature: '团队管理', personal: '�?, pro: '5人单�?, flagship: '15人多�? },
  { feature: 'KPI管理', personal: '规划�?, pro: '方案设计�?, flagship: '方案设计�? },
  { feature: '成本预警', personal: '�?, pro: '�?, flagship: '�? },
  { feature: '财务看板', personal: '�?, pro: '�?, flagship: '�? },
  { feature: '驾驶�?ROI', personal: '�?, pro: '�?, flagship: '�? },
  { feature: '专属顾问', personal: '�?, pro: '�?, flagship: '�? },
];

export default function MembershipPage() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">

        {/* 返回 */}
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>

        {/* ══�?标题 ══�?*/}
        <div className="text-center mb-10">
          <Reveal>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-400/10 border border-sky-400/20 text-sky-300 text-sm font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              12年实战经验沉淀
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">系统就是产品，不是赠�?/h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-sky-300/80 text-base max-w-xl mx-auto leading-relaxed">
              不是买课送工具，而是一套完整的客服管理系统�?br />
              AI帮你查漏补缺，售后攻略让客户自助解决，知识库统一管理不流失�?
            </p>
          </Reveal>
        </div>

        {/* ══�?3版本卡片 ══�?*/}
        <div className="space-y-4 mb-12">
          {PLANS.map((plan) => (
            <Reveal key={plan.key} className="relative">
              <div className={`bg-gradient-to-br ${plan.color} rounded-xl border ${plan.border} p-6 shadow-lg`}>
                {plan.recommended && (
                  <div className="absolute -top-2.5 right-6 px-3 py-0.5 bg-sky-400 text-blue-950 text-xs font-bold rounded-full">
                    最受欢�?
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <plan.icon className="w-5 h-5 text-sky-400" />
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    </div>
                    <p className="text-white/50 text-sm mt-0.5">{plan.desc}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-3xl font-black text-white">{plan.price}</span>
                      <span className="text-white/50 text-sm">{plan.period}</span>
                    </div>
                    {plan.priceNote && (
                      <p className="text-sky-400/80 text-xs mt-0.5">{plan.priceNote}</p>
                    )}
                  </div>
                </div>

                {/* 功能列表 */}
                <div className="space-y-3">
                  {plan.features.map((section) => (
                    <div key={section.section}>
                      <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1.5">{section.section}</p>
                      <div className="space-y-1">
                        {section.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            {item.on ? (
                              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-white/20 shrink-0" />
                            )}
                            <span className={`text-sm ${item.on ? 'text-white/80' : 'text-white/30'}`}>{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <Link href="/contact" className={`mt-5 block text-center px-6 py-3 ${plan.btnBg} font-semibold rounded-xl transition-all active:scale-95`}>
                  联系开�?
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ══�?功能横比�?══�?*/}
        <Reveal className="mb-12">
          <h2 className="text-xl font-bold text-white text-center mb-5">功能对比一�?/h2>
          <div className="bg-[#0F2B46]/80 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/50 font-medium py-3 px-4 w-1/4">功能</th>
                  <th className="text-center text-sky-400 font-semibold py-3 px-2">个人�?/th>
                  <th className="text-center text-sky-400 font-semibold py-3 px-2">专业�?/th>
                  <th className="text-center text-purple-400 font-semibold py-3 px-2">旗舰�?/th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                    <td className="text-white/70 py-2.5 px-4">{row.feature}</td>
                    <td className="text-center py-2.5 px-2">
                      <span className={row.personal === '�? ? 'text-white/20' : row.personal === '�? ? 'text-sky-400 font-medium' : 'text-white/60'}>
                        {row.personal}
                      </span>
                    </td>
                    <td className="text-center py-2.5 px-2">
                      <span className={row.pro === '�? ? 'text-white/20' : row.pro === '�? ? 'text-sky-400 font-medium' : 'text-white/60'}>
                        {row.pro}
                      </span>
                    </td>
                    <td className="text-center py-2.5 px-2">
                      <span className={row.flagship === '�? ? 'text-white/20' : row.flagship === '�? ? 'text-purple-400 font-medium' : 'text-white/60'}>
                        {row.flagship}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        {/* ══�?6大核心能�?══�?*/}
        <Reveal className="mb-12">
          <h2 className="text-xl font-bold text-white text-center mb-5">核心能力一�?/h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: Bot, title: 'AI体检站�?项全检', desc: '话术/SOP/案例/质检/方案3秒定位薄弱环�? },
              { icon: Wrench, title: '售后攻略', desc: 'AI拆解→引导问答→IF-THEN方案→一键复�? },
              { icon: BookMarked, title: '我的知识�?, desc: '7大分类一站管理，知识资产不流�? },
              { icon: ShieldCheck, title: '质检反馈闭环', desc: '发现→推送→改善→复查，全程闭环' },
              { icon: Target, title: 'KPI管理+行业规则', desc: '8步方案设计器+平台规则实时推�? },
              { icon: MessageSquare, title: 'AI急救�?, desc: '随时问AI，对话自动保存，下次不慌' },
            ].map((item) => (
              <div key={item.title} className="bg-[#0F2B46]/80 rounded-xl p-4 border border-white/5">
                <item.icon className="w-5 h-5 text-sky-400 mb-2" />
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-white/40 text-xs mt-1 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ══�?数据来源 ══�?*/}
        <Reveal className="mb-10">
          <div className="bg-[#0F2B46]/80 rounded-xl p-6 text-center">
            <p className="text-white text-lg font-bold mb-2">不是凭空造出来的系统</p>
            <p className="text-sky-400/80 text-sm leading-relaxed max-w-md mx-auto">
              12年卫浴客服实战经�?· 200+行业验证案例<br />
              覆盖智能马桶/花洒/淋浴�?浴室柜全品类<br />
              2025年落地精细化管控，售后成本降�?5%
            </p>
          </div>
        </Reveal>

        {/* ══�?底部CTA ══�?*/}
        <Reveal className="pb-8 text-center space-y-4">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-sky-400 to-cyan-400 text-blue-950 text-lg font-semibold rounded-xl shadow-lg shadow-sky-400/20 hover:shadow-xl transition-all active:scale-95"
          >
            联系开�?<ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-white/30 text-xs">所有版本均包含AI工作助手+学习中心 · 2年付�?.8�?/p>
        </Reveal>

      </div>
    </div>
  );
}
