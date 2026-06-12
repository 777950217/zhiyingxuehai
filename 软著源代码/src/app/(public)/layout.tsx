import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Simple header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-800 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">职盈学海</span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-blue-800 hover:text-sky-600 transition-colors"
          >
            登录平台
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 px-4 py-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-sky-400 to-blue-800 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-gray-800">职盈学海</span>
          </div>
          <p className="text-sm text-gray-500 mb-1">导师：创始人 | 12年一线卫浴客服团队全流程管理实战经验</p>
          <p className="text-xs text-gray-400 leading-relaxed max-w-lg mx-auto">
            本平台所有课程、方案、管理体系均为实战经验总结分享，仅作职场管理学习参考，不做任何升职、盈利、业绩暴涨等绝对性承诺与担保
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
            <Link href="/terms" className="hover:text-gray-600 transition-colors">用户服务协议</Link>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">隐私政策</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
