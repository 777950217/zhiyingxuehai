import Link from 'next/link';
import {
  Zap, Bot, ClipboardCheck, FileText, BookOpen,
  BarChart3, ShieldCheck, ArrowRight, CheckCircle2,
  Flame, Lock, Star, TrendingUp, Award,
} from 'lucide-react';

export default function IntroEfficiencyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 text-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-bold tracking-wide">职盈学海</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-white/70 hover:text-white transition">登录</Link>
            <Link
              href="/register?role=efficiency_user"
              className="text-sm px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-blue-950 font-semibold rounded-lg transition"
            >
              咨询开通
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero: 99效率版 ── */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 border border-cyan-400/20 rounded-full mb-6">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-300 text-sm font-medium">99效率版 · 一线客服提效利器</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
          不用学管理<span className="text-cyan-400">，</span><br />
          只用借AI<span className="text-cyan-400">干活</span>
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
          咨询开通，获取AI急救站不限次+3项AI体检+话术练兵场+产品档案+模板库
        </p>
        <Link
          href="/register?role=efficiency_user"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-blue-950 font-bold text-lg rounded-xl transition shadow-lg shadow-cyan-500/20"
        >
          咨询开通效率版
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* ── 第一屏：三个担心 ── */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-10">你可能担心的三件事</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: '不是试用、不是内测、不是精简体验版',
              desc: '咨询开通，完整功能、持续更新、独立服务',
            },
            {
              icon: Zap,
              title: '无需升级管理版',
              desc: '功能完全独立适配一线岗位，不开通也够用、不降级、不缩水',
            },
            {
              icon: CheckCircle2,
              title: '无删减、无隐藏次数、无变相限制',
              desc: '核心提效功能全部开放，AI急救站不限次、AI体检真实出结果',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-cyan-400/30 transition"
            >
              <item.icon className="w-8 h-8 text-cyan-400 mb-4" />
              <p className="font-bold text-white mb-2">✅ {item.title}</p>
              <p className="text-sm text-white/50">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 第二屏：场景化痛点 ── */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-3">一线客服的真实痛点</h2>
        <p className="text-center text-white/50 mb-10">每个场景，都有AI帮你3秒解决</p>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            {
              emoji: '🔥',
              pain: '加班写售后回复、反复改话术',
              solution: 'AI急救站3秒出专业话术',
              icon: Bot,
            },
            {
              emoji: '📝',
              pain: '自己写的话术不知道行不行',
              solution: 'AI体检站帮你批改',
              icon: ClipboardCheck,
            },
            {
              emoji: '📋',
              pain: '售后流程总是漏环节',
              solution: 'SOP体检帮你扫缺口补漏洞',
              icon: FileText,
            },
            {
              emoji: '💼',
              pain: '产品信息每次重复填',
              solution: '产品档案一次录入全打通',
              icon: BookOpen,
            },
          ].map((item) => (
            <div
              key={item.pain}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 flex gap-4 items-start hover:border-cyan-400/30 transition"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <item.icon className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-white/70 text-sm mb-1">{item.emoji} {item.pain}</p>
                <p className="font-semibold text-cyan-300">→ {item.solution}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center mt-8 text-lg font-semibold text-white/80">
          不用学管理，只用借AI干活
        </p>
      </section>

      {/* ── 第三屏：管理版是什么 ── */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-400/20 rounded-2xl p-8 md:p-10">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-7 h-7 text-amber-400" />
            <h2 className="text-2xl font-bold">管理版是什么？</h2>
          </div>
          <p className="text-white/70 mb-4 text-lg">
            <span className="text-cyan-400 font-semibold">效率版帮你省时间</span>，<span className="text-amber-400 font-semibold">管理版帮你学管理</span>
          </p>
          <p className="text-white/50 mb-6">
            不止是工具，是职场晋升必备体系课
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { icon: BookOpen, text: '25课管理课程' },
              { icon: BarChart3, text: 'KPI规划器' },
              { icon: ClipboardCheck, text: 'AI体检全5项' },
              { icon: Award, text: '周报月报复盘' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-white/60">
                <item.icon className="w-5 h-5 text-amber-400" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-amber-300/70">
            想从一线晋升管理层？管理版等你开通 →
          </p>
        </div>
      </section>

      {/* ── 第四屏：功能对比表 ── */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-10">效率版 vs 管理版 功能对比</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/50 font-medium">功能</th>
                <th className="text-center py-3 px-4 font-semibold text-cyan-400">
                  效率版
                </th>
                <th className="text-center py-3 px-4 font-semibold text-amber-400">
                  管理版
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'AI急救站（不限次）', free: true, pro: true },
                { name: 'AI体检 - 话术体检', free: true, pro: true },
                { name: 'AI体检 - SOP体检', free: true, pro: true },
                { name: 'AI体检 - 案例体检', free: true, pro: true },
                { name: 'AI体检 - 质检体检', free: false, pro: true },
                { name: 'AI体检 - 方案体检', free: false, pro: true },
                { name: '话术练兵场', free: true, pro: true },
                { name: '产品档案', free: true, pro: true },
                { name: '模板库', free: true, pro: true },
                { name: '25课管理课程', free: false, pro: true },
                { name: 'KPI规划器', free: false, pro: true },
                { name: '周报月报复盘', free: false, pro: true },
                { name: '管理工具包', free: false, pro: true },
              ].map((row) => (
                <tr key={row.name} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="py-3 px-4 text-white/70">{row.name}</td>
                  <td className="py-3 px-4 text-center">
                    {row.free ? (
                      <CheckCircle2 className="w-5 h-5 text-cyan-400 mx-auto" />
                    ) : (
                      <Lock className="w-4 h-4 text-white/20 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <CheckCircle2 className="w-5 h-5 text-amber-400 mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 第五屏：信任背书占位 ── */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-white/5 border border-white/10 border-dashed rounded-2xl p-10 text-center">
          <Star className="w-8 h-8 text-white/20 mx-auto mb-4" />
          <p className="text-white/30 text-lg font-medium mb-2">用户好评与数据背书</p>
          <p className="text-white/20 text-sm">即将上线</p>
        </div>
      </section>

      {/* ── 底部CTA ── */}
      <section className="max-w-4xl mx-auto px-6 pb-10 text-center">
        <h2 className="text-3xl font-extrabold mb-4">开始用AI提效</h2>
        <p className="text-white/50 mb-8">独立正式版 · 无隐藏限制</p>
        <Link
          href="/register?role=efficiency_user"
          className="inline-flex items-center gap-2 px-10 py-4 bg-cyan-500 hover:bg-cyan-400 text-blue-950 font-bold text-lg rounded-xl transition shadow-lg shadow-cyan-500/20"
        >
          咨询开通效率版
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* ── 版本选择 ── */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h3 className="text-center text-white/50 text-sm mb-6">有任何问题？<a href="/contact" className="underline font-medium text-white/70 hover:text-white">添加微信咨询</a>，专属顾问1对1解答</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { name: '效率版', desc: '一线AI提效工具', href: '/register?role=efficiency_user', active: true },
            { name: '个人版', desc: '团队管理训练营', href: '/intro/personal' },
            { name: '专业版', desc: '团队管理训练营', href: '/intro/professional' },
            { name: '旗舰版', desc: '深度服务支持', href: '/intro/flagship' },
          ].map((v) => (
            <Link
              key={v.name}
              href={v.href}
              className="block rounded-xl border border-white/10 bg-white/5 hover:border-white/20 p-5 text-center transition"
            >
              <p className={`font-bold text-lg ${v.active ? 'text-cyan-400' : 'text-white/80'}`}>
                {v.name} {v.active && '✓'}
              </p>
              <p className="text-white/40 text-xs mt-1">{v.desc}</p>
            </Link>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link href="/login" className="text-white/30 hover:text-white/50 text-sm transition">
            ← 返回登录
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-8 text-center text-white/30 text-xs">
        <p>© 2025 职盈学海 · 1051202571@qq.com</p>
        <p className="mt-1">本平台不构成任何投资或法律建议</p>
      </footer>
    </div>
  );
}
