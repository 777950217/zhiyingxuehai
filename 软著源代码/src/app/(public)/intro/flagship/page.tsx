import Link from 'next/link';
import {
  Target, Bot, Wrench, BookMarked, ShieldCheck,
  BarChart3, Users, ClipboardList, FileCheck, LayoutTemplate,
  ArrowRight, Brain, Rocket, ShieldCheck as Shield2,
  MessageSquare, Zap, MessageCircle, Shield, CheckCircle2,
  Crown, UserCog, Headset, Lock, TrendingUp, Building2,
  AlertTriangle, LineChart, UserCheck, Eye, PieChart, Activity,
} from 'lucide-react';

/* ─── 痛点数据 ─── */
const PAIN_POINTS = [
  { icon: Building2, title: '客服中心规模化难�?, desc: '5人以上团队，光排班和质检就占主管全部精力，管理成本随人数线性增�? },
  { icon: TrendingUp, title: '售后成本说不�?, desc: '每个品类的退货率/赔偿�?二次上门率一片模糊，无法精确定位成本黑洞' },
  { icon: AlertTriangle, title: '数据孤岛严重', desc: 'KPI在一套系统，成本在Excel，质检在聊天记录，老板想看全局全靠手动汇�? },
  { icon: LineChart, title: '管理全靠汇报', desc: '层层汇报延迟失真，老板看到的数据已经过时，无法实时决策' },
];

/* ─── 6大核心能力（旗舰版侧重） ─── */
const CORE_CAPABILITIES = [
  {
    icon: Bot,
    title: 'AI体检站�?项全检',
    desc: '话术/SOP/案例/质检/方案5维度AI扫描�?秒定位团队薄弱环节，自动推送改善任�?,
    tag: 'AI驱动',
  },
  {
    icon: Wrench,
    title: '售后攻略',
    desc: 'AI拆解→匹配→引导→生成IF-THEN方案�?5人团队统一执行标准，同类问题一键复�?,
    tag: '新增',
  },
  {
    icon: BookMarked,
    title: '我的知识库�?大场�?,
    desc: '话术/售后/质检/方案/产品/经营/学习全量分类，团队经验资产化，新人自助找答案',
    tag: '新增',
  },
  {
    icon: ShieldCheck,
    title: '质检反馈闭环',
    desc: 'AI质检→主管推送→员工确认→复查验证，全流程自动追踪，15人团队不用人盯人',
    tag: '新增',
  },
  {
    icon: Target,
    title: '驾驶�?ROI账本',
    desc: '老板看板：实时盈�?成本预警/KPI全局/客服损失/顾问后台，ROI账本精确到每个品�?,
    tag: '旗舰专属',
  },
  {
    icon: MessageSquare,
    title: 'AI急救�?对话记录',
    desc: '15人团队AI实时问答，对话记录自动保存可复用，顾问一对一陪跑指导',
    tag: 'AI驱动',
  },
];

/* ─── 旗舰版专属能�?─── */
const FLAGSHIP_EXCLUSIVE = [
  { icon: PieChart, title: '财务看板', desc: '按品�?时段/团队多维度盈亏分析，成本黑洞一目了�? },
  { icon: Activity, title: '驾驶�?, desc: '实时运营全览：KPI/成本/预警/客服损失/顾问后台' },
  { icon: BarChart3, title: 'ROI账本', desc: '按品类追踪退货率/赔偿�?二次上门率，精确计算系统价�? },
  { icon: Eye, title: '成本预警', desc: '售后成本�?0%自动报警，损失趋势实时推�? },
  { icon: UserCheck, title: '顾问陪跑', desc: '一对一专属顾问，从开户到落地全程指导，确保见�? },
  { icon: FileCheck, title: '知识萃取', desc: 'Admin后台审核团队产出，标记最佳实践，按行业归�? },
];

/* ─── 数据来源 ─── */
const DATA_SOURCES = [
  { value: '12�?, label: '卫浴客服实战经验' },
  { value: '75%', label: '售后成本降幅' },
  { value: '200+', label: '行业验证案例' },
];

/* ─── 版本入口 ─── */
const VERSION_LINKS = [
  { name: '个人�?¥980/�?, href: '/intro/personal', desc: '1人起步，25�?AI助手', color: 'text-blue-700' },
  { name: '专业�?¥6,800/�?, href: '/intro/professional', desc: '5人团队，全管理工�?, color: 'text-blue-900' },
  { name: '旗舰�?¥9,800/�?, href: '/intro/flagship', desc: '15人团队，全量功能', color: 'text-purple-700' },
];

/* ─── 版本升级路径 ─── */
const UPGRADE_PATH = [
  { version: '个人�?, price: '¥980/�?, highlight: '1人起步，AI体验', users: '1�? },
  { version: '专业�?, price: '¥6,800/�?, highlight: '5人团队，全管理工�?, users: '5�? },
  { version: '旗舰�?, price: '¥9,800/�?, highlight: '15人团队，驾驶�?顾问', users: '15�? },
];

export default function FlagshipIntroPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-14">

      {/* ── Hero ── */}
      <section className="text-center space-y-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-purple-400" />
          职盈学海 · 旗舰�?
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          15人客服中心，<br className="hidden md:block" />需要的不只是管理，是驾�?
        </h1>
        <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
          客服中心规模化后，管理成本随人数线性增长—�?br />
          驾驶舱实时全局掌控，AI查漏补缺，顾问陪跑确保落�?
        </p>

        {/* 核心三句�?*/}
        <div className="space-y-2.5 max-w-lg mx-auto">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 border border-purple-100">
            <Brain className="w-5 h-5 text-purple-800 shrink-0" />
            <span className="text-gray-800 text-sm md:text-base font-medium">驾驶舱实时看全局，不用等汇报，不用猜数据</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 border border-purple-100">
            <Rocket className="w-5 h-5 text-purple-800 shrink-0" />
            <span className="text-gray-800 text-sm md:text-base font-medium">ROI账本精确到品类，每个客服的损�?贡献一目了�?/span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 border border-purple-100">
            <Shield2 className="w-5 h-5 text-purple-800 shrink-0" />
            <span className="text-gray-800 text-sm md:text-base font-medium">顾问一对一陪跑，从开户到见效全程指导</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white text-lg font-semibold shadow-lg shadow-purple-400/25 hover:shadow-xl hover:shadow-purple-400/30 transition-all"
          >
            预约顾问 <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/membership"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-purple-200 text-purple-800 text-base font-medium hover:bg-purple-50 transition-colors"
          >
            查看版本对比
          </Link>
        </div>
      </section>

      {/* ── 4大痛�?── */}
      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">规模越大，管理越�?/h2>
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
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 space-y-2">
          <p className="text-purple-900 font-bold text-base">5人靠人管�?5人必须靠系统</p>
          <p className="text-gray-700 text-sm leading-relaxed">
            5人团队还能靠主管盯，15人团�?strong className="text-purple-900">必须用系统实时掌控全局</strong>�?
            驾驶舱一个页面看清全盘，AI帮你发现盲区，顾问确保方案落地见效�?
          </p>
        </div>
      </section>

      {/* ── 6大核心能�?── */}
      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">6大核心能力，驾驭客服中心</h2>
        <p className="text-center text-gray-500 text-sm">12年卫浴实战经�?+ AI + 顾问陪跑，三层保障体�?/p>
        <div className="space-y-3">
          {CORE_CAPABILITIES.map((c, i) => (
            <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <c.icon className="w-5 h-5 text-purple-800" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 text-base">{c.title}</h3>
                  <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                    c.tag === '旗舰专属' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                    c.tag === '新增' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                    'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>{c.tag}</span>
                </div>
                <p className="text-gray-600 text-sm mt-1 leading-relaxed">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 旗舰版专属能�?── */}
      <section className="space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Crown className="w-5 h-5 text-purple-700" />
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">旗舰版专属能�?/h2>
        </div>
        <p className="text-center text-gray-500 text-sm">专业版无法触及的深度管理能力</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FLAGSHIP_EXCLUSIVE.map((f, i) => (
            <div key={i} className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-white border border-purple-200 shadow-sm text-center space-y-2 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto">
                <f.icon className="w-5 h-5 text-purple-700" />
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
            <div key={d.label} className="p-4 rounded-xl bg-purple-50 border border-purple-100 text-center">
              <p className="text-3xl md:text-4xl font-black text-purple-800">{d.value}</p>
              <p className="text-gray-600 text-xs mt-1.5">{d.label}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-gray-500 text-xs leading-relaxed">
          数据来源�?2年卫浴客服一线实战经验，覆盖智能马桶/花洒/淋浴�?浴室柜等品类
        </p>
      </section>

      {/* ── 版本升级路径 ── */}
      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">随业务增长，系统同步升级</h2>
        <div className="space-y-3">
          {UPGRADE_PATH.map((u, i) => (
            <div key={i} className={`flex items-center gap-4 p-5 rounded-xl border-2 ${
              i === 2 ? 'border-purple-400 bg-purple-50/50' : 'border-gray-200 bg-white'
            }`}>
              <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${
                i === 2 ? 'bg-purple-600 text-white' : i === 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold text-base ${i === 2 ? 'text-purple-900' : 'text-gray-900'}`}>{u.version}</h3>
                  <span className="text-gray-500 text-sm">{u.price}</span>
                  {i === 2 && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">推荐</span>}
                </div>
                <p className="text-gray-600 text-sm mt-0.5">{u.highlight}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-gray-500 text-xs">团队规模</p>
                <p className={`font-bold text-lg ${i === 2 ? 'text-purple-700' : 'text-gray-700'}`}>{u.users}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 顾问陪跑说明 ── */}
      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">顾问陪跑，确保落地见�?/h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-700 font-black text-lg">1</span>
            </div>
            <h3 className="font-bold text-gray-900">开户诊�?/h3>
            <p className="text-gray-600 text-sm">顾问一对一了解团队现状，定制落地计�?/p>
          </div>
          <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-700 font-black text-lg">2</span>
            </div>
            <h3 className="font-bold text-gray-900">落地指导</h3>
            <p className="text-gray-600 text-sm">从配置到培训全程跟进，确保团队用起来</p>
          </div>
          <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-purple-700 font-black text-lg">3</span>
            </div>
            <h3 className="font-bold text-gray-900">持续优化</h3>
            <p className="text-gray-600 text-sm">定期复盘，根据数据调优方案，确保持续见效</p>
          </div>
        </div>
      </section>

      {/* ── 底部CTA ── */}
      <section className="space-y-6 pb-4">
        <div className="text-center space-y-4 p-8 rounded-2xl bg-gradient-to-r from-purple-900 to-purple-950">
          <h2 className="text-xl md:text-2xl font-bold text-white">系统就是产品，不是赠�?/h2>
          <p className="text-purple-300 text-sm leading-relaxed max-w-md mx-auto">
            12年实战经�?AI能力+顾问陪跑，帮你驾�?5人客服中心�?br />
            驾驶舱看全局，AI查漏补缺，顾问确保落地�?
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-400 to-pink-400 text-white text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            预约顾问 <ArrowRight className="w-5 h-5" />
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
                className={`p-4 rounded-xl bg-white border border-gray-200 hover:border-purple-400 transition-colors text-center ${v.href === '/intro/flagship' ? 'ring-2 ring-purple-400' : ''}`}
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
