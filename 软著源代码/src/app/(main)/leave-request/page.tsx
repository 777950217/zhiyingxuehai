'use client';

import { FileText } from 'lucide-react';

export default function LeaveRequestPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-[#2B7DE9]" />
          请假申请
        </h1>
        <p className="text-gray-500 mt-1">提交请假申请，等待主管审�?/p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-[#2B7DE9]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">请假申请功能即将上线</h3>
        <p className="text-gray-500 text-sm">目前请通过线下方式向主管提交请假申�?/p>
      </div>
    </div>
  );
}
