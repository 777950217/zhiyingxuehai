'use client';

import { useState } from 'react';

interface LessonFeedbackModalProps {
  lessonId: string;
  courseId?: string;
  noteId?: string;
  userId: string;
  lessonName?: string;
  onClose: () => void;
}

const NOT_UNDERSTOOD_OPTIONS = [
  '专业名词难以理解',
  '缺少实操案例参�?,
  '操作步骤模糊',
  '理论概念太抽�?,
  '其他（自定义�?,
];

export default function LessonFeedbackModal({
  lessonId,
  courseId,
  noteId,
  userId,
  lessonName,
  onClose,
}: LessonFeedbackModalProps) {
  const [understood, setUnderstood] = useState<boolean | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleOption = (opt: string) => {
    setSelectedOptions((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  const handleSubmit = async (status: 'completed' | 'skipped') => {
    if (submitting) return;

    if (status === 'skipped') {
      setSubmitting(true);
      try {
        await fetch('/api/lesson-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            lessonId,
            courseId,
            noteId,
            understood: false,
            reason: '',
            feedbackStatus: 'skipped',
          }),
        });
      } catch {
        // 静默失败不影响体�?
      }
      setSubmitting(false);
      onClose();
      return;
    }

    if (understood === null) return;

    setSubmitting(true);
    try {
      // 构�?reason：选中的选项 + 自定义文�?
      const reasons = [...selectedOptions.filter((o) => o !== '其他（自定义�?)];
      if (selectedOptions.includes('其他（自定义�?) && customReason.trim()) {
        reasons.push(customReason.trim());
      }

      await fetch('/api/lesson-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          lessonId,
          courseId,
          noteId,
          understood,
          reason: understood ? '' : reasons.join('�?),
          feedbackStatus: 'completed',
        }),
      });
      setSubmitted(true);
    } catch {
      // 静默失败
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">感谢反馈�?/h3>
          <p className="text-gray-500 text-base mb-6">你的反馈将帮助我们持续优化课程内�?/p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-800 text-white rounded-xl text-lg font-semibold hover:bg-blue-900 transition"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        {/* 标题 */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800">
            这节课你学会了吗�?
          </h3>
          {lessonName && (
            <p className="text-gray-400 text-sm mt-1">{lessonName}</p>
          )}
        </div>

        {/* 理解选项 */}
        {understood === null && (
          <div className="space-y-3 mb-6">
            <button
              onClick={() => setUnderstood(true)}
              className="w-full py-4 border-2 border-green-200 rounded-xl text-lg font-semibold text-green-700 hover:bg-green-50 hover:border-green-400 transition flex items-center justify-center gap-3"
            >
              <span className="text-2xl">�?/span>
              完全看懂
            </button>
            <button
              onClick={() => setUnderstood(false)}
              className="w-full py-4 border-2 border-orange-200 rounded-xl text-lg font-semibold text-orange-700 hover:bg-orange-50 hover:border-orange-400 transition flex items-center justify-center gap-3"
            >
              <span className="text-2xl">�?/span>
              部分没看�?
            </button>
          </div>
        )}

        {/* 完全看懂 �?一键提�?*/}
        {understood === true && (
          <div className="mb-6">
            <div className="text-center py-4 bg-green-50 rounded-xl mb-4">
              <span className="text-4xl">👍</span>
              <p className="text-green-700 font-semibold mt-2 text-lg">太棒了！继续加油</p>
            </div>
            <button
              onClick={() => handleSubmit('completed')}
              disabled={submitting}
              className="w-full py-3 bg-green-600 text-white rounded-xl text-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              {submitting ? '提交�?..' : '提交'}
            </button>
          </div>
        )}

        {/* 部分没看�?�?展开选项 */}
        {understood === false && (
          <div className="mb-6">
            <p className="text-gray-600 text-base mb-3 font-medium">
              哪些地方没看懂？（可多选）
            </p>
            <div className="space-y-2 mb-4">
              {NOT_UNDERSTOOD_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition text-base ${
                    selectedOptions.includes(opt)
                      ? 'border-blue-400 bg-blue-50 text-blue-800'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(opt)}
                    onChange={() => toggleOption(opt)}
                    className="w-5 h-5 accent-blue-600"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>

            {/* 自定义输�?*/}
            {selectedOptions.includes('其他（自定义�?) && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="请描述你没看懂的地方..."
                className="w-full p-3 border-2 border-gray-200 rounded-xl text-base focus:border-blue-400 focus:outline-none resize-none"
                rows={3}
                maxLength={500}
              />
            )}

            <button
              onClick={() => handleSubmit('completed')}
              disabled={submitting}
              className="w-full py-3 bg-blue-800 text-white rounded-xl text-lg font-semibold hover:bg-blue-900 transition disabled:opacity-50 mt-3"
            >
              {submitting ? '提交�?..' : '提交反馈'}
            </button>
          </div>
        )}

        {/* 稍后再说 */}
        {!submitted && (
          <button
            onClick={() => handleSubmit('skipped')}
            disabled={submitting}
            className="w-full text-center text-gray-400 text-sm py-2 hover:text-gray-600 transition"
          >
            稍后再说
          </button>
        )}
      </div>
    </div>
  );
}
