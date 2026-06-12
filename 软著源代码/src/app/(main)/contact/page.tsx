'use client';

import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, MessageSquare, Mail, Phone, CheckCircle2, Clock, Trophy, Laptop, Tv, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/* ─── 滚动淡入 Hook ─── */
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

/* ─── 淡入容器 ─── */
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── 服务流程 ─── */
const SERVICE_STEPS = [
  { step: 1, title: '咨询沟�?, desc: '了解你的团队现状和核心痛�? },
  { step: 2, title: '方案匹配', desc: '根据团队规模推荐最适合的版�? },
  { step: 3, title: '开通系�?, desc: '即开即用，无需部署' },
  { step: 4, title: '上手使用', desc: '系统引导+专属顾问，快速上�? },
];

/* ─── 3版本对比简�?─── */
const VERSION_COMPARE = [
  {
    name: '个人�?,
    target: '1人起�?,
    color: 'border-sky-400/30',
    tagColor: 'bg-sky-400/10 text-sky-300',
    btnColor: 'bg-sky-400 hover:bg-sky-500 text-blue-950',
    highlights: [
      '25课管理系统课+AI批改作业',
      '5项AI体检（话�?SOP/案例/质检/方案�?,
      'AI急救�?售后攻略',
      '我的知识库（4大分类）',
      'KPI规划�?每日一�?结业证书',
    ],
  },
  {
    name: '专业�?,
    target: '5人团�?,
    color: 'border-sky-400/30',
    tagColor: 'bg-sky-400/10 text-sky-300',
    btnColor: 'bg-sky-400 hover:bg-sky-500 text-blue-950',
    recommended: true,
    highlights: [
      '个人版全部功�?,
      '新人9模块自助培训',
      '售后攻略+知识库（�?大分类）',
      '质检反馈闭环+KPI管理',
      '成本预警+行业规则推�?,
      '5人团队·单班组管理',
    ],
  },
  {
    name: '旗舰�?,
    target: '15人团�?,
    color: 'border-purple-400/30',
    tagColor: 'bg-purple-400/10 text-purple-300',
    btnColor: 'bg-purple-500 hover:bg-purple-600 text-white',
    highlights: [
      '专业版全部功�?,
      'CDA深度数据分析报告',
      '多班组跨组管�?多店核算',
      '财务看板+驾驶�?ROI账本',
      '异常检测与趋势预警',
      '15人团队管�?专属顾问',
    ],
  },
];

export default function ContactPage() {
  const { profile } = useAuth();
  const displayName = profile?.displayName || '用户';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">

        {/* 返回 */}
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>

        {/* ══�?�?屏：标题 + 核心价�?══�?*/}
        <div className="text-center mb-12">
          <Reveal>
            <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-400/10 rounded-2xl mb-4 border border-sky-400/20">
              <MessageSquare className="h-7 w-7 text-sky-400" />
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">高效省心，系统帮你管</h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-sky-300 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
              不需要自己摸索管理方法，不需要手动培训每个新人，<br />
              系统内置12年卫浴经验，AI帮你查漏补缺�?br />
              主管省心，团队高�?
            </p>
            <p className="text-white/30 text-sm mt-2">{displayName}，职盈学海让客服管理变简�?/p>
          </Reveal>
        </div>

        {/* 数据指标 */}
        <Reveal delay={150} className="mb-8">
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '75%', label: '售后成本降幅' },
              { value: '60%', label: '同类投诉下降' },
              { value: '200+', label: '行业验证案例' },
            ].map((item) => (
              <div key={item.label} className="bg-[#0F2B46]/80 rounded-xl p-5 text-center shadow-md">
                <p className="text-4xl md:text-5xl font-black text-sky-400">{item.value}</p>
                <p className="text-white/50 text-xs mt-2">{item.label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ══�?�?屏：服务流程 ══�?*/}
        <Reveal className="mb-10">
          <h2 className="text-xl font-bold text-white text-center mb-6">4步开通，即开即用</h2>
          <div className="grid grid-cols-4 gap-3">
            {SERVICE_STEPS.map((s, i) => (
              <div key={s.step} className="bg-[#0F2B46]/80 rounded-xl p-4 text-center relative">
                <div className="w-8 h-8 rounded-full bg-sky-400/20 flex items-center justify-center mx-auto mb-2">
                  <span className="text-sky-400 font-bold text-sm">{s.step}</span>
                </div>
                <p className="text-white font-semibold text-sm">{s.title}</p>
                <p className="text-white/40 text-xs mt-1 leading-relaxed">{s.desc}</p>
                {i < 3 && (
                  <ChevronRight className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400/40 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </Reveal>

        {/* ══�?�?屏：3版本对比简�?══�?*/}
        <Reveal className="mb-10">
          <h2 className="text-xl font-bold text-white text-center mb-5">选择适合你的版本</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {VERSION_COMPARE.map((v) => (
              <div key={v.name} className={`bg-[#0F2B46] rounded-xl shadow-md border ${v.color} p-5 flex flex-col relative`}>
                {v.recommended && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-sky-400 text-blue-950 text-xs font-bold rounded-full">
                    推荐
                  </div>
                )}
                <div className="mb-3">
                  <span className={`inline-block px-2.5 py-0.5 ${v.tagColor} text-xs font-medium rounded-full`}>{v.name}</span>
                  <p className="text-white/40 text-xs mt-1.5">{v.target}</p>
                </div>
                <ul className="space-y-2 flex-1">
                  {v.highlights.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-sky-400 mt-0.5 shrink-0" />
                      <span className="text-white/80 text-xs">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/membership" className={`mt-4 block text-center px-4 py-2 ${v.btnColor} text-sm font-semibold rounded-lg transition-colors`}>
                  查看详情
                </Link>
              </div>
            ))}
          </div>
          <p className="text-white/30 text-xs text-center mt-4 leading-relaxed">
            所有版本均配备：AI工作助手+学习中心+数据导入导出 · 2年付�?.8�?
          </p>
        </Reveal>

        {/* ══�?�?屏：12年经验背�?══�?*/}
        <Reveal delay={100} className="mb-10">
          <div className="bg-[#0F2B46]/80 rounded-xl p-6 text-center shadow-md">
            <p className="text-2xl font-bold text-white leading-relaxed">
              12年实战，�?�?独立搭建体系
            </p>
            <div className="mt-3 space-y-1">
              <p className="text-sky-400 text-base leading-relaxed">
                把一线实战SOP、售后纠纷处理、客服质检、话术体系全部沉淀进系�?
              </p>
              <p className="text-sky-400 text-base leading-relaxed">
                专为卫浴电商门店、品牌方、零售店铺量身打�?
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={100} className="mb-12">
          <h2 className="text-xl font-bold text-white text-center mb-6">成长轨迹</h2>
          <div className="bg-[#0F2B46]/80 rounded-xl p-6 shadow-md">
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-sky-400/30" />
              {[
                { year: '2012', text: '基层起步，一线客�? },
                { year: '2021-2024', text: '独立从零到一搭建业务整体框架体系，覆盖财务、售后、KPI考核核心模块，打通全业务链路，实现管理体系标准化闭环落地' },
                { year: '2025', text: '空降接手业务，首季度落地精细化管控，售后支出成本降幅�?5%，高效完成降本控损经营目�? },
                { year: '2026', text: '职盈学海系统上线，全流程自研自建，AI体检�?售后攻略+知识�?质检闭环' },
              ].map((node, i) => (
                <div key={node.year} className="relative mb-4 last:mb-0">
                  <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 ${i === 3 ? 'bg-sky-400 border-sky-400' : 'bg-[#0F2B46] border-sky-400/40'}`} />
                  <p className="text-sky-400 font-bold text-sm">{node.year}</p>
                  <p className="text-white/60 text-sm">{node.text}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* 证书徽章 */}
        <Reveal delay={200} className="mb-12">
          <p className="text-center text-white/90 font-semibold text-base mb-6">全流程自研自建，不靠外包不依赖团�?/p>
          <div className="grid grid-cols-3 gap-8">
            {[
              { icon: Trophy, name: 'AI高级应用�?, desc: '智能应用领域专业认证' },
              { icon: Laptop, name: 'AI编程�?, desc: 'AI开发与工程化能力认�? },
              { icon: Tv, name: '全媒体运营师', desc: '全渠道内容运营专业资�? },
            ].map((cert) => (
              <div key={cert.name} className="bg-[#1a3a5c]/80 rounded-xl p-8 text-center shadow-md border border-sky-500/30">
                <cert.icon className="h-10 w-10 text-sky-400 mx-auto mb-4" />
                <p className="text-xl font-bold text-white mb-1">{cert.name}</p>
                <p className="text-white/40 text-xs">{cert.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ══�?�?屏：联系方式 ══�?*/}
        <Reveal delay={100} className="mb-6">
          <div className="bg-[#0F2B46]/80 rounded-xl shadow-md p-8 text-center">
            <div className="inline-block p-3 bg-white rounded-xl mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/contact/wechat-qr.png"
                alt="企业微信二维�?
                className="w-44 h-44 object-contain rounded-lg"
              />
            </div>
            <p className="text-white font-semibold text-lg mb-1">扫码添加企业微信</p>
            <p className="text-sky-400 text-sm">专属顾问1�?解答</p>
          </div>
        </Reveal>

        <Reveal delay={150} className="mb-8">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0F2B46] rounded-xl shadow-md p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-400/10 rounded-lg flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5 text-sky-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white/40 text-xs">企业微信</p>
                <p className="text-white/90 text-sm font-medium">扫码添加</p>
              </div>
            </div>
            <div className="bg-[#0F2B46] rounded-xl shadow-md p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-400/10 rounded-lg flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-sky-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white/40 text-xs">邮箱</p>
                <p className="text-white/90 text-sm font-medium truncate">1051202571@qq.com</p>
              </div>
            </div>
            <div className="bg-[#0F2B46] rounded-xl shadow-md p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-400/10 rounded-lg flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5 text-sky-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white/40 text-xs">服务热线</p>
                <p className="text-white/90 text-sm font-medium">158-7682-0777</p>
              </div>
            </div>
            <div className="bg-[#0F2B46] rounded-xl shadow-md p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-400/10 rounded-lg flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-sky-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white/40 text-xs">服务时间</p>
                <p className="text-white/90 text-sm font-medium">工作�?-18 / 周六10-16</p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={200} className="text-center pb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3 bg-sky-400 hover:bg-sky-500 text-blue-950 font-semibold rounded-xl transition-all active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
        </Reveal>
      </div>
    </div>
  );
}
