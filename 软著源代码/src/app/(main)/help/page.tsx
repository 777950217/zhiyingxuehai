'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  BookOpen,
  HelpCircle,
  MessageCircle,
  ExternalLink,
  Phone,
  ChevronDown,
  ChevronRight,
  Headset,
  FileText,
  Users,
} from 'lucide-react';

/* ─── Feishu doc config ─── */
const HELP_LINKS = [
  {
    icon: BookOpen,
    title: '培训课程',
    desc: '系统化学习电商客服技�?,
    url: 'https://weiguanjia.com/wiki/training',
    tag: '培训',
  },
  {
    icon: HelpCircle,
    title: '常见问题',
    desc: '使用中的常见问题与解�?,
    url: 'https://weiguanjia.com/wiki/faq',
    tag: 'FAQ',
  },
  {
    icon: FileText,
    title: '操作指南',
    desc: '职盈学海各功能使用教�?,
    url: null,
    tag: '教程',
  },
  {
    icon: Users,
    title: '新手入门',
    desc: '从注册到上手�?分钟快速开�?,
    url: null,
    tag: '入门',
  },
];

const FAQ_ITEMS = [
  {
    q: 'AI问题解决器怎么用？',
    a: '选择诊断类型，描述你遇到的客服问题，AI会给出问题分析、解决方案、推荐话术和预防建议。每天有1次免费使用机会�?,
  },
  {
    q: '培训课程在哪里看�?,
    a: '培训中心的学习课程会跳转到飞书文档查看。产品内保留课程进度看板，详细内容在飞书阅读�?,
  },
  {
    q: 'AI体验次数用完了怎么办？',
    a: '当日免费次数用完后，次日会自动恢复。如需更多次数，可以解锁更多服务套餐，联系客服了解详情�?,
  },
  {
    q: 'KPI方案怎么生成�?,
    a: '进入KPI管理页面，选择KPI类型（售�?售后/通用/薪酬），填写团队参数，点击生成即可获得AI定制的KPI方案�?,
  },
];

export default function HelpPage() {
  const { profile } = useAuth();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const isEnterpriseStaff =
    profile?.role === 'staff' || profile?.role === 'personal_user' || profile?.role === 'enterprise_manager';

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">帮助中心</h1>
        <p className="text-gray-500 mt-1">快速找到你需要的使用帮助和资�?/p>
      </div>

      {/* Feishu Doc Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {HELP_LINKS.map((link) => {
          const Icon = link.icon;
          const hasUrl = !!link.url;
          return (
            <div
              key={link.title}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-sky-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{link.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-blue-800">
                      {link.tag}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{link.desc}</p>
                  <div className="mt-3">
                    {hasUrl ? (
                      <a
                        href={link.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-blue-900 hover:text-blue-950 font-medium"
                      >
                        去查�?
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
                        <Headset className="w-3.5 h-3.5" />
                        敬请期待
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-sky-400" />
            常见问题
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {FAQ_ITEMS.map((faq, idx) => (
            <div key={idx}>
              <button
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
              >
                <span className="font-medium text-gray-900">{faq.q}</span>
                {expandedFaq === idx ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                )}
              </button>
              {expandedFaq === idx && (
                <div className="px-5 pb-4 -mt-1">
                  <p className="text-sm text-gray-600 leading-relaxed pl-0">
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Support - dual-line design */}
      {!isEnterpriseStaff && (
        <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl border border-sky-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-sky-400" />
            联系客服
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            如有任何使用问题，欢迎联系我们的客服团队获取帮助
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <Phone className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">微信客服</p>
                <p className="text-xs text-gray-500">微信号：职盈学海服务�?/p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">在线咨询</p>
                <p className="text-xs text-gray-500">工作�?9:00-18:00</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            解锁更多服务，获取完整自学体�?
          </p>
        </div>
      )}
    </div>
  );
}
