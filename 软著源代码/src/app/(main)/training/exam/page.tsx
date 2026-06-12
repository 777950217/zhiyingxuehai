'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { examQuestions } from '@/lib/training-data';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function ExamPage() {
  const router = useRouter();
  const { profile, authFetch } = useAuth();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(examQuestions.length).fill(-1));
  const [showResult, setShowResult] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [examRecord, setExamRecord] = useState<{ score: number; passed: boolean } | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    authFetch(`/api/training-data?type=exams&userId=${profile.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.data && data.data.length > 0) {
          const latest = data.data[0];
          setExamRecord({ score: latest.score, passed: latest.passed });
        }
      })
      .catch(() => {});
  }, [profile?.id]);

  const saveExamResult = useCallback((score: number, ans: number[]) => {
    const passed = score >= 80;
    const record = { score, answers: ans, date: new Date().toISOString(), passed };
    setExamRecord(record);
    // Save to Supabase
    if (profile?.id) {
      authFetch('/api/training-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'exam',
          userId: profile.id,
          score,
          answers: JSON.stringify(ans),
          passed,
        }),
      }).catch(() => {});
    }
  }, [profile?.id]);

  const question = examQuestions[currentQ];
  const isCorrect = answers[currentQ] === question.correctIndex;
  const totalCorrect = answers.filter((a, i) => a === examQuestions[i].correctIndex).length;
  const score = Math.round((totalCorrect / examQuestions.length) * 100);

  const handleSelect = (index: number) => {
    if (submitted) return;
    const newAnswers = [...answers];
    newAnswers[currentQ] = index;
    setAnswers(newAnswers);
    setShowResult(true);
  };

  const handleNext = () => {
    setShowResult(false);
    if (currentQ < examQuestions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setSubmitted(true);
      const finalCorrect = answers.filter((a, i) => a === examQuestions[i].correctIndex).length;
      const finalScore = Math.round((finalCorrect / examQuestions.length) * 100);
      saveExamResult(finalScore, answers);
    }
  };

  const handleRetry = () => {
    setCurrentQ(0);
    setAnswers(Array(examQuestions.length).fill(-1));
    setShowResult(false);
    setSubmitted(false);
    setExamRecord(null);
  };

  // Final result screen
  if (submitted) {
    const passed = score >= 80;
    const wrongQuestions = examQuestions.filter((_, i) => answers[i] !== examQuestions[i].correctIndex);
    const relatedModules = [...new Set(wrongQuestions.map((q) => q.relatedModuleId).filter(Boolean))];

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/training')} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> 返回培训路径
        </Button>

        <div className={`rounded-xl border-2 p-8 text-center ${passed ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          <div className="text-6xl mb-4">{passed ? '🎉' : '📖'}</div>
          <h2 className={`text-2xl font-bold ${passed ? 'text-green-800' : 'text-red-800'}`}>
            {passed ? '考核通过！你可以上岗了！' : `考核未通过�?{score}分）`}
          </h2>
          <p className={`mt-2 ${passed ? 'text-green-700' : 'text-red-700'}`}>
            {passed
              ? '你已经掌握了基础知识，可以开始正式上岗了�?
              : `需�?0分以上通过，你答对�?{totalCorrect}/${examQuestions.length}题`}
          </p>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="text-center">
              <div className={`text-3xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>{score}</div>
              <div className="text-gray-500">得分</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{totalCorrect}</div>
              <div className="text-gray-500">答对</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{examQuestions.length - totalCorrect}</div>
              <div className="text-gray-500">答错</div>
            </div>
          </div>
        </div>

        {wrongQuestions.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-slate-500" /> 答错的题�?
            </h3>
            <div className="space-y-6 animate-fade-in-up">
              {wrongQuestions.map((q) => {
                const qIndex = examQuestions.indexOf(q);
                return (
                  <div key={q.id} className="border-l-4 border-red-400 bg-red-50 rounded-r-lg px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{q.question}</p>
                    <p className="text-sm text-red-700 mt-1">
                      你的答案：{answers[qIndex] >= 0 ? q.options[answers[qIndex]] : '未作�?}
                    </p>
                    <p className="text-sm text-green-700 mt-0.5">
                      正确答案：{q.options[q.correctIndex]}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{q.explanation}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!passed && relatedModules.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-sm text-blue-900 font-medium">建议复习以下模块�?/p>
            <div className="flex flex-wrap gap-2 mt-2">
              {relatedModules.map((modId) => {
                const mod = modId ? { measurement: '📏 智能马桶测量与判�?, 'order-flags': '🚩 订单旗帜颜色与操�?, installation: '🏠 安装单流程与更换规则', 'after-sales-report': '🔧 售后上报流程' }[modId] : null;
                return mod ? (
                  <Button
                    key={modId}
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/training/${modId}`)}
                    className="text-blue-900 border-sky-200 hover:bg-slate-100"
                  >
                    {mod}
                  </Button>
                ) : null;
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {!passed && (
            <Button onClick={handleRetry} className="gap-2 bg-blue-900 hover:bg-blue-900 text-white">
              <RotateCcw className="w-4 h-4" /> 重新考核
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push('/training')}>
            返回培训路径
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/training')} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> 返回
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">🎯 综合情景考核</h1>
          <p className="text-sm text-gray-500">Day3 · 共{examQuestions.length}�?· 80分通过</p>
        </div>
        <div className="text-sm text-gray-500">
          {currentQ + 1} / {examQuestions.length}
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-blue-800 transition-all duration-300"
          style={{ width: `${((currentQ + (showResult ? 1 : 0)) / examQuestions.length) * 100}%` }}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            {currentQ + 1}
          </div>
          <p className="text-base font-medium text-gray-900 pt-1">{question.question}</p>
        </div>

        <div className="space-y-3">
          {question.options.map((opt, i) => {
            const isSelected = answers[currentQ] === i;
            const isCorrectOpt = i === question.correctIndex;
            let optClass = 'border-gray-200 hover:border-sky-200 hover:bg-sky-50';
            if (showResult) {
              if (isCorrectOpt) optClass = 'border-green-400 bg-green-50';
              else if (isSelected && !isCorrectOpt) optClass = 'border-red-400 bg-red-50';
            }
            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={showResult}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-colors ${optClass}`}
              >
                <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt}
                {showResult && isCorrectOpt && <CheckCircle2 className="w-4 h-4 text-green-600 inline ml-2" />}
                {showResult && isSelected && !isCorrectOpt && <XCircle className="w-4 h-4 text-red-600 inline ml-2" />}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className={`mt-4 rounded-lg px-4 py-3 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className={`text-sm font-medium ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
              {isCorrect ? '👍 正确�? : '�?答错�?}
            </p>
            <p className={`text-sm mt-1 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {question.explanation}
            </p>
          </div>
        )}

        {showResult && (
          <div className="mt-5 flex justify-end">
            <Button
              onClick={handleNext}
              className="bg-gradient-to-r from-sky-400 to-blue-800 hover:from-blue-900 hover:to-blue-950 text-white"
            >
              {currentQ < examQuestions.length - 1 ? '下一�? : '提交考核'}
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-2">
        {examQuestions.map((_, i) => {
          const answered = answers[i] >= 0;
          const correct = answers[i] === examQuestions[i].correctIndex;
          return (
            <button
              key={i}
              onClick={() => { setCurrentQ(i); setShowResult(answers[i] >= 0); }}
              className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                i === currentQ ? 'ring-2 ring-sky-400 ring-offset-2' : ''
              } ${answered ? (correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-200 text-gray-500'}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
