import Link from 'next/link';
import {
  Target, BookOpen, Bot, FileText, BarChart3,
  Sparkles, MessageSquare, GraduationCap, PenLine,
  ArrowRight, Brain, Rocket, ShieldCheck,
  Zap, ClipboardList, MessageCircle, Archive,
  Shield, Wrench, BookMarked, CheckCircle2,
} from 'lucide-react';

/* ─── 痛点数据 ─── */
const PAIN_POINTS = [
  { icon: MessageCircle, title: '话术不统一', desc: '同一问题10个客�?0种回答，客户体验参差不齐，差评投诉不�? },
  { icon: Shield, title: '质检没标�?, desc: '靠主观判断抽检，漏检率高，问题反复出现，员工不服�? },
  { icon: Zap, title: '售后成本�?, desc: '小问题拖成大纠纷，退款赔偿居高不下，利润被售后吞�? },
  { icon: BarChart3, title: '团队难管', desc: '新人上手慢、老人不服从、排班混乱、KPI形同虚设' },
];

/* ─── 6大核心能�?─── */
const CORE_CAPABILITIES = [
  {
    icon: Bot,
    title: 'AI体检站�?项全检',
    desc: '话术/SOP/案例/质检/方案5维度AI扫描�?秒定位薄弱环节，一键生成改善方�?,
    tag: 'AI驱动',
  },
  {
    icon: Wrench,
    title: '售后攻略',
    desc: '遇到售后问题不知道怎么回？AI拆解问题→匹配种子库→引导问答→生成IF-THEN专业方案，下次同类问题一键复�?,
    tag: '新增',
  },
  {
    icon: BookMarked,
    title: '我的知识�?,
    desc: '7大场景分类，话术/SOP/攻略/质检/方案/产品/学习一站管理，所有知识资产不流失',
    tag: '新增',
  },
  {
    icon: ShieldCheck,
    title: '质检反馈闭环',
    desc: 'AI质检发现问题→主管推送→员工确认改善→复查验证，从发现问题到解决问题全程闭环',
    tag: '新增',
  },
  {
    icon: Target,
    title: 'KPI管理+行业规则',
    desc: '8步方案设计器生成KPI方案�?2年卫浴行业判断规则内置，平台规则实时推�?,
    tag: '专业工具',
  },
  {
    icon: MessageSquare,
    title: 'AI急救�?,
    desc: '遇到问题随时问，AI秒出专业方案，对话记录自动保存，下次同类问题不再�?,
    tag: 'AI驱动',
  },
];

/* ─── 数据来源 ─── */
const DATA_SOURCES = [
  { value: '12�?, label: '卫浴客服实战经验' },
  { value: '200+', label: '行业验证案例' },
  { value: '75%', label: '售后成本降幅' },
];

/* ─── 客户证言预留 ─── */
const TESTIMONIALS = [
  {
    quote: '「用售后攻略处理�?个高频问题后，同类投诉下降了60%�?,
    name: '某卫浴品牌客服主�?,
    tag: '售后攻略',
  },
  {
    quote: '「AI质检发现的问题比人工抽检�?倍，现在团队服气了�?,
    name: '某智能马桶店铺运�?,
    tag: '质检闭环',
  },
  {
    quote: '「知识库把散落各处的经验统一管理，新人上手快了一倍�?,
    name: '某卫浴旗舰店主管',
    tag: '知识�?,
  },
];

/* ─── 版本入口 ─── */
const VERSION_LINKS = [
  { name: '个人�?¥980/�?, href: '/intro/personal', desc: '1人起步，25�?AI助手', color: 'text-blue-700' },
  { name: '专业�?¥6,800/�?, href: '/intro/professional', desc: '5人团队，全管理工�?, color: 'text-blue-900' },
  { name: '旗舰�?¥9,800/�?, href: '/intro/flagship', desc: '15人团队，全量功能', color: 'text-purple-700' },
];

export default function PersonalIntroPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-14">

      {/* ── Hero：痛点直�?── */}
      <section className="text-center space-y-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          职盈学海 · 客服管理系统
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          客服团队管不好，不是你的问题�?br className="hidden md:block" />是缺一套系�?
        </h1>
        <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
          话术不统一、质检没标准、售后成本高、团队难管—�?br />
          12年卫浴实战经验，全部沉淀进这套系统，AI帮你查漏补缺
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-400 to-blue-800 text-white text-lg font-semibold shadow-lg shadow-sky-400/25 hover:shadow-xl hover:shadow-sky-400/30 transition-all"
          >
            联系我们 <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/membership"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-blue-200 text-blue-800 text-base font-medium hover:bg-blue-50 transition-colors"
          >
            查看版本对比
          </Link>
        </div>
      </section>

      {/* ── 4大痛�?── */}
      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">你正在经历这些困境吗�?/h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PAIN_POINTS.map((p, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-red-50/60 border border-red-100">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                <p.icon className="w-4.5 h-4.5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{p.title}</h3>
                <p className="text-gray-600 text-xs mt-1 leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6大核心能�?── */}
      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">6大核心能力，系统帮你管团�?/h2>
        <p className="text-center text-gray-500 text-sm">不只是工具，�?2年卫浴实战经验沉淀的管理体�?/p>
        <div className="space-y-3">
          {CORE_CAPABILITIES.map((c, i) => (
            <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <c.icon className="w-5 h-5 text-blue-800" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 text-base">{c.title}</h3>
                  <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">{c.tag}</span>
                </div>
                <p className="text-gray-600 text-sm mt-1 leading-relaxed">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 数据来源 ── */}
      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">不是凭空造出来的系统</h2>
        <div className="grid grid-cols-3 gap-4">
          {DATA_SOURCES.map((d) => (
            <div key={d.label} className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-center">
              <p className="text-3xl md:text-4xl font-black text-blue-800">{d.value}</p>
              <p className="text-gray-600 text-xs mt-1.5">{d.label}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-gray-500 text-xs leading-relaxed">
          数据来源�?2年卫浴客服一线实战经验，覆盖智能马桶/花洒/淋浴�?浴室柜等品类�?br />
          从基层客服到独立搭建管理体系�?025年落地精细化管控，售后成本降�?5%
        </p>
      </section>

      {/* ── 客户证言 ── */}
      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">他们用系统解决了什�?/h2>
        <div className="space-y-3">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="p-5 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-gray-800 text-sm leading-relaxed font-medium">{t.quote}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-gray-500 text-xs">{t.name}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{t.tag}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-gray-400 text-xs">更多客户案例持续更新�?/p>
      </section>

      {/* ── 底部CTA ── */}
      <section className="space-y-6 pb-4">
        <div className="text-center space-y-4 p-8 rounded-2xl bg-gradient-to-r from-blue-900 to-blue-950">
          <h2 className="text-xl md:text-2xl font-bold text-white">系统就是产品，不是赠�?/h2>
          <p className="text-sky-300 text-sm leading-relaxed max-w-md mx-auto">
            12年实战经�?AI能力，帮你搭建一套能落地的客服管理体系�?br />
            不再凭感觉管团队，让系统帮你查漏补缺�?
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 text-blue-950 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            联系我们 <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* 版本入口 */}
        <div className="space-y-3">
          <h3 className="text-center text-sm text-gray-500 font-medium">选择适合你的版本</h3>
          <div className="grid grid-cols-3 gap-3">
            {VERSION_LINKS.map((v) => (
              <Link
                key={v.name}
                href={v.href}
                className="p-4 rounded-xl bg-white border border-gray-200 hover:border-sky-400 transition-colors text-center"
              >
                <div className={`font-bold text-sm ${v.color}`}>{v.name}</div>
                <div className="text-gray-500 text-xs mt-1">{v.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
