'use client';

import { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';

const STORAGE_KEY = 'cookie_consent';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 检查是否已同意
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      // 延迟显示，避免页面加载时立即弹出
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAgree = () => {
    localStorage.setItem(STORAGE_KEY, 'agreed');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center shrink-0">
            <Cookie className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-sm text-gray-600">
            本网站使用Cookie提升您的体验，继续使用即表示同意
          </p>
        </div>
        <button
          onClick={handleAgree}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
        >
          我知道了
        </button>
      </div>
    </div>
  );
}
