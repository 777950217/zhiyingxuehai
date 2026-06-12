import Link from 'next/link';
import {
  Target, Bot, Wrench, BookMarked, ShieldCheck,
  BarChart3, Users, ClipboardList, FileCheck, LayoutTemplate,
  ArrowRight, Brain, Rocket, ShieldCheck as Shield2,
  MessageSquare, Zap, MessageCircle, Shield, CheckCircle2,
  Crown, UserCog, Headset, Lock,
} from 'lucide-react';

/* ─── 痛点数据 ─── */
const PAIN_POINTS = [
  { icon: MessageCircle, title: '团队话术靠嘴巴传', desc: '新人问老人、老人凭经验，标准话术靠口头教，走一个人就断一�? },
  { icon: Shield, title: '质检全靠抽检+拍脑�?, desc: '没有统一标准，漏检率高，同样的问题反复出现，员工觉得不公平' },
  { icon: Zap, title: '售后问题天天救火', desc: '同样的问题换个客服又是另一套处理方式，客户越闹越大，赔了钱还赔口碑' },
  { icon: BarChart3, title: '管理全靠感觉和经�?, desc: 'KPI形同虚设，排班靠直觉，成本说不清，老板问数据你答不上来' },
];

/* ─── 6大核心能力（专业版侧重） ─── */
const CORE_CAPABILITIES = [
  {
    icon: Bot,
    title: 'AI体检站�?项全检',
    desc: '话术/SOP/案例/质检/方案5维度AI扫描�?秒定位团队薄弱环节，一键生成改善方�?,
    tag: 'AI驱动',
  },
  {
    icon: Wrench,
    title: '售后攻略',
    desc: 'AI拆解售后问题→匹配种子库→引导问答→生成IF-THEN专业方案，团队统一使用，下次一键复�?,
    tag: '新增',
  },
  {
    icon: BookMarked,
    title: '我的知识�?,
    desc: '7大场景分类管理：话术/SOP/攻略/质检/方案/产品/学习，团队经验不流失，新人自助找答案',
    tag: '新增',
  },
  {
    icon: ShieldCheck,
    title: '质检反馈闭环',
    desc: 'AI质检发现问题→主管推送→员工确认改善→复查验证，从发现到解决全程闭环，不用人盯人',
    tag: '新增',
  },
  {
    icon: Target,
    title: 'KPI管理+行业规则',
    desc: '8步方案设计器生成可落地KPI方案�?2年卫浴行业判断规则内置，平台规则实时推�?,
    tag: '专业工具',
  },
  {
    icon: MessageSquare,
    title: 'AI急救�?对话记录',
    desc: '遇到问题随时问AI，秒出专业方案，对话记录自动保存，团队可复用历史解决方案',
    tag: 'AI驱动',
  },
];

/* ─── 专业版管理工�?─── */
const MANAGEMENT_TOOLS = [
  { icon: BarChart3, title: 'KPI管理', desc: '5维打分，方案设计器一键生�? },
  { icon: FileCheck, title: '质检评分', desc: 'AI质检+反馈闭环，问题不过周' },
  { icon: ClipboardList, title: '工单台账', desc: '每个客诉都闭环，不遗�? },
  { icon: LayoutTemplate, title: '排班管理', desc: '科学排班，人效翻�? },
  { icon: Users, title: '客服管理', desc: '5人团队管理，入职到上岗全流程' },
  { icon: Zap, title: '成本预警', desc: '售后成本�?0%自动报警' },
];

/* ─── 数据来源 ─── */
const DATA_SOURCES = [
  { value: '12�?, label: '卫浴客服实战经验' },
  { value: '75%', label: '售后成本降幅' },
  { value: '60%', label: '同类投诉下降�? },
];

/* ─── 版本入口 ─── */
const VERSION_LINKS = [
  { name: '个人�?¥980/�?, href: '/intro/personal', desc: '1人起步，25�?AI助手', color: 'text-blue-700' },
  { name: '专业�?¥6,800/�?, href: '/intro/professional', desc: '5人团队，全管理工�?, color: 'text-blue-900' },
  { name: '旗舰�?¥9,800/�?, href: '/intro/flagship', desc: '15人团队，全量功能', color: 'text-purple-700' },
];

/* ─── 线下主管 vs 系统 ─── */
const COMPARISON = [
  { label: '硬性成�?, offline: '极高', offlineSub: '工资+社保+福利', system: '极低', systemSub: '无需招聘，即开即用' },
  { label: '人员稳定�?, offline: '流动性大', offlineSub: '随时离职，交接断�?, system: '7×24在岗', systemSub: '无离岗、无情绪' },
  { label: '行业经验', offline: '1-2�?, offlineSub: '普遍经验�?, system: '12年沉淀', systemSub: '全流程实战经�? },
  { label: '培训赋能', offline: '看人心情', offlineSub: '带新人凭感觉', system: '系统�?模块', systemSub: '新人自助完成学习' },
  { label: '附加价�?, offline: '仅日常管�?, offlineSub: '无数据洞�?, system: 'AI+预警+闭环', systemSub: '五维数据驱动' },
];

export default function ProfessionalIntroPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-14">

      {/* ── Hero：团队管理痛�?── */}
      <section className="text-center space-y-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          职盈学海 · 专业�?
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          1-5人客服团队，<br className="hidden md:block" />用系统管比靠人管靠谱
        </h1>
        <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
          话术靠嘴巴传、质检靠拍脑袋、售后靠救火—�?br />
          �?2年卫浴实战经验装进系统，AI帮你查漏补缺，团队标准化运作
        </p>

        {/* 核心三句�?*/}
        <div className="space-y-2.5 max-w-lg mx-auto">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
            <Brain className="w-5 h-5 text-blue-800 shrink-0" />
            <span className="text-gray-800 text-sm md:text-base font-medium">12年卫浴客服经验直接装进系统，不用等人�?/span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
            <Rocket className="w-5 h-5 text-blue-800 shrink-0" />
            <span className="text-gray-800 text-sm md:text-base font-medium">售后攻略让团队统一话术，同类问题一键复�?/span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
            <Shield2 className="w-5 h-5 text-blue-800 shrink-0" />
            <span className="text-gray-800 text-sm md:text-base font-medium">AI质检+反馈闭环，问题从发现到解决不用人盯人</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-400 to-blue-800 text-white text-lg font-semibold shadow-lg shadow-sky-400/25 hover:shadow-xl hover:shadow-sky-400/30 transition-all"
          >
            咨询开�?<ArrowRight className="w-5 h-5" />
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
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">管团队靠人带，越带越�?/h2>
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
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 space-y-2">
          <p className="text-blue-900 font-bold text-base">系统�?vs 人管，差别在哪？</p>
          <p className="text-gray-700 text-sm leading-relaxed">
            人管靠经验，走一个人就断一截�?strong className="text-blue-900">系统管靠流程，人走流程在，经验不流失�?/strong>
            AI帮你查漏补缺，售后攻略统一话术，质检闭环自动跟踪，知识库沉淀团队经验�?
          </p>
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

      {/* ── 管理工具 ── */}
      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">全套管理工具，一步到�?/h2>
        <p className="text-center text-gray-500 text-sm">1-5人团队需要的，全在这�?/p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MANAGEMENT_TOOLS.map((f, i) => (
            <div key={i} className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm text-center space-y-2 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center mx-auto">
                <f.icon className="w-5 h-5 text-sky-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">{f.title}</h3>
              <p className="text-gray-500 text-xs">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 数据来源 ─── */}
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
          数据来源�?2年卫浴客服一线实战经验，覆盖智能马桶/花洒/淋浴�?浴室柜等品类
        </p>
      </section>

      {/* ── 线下主管 vs 系统 ── */}
      <section className="rounded-2xl bg-[#0F2B46] p-6 md:p-8 space-y-5">
        <h2 className="text-xl md:text-2xl font-bold text-white text-center">线下主管 vs 系统</h2>
        <p className="text-sky-300 text-center text-sm">系统不会离职、不会涨薪�?×24在岗</p>
        <div className="grid grid-cols-2 gap-3">
          {/* 左列：线�?*/}
          <div className="space-y-3">
            <div className="rounded-xl bg-red-900/30 border border-red-400/30 p-3 text-center">
              <p className="text-red-300 text-xs font-medium">�?线下专职客服主管</p>
            </div>
            <div className="space-y-2">
              {COMPARISON.map((row, i) => (
                <div key={i} className="rounded-lg bg-white/5 p-3 space-y-1">
                  <p className="text-white/60 text-xs">{row.label}</p>
                  <p className="text-red-300 text-base font-bold">{row.offline}</p>
                  <p className="text-white/40 text-xs">{row.offlineSub}</p>
                </div>
              ))}
            </div>
          </div>
          {/* 右列：系�?*/}
          <div className="space-y-3">
            <div className="rounded-xl bg-sky-500/20 border border-sky-400/40 p-3 text-center">
              <p className="text-sky-300 text-xs font-medium">�?职盈学海专业�?/p>
            </div>
            <div className="space-y-2">
              {COMPARISON.map((row, i) => (
                <div key={i} className="rounded-lg bg-sky-500/10 p-3 space-y-1">
                  <p className="text-white/60 text-xs">{row.label}</p>
                  <p className="text-sky-300 text-base font-bold">{row.system}</p>
                  <p className="text-white/50 text-xs">{row.systemSub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-sky-500/15 border border-sky-400/30 p-4 text-center">
          <p className="text-white font-bold text-base md:text-lg">
            月成本相差近<span className="text-sky-300 text-xl md:text-2xl">19�?/span>，系统替代主管全部核心工�?
          </p>
        </div>
      </section>

      {/* ── 数据安全隔离 ── */}
      <section className="space-y-5">
        <div className="text-center space-y-2">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">数据安全隔离</h2>
          <p className="text-base text-gray-600">老板看全局，主管管自己，客服干好活——各看各的，互不干扰</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 老板 */}
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">老板</h3>
                <p className="text-amber-700 text-sm font-medium">老板看板</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">能看�?/p>
              {['盈亏趋势', '成本预警', 'KPI全局', '客服损失看板', '顾问后台'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <span className="text-gray-800 text-sm">{item}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 pt-2 border-t border-amber-200">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">看不�?/p>
              {['其他公司数据', '员工密码/薪资'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-400 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          {/* 主管 */}
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center">
                <UserCog className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">主管</h3>
                <p className="text-blue-700 text-sm font-medium">主管工作�?/p>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">能看�?/p>
              {['我的班组', 'KPI达标�?, '质检结果', '待处理工�?, '售后攻略', '知识�?].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <span className="text-gray-800 text-sm">{item}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 pt-2 border-t border-blue-200">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">看不�?/p>
              {['其他班组数据', '公司盈亏', '客服薪资'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-400 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          {/* 客服 */}
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center">
                <Headset className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">客服</h3>
                <p className="text-emerald-700 text-sm font-medium">我的工作�?/p>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">能看�?/p>
              {['今日待办', 'AI急救�?, '售后攻略', '我的工单', '质检反馈'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <span className="text-gray-800 text-sm">{item}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 pt-2 border-t border-emerald-200">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">看不�?/p>
              {['KPI管理', '成本预警', '其他人工�?, '盈亏数据'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-400 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
          <Lock className="w-4 h-4 text-blue-600 shrink-0" />
          <p className="text-blue-800 text-sm font-medium">三级角色严格隔离，主管看不到其他班组数据，客服看不到任何管理数据</p>
        </div>
      </section>

      {/* ── 底部CTA ── */}
      <section className="space-y-6 pb-4">
        <div className="text-center space-y-4 p-8 rounded-2xl bg-gradient-to-r from-blue-900 to-blue-950">
          <h2 className="text-xl md:text-2xl font-bold text-white">系统就是产品，不是赠�?/h2>
          <p className="text-sky-300 text-sm leading-relaxed max-w-md mx-auto">
            12年实战经�?AI能力，帮你搭建一�?-5人团队能落地的管理体系�?br />
            话术统一、质检有标准、售后有攻略、知识不流失�?
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 text-blue-950 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            咨询开�?<ArrowRight className="w-5 h-5" />
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
                className={`p-4 rounded-xl bg-white border border-gray-200 hover:border-sky-400 transition-colors text-center ${v.href === '/intro/professional' ? 'ring-2 ring-sky-400' : ''}`}
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
