import { ClipboardCheck } from 'lucide-react';

export default function SelfCheckGuidePage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-[#2B7DE9]" />
          自查须知
        </h1>
        <p className="text-gray-500 mt-1">日常自查清单和易错点提醒</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <ClipboardCheck className="w-8 h-8 text-[#2B7DE9]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">自查须知内容加载�?/h3>
        <p className="text-gray-500 text-sm">包含常见错误规避、自查流程、注意事项等</p>
      </div>
    </div>
  );
}
