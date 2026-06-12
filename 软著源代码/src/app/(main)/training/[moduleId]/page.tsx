'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trainingModules } from '@/lib/training-data';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Circle, ChevronRight, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

function useTrainingProgress(profile: { id: string } | null) {
  const { authFetch } = useAuth();
  const [progress, setProgress] = useState<Record<string, { completed: boolean; timestamp: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) { setLoading(false); return; }
    authFetch(`/api/training-data?type=progress&userId=${profile.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          const mapped: Record<string, { completed: boolean; timestamp: number }> = {};
          data.data.forEach((r: { moduleId: string; currentStep: number; completed: boolean; completedAt: string | null }) => {
            if (r.completed) {
              const parts = r.moduleId.split('_step_');
              if (parts.length === 2) {
                mapped[r.moduleId] = { completed: true, timestamp: r.completedAt ? new Date(r.completedAt).getTime() : Date.now() };
              } else {
                mapped[r.moduleId] = { completed: true, timestamp: r.completedAt ? new Date(r.completedAt).getTime() : Date.now() };
              }
            }
          });
          setProgress(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile?.id]);

  const markCompleted = useCallback((key: string) => {
    setProgress((prev) => {
      const next = { ...prev, [key]: { completed: true, timestamp: Date.now() } };
      // Save to Supabase via API
      if (profile?.id) {
        authFetch('/api/training-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'progress', userId: profile.id, moduleId: key, completed: true }),
        }).catch(() => {});
      }
      return next;
    });
  }, [profile?.id]);

  return { progress, markCompleted, loading };
}

export default function TrainingModulePage() {
  const params = useParams();
  const router = useRouter();
  const { profile, authFetch } = useAuth();
  const moduleId = params.moduleId as string;
  const currentModule = trainingModules.find((m) => m.id === moduleId);

  const { progress, markCompleted } = useTrainingProgress(profile);
  const [activeStep, setActiveStep] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [quizConfirmed, setQuizConfirmed] = useState(false);

  useEffect(() => {
    if (currentModule) {
      const firstIncomplete = currentModule.steps.findIndex(
        (_, i) => !progress[`${currentModule.id}_step_${i}`]?.completed
      );
      setActiveStep(firstIncomplete >= 0 ? firstIncomplete : 0);
    }
  }, [currentModule, progress]);

  if (!currentModule || currentModule.steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">模块不存在</p>
      </div>
    );
  }

  const step = currentModule.steps[activeStep];
  const completedCount = currentModule.steps.filter((_, i) => progress[`${currentModule.id}_step_${i}`]?.completed).length;
  const totalSteps = currentModule.steps.length;
  const isStepCompleted = progress[`${currentModule.id}_step_${activeStep}`]?.completed ?? false;
  const allCompleted = completedCount >= totalSteps;

  const handleLearned = () => {
    if (step.quiz && !quizConfirmed) {
      return;
    }
    markCompleted(`${currentModule.id}_step_${activeStep}`);
    if (activeStep < totalSteps - 1) {
      setActiveStep(activeStep + 1);
      setQuizAnswer(null);
      setShowQuizResult(false);
      setQuizConfirmed(false);
    }
  };

  const handleQuizSubmit = () => {
    if (quizAnswer === null) return;
    setShowQuizResult(true);
    const isCorrect = quizAnswer === step.quiz!.correctIndex;
    if (isCorrect) {
      setQuizConfirmed(true);
    }
  };

  const handleQuizUnderstood = () => {
    setQuizConfirmed(true);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/training')} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> 返回
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{currentModule.icon} {currentModule.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${allCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-sky-400 to-blue-800'}`}
                style={{ width: `${(completedCount / totalSteps) * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-500">{completedCount}/{totalSteps}步</span>
          </div>
        </div>
        {allCompleted && (
          <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />已完成
          </span>
        )}
      </div>

      <div className="flex gap-6">
        {/* Left: Step directory */}
        <div className="w-56 flex-shrink-0 hidden lg:block">
          <div className="bg-white rounded-xl border border-gray-200 p-3 sticky top-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">学习步骤</h3>
            <div className="space-y-1">
              {currentModule.steps.map((s, i) => {
                const done = progress[`${currentModule.id}_step_${i}`]?.completed ?? false;
                const isActive = i === activeStep;
                return (
                  <button
                    key={s.id}
                    onClick={() => { setActiveStep(i); setQuizAnswer(null); setShowQuizResult(false); setQuizConfirmed(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                      isActive ? 'bg-sky-50 text-blue-950 font-medium' : done ? 'text-green-700 hover:bg-gray-50' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : isActive ? <ChevronRight className="w-4 h-4 text-sky-400 flex-shrink-0" /> : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                    <span className="truncate">{s.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Step content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {/* Step title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                {activeStep + 1}
              </div>
              <h2 className="text-lg font-bold text-gray-900">{step.title}</h2>
              {isStepCompleted && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">已学</span>
              )}
            </div>

            {/* Content */}
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line mb-6">
              {step.content.split('\n').map((line, i) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={i} className="font-semibold text-gray-900 mt-3">{line.replace(/\*\*/g, '')}</p>;
                }
                if (line.startsWith('- ')) {
                  return <p key={i} className="pl-4">{line}</p>;
                }
                if (line.match(/^\d+\./)) {
                  return <p key={i} className="pl-4">{line}</p>;
                }
                if (line.trim() === '') return <br key={i} />;
                return <p key={i}>{line.replace(/\*\*/g, '')}</p>;
              })}
            </div>

            {/* Highlight box */}
            {step.highlight && (
              <div className="border-l-4 border-sky-400 bg-sky-50 rounded-r-lg px-4 py-3 mb-6">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-blue-900 text-sm">重点提示</div>
                    <div className="text-sm text-blue-950 mt-0.5">{step.highlight}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick quiz */}
            {step.quiz && !isStepCompleted && (
              <div className="border border-gray-200 rounded-xl p-5 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">快速检验</h3>
                <p className="text-sm text-gray-700 mb-3">{step.quiz.question}</p>
                <div className="space-y-2 mb-4">
                  {step.quiz.options.map((opt, i) => {
                    const isSelected = quizAnswer === i;
                    const isCorrect = i === step.quiz!.correctIndex;
                    let optClass = 'border-gray-200 hover:border-sky-200 hover:bg-sky-50';
                    if (showQuizResult) {
                      if (isCorrect) optClass = 'border-green-400 bg-green-50';
                      else if (isSelected && !isCorrect) optClass = 'border-red-400 bg-red-50';
                    } else if (isSelected) {
                      optClass = 'border-sky-400 bg-sky-50';
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => { if (!showQuizResult) setQuizAnswer(i); }}
                        className={`w-full text-left px-4 py-2.5 rounded-lg border-2 text-sm transition-colors ${optClass}`}
                      >
                        <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                        {opt}
                        {showQuizResult && isCorrect && <span className="ml-2 text-green-600 font-bold">✓ 正确</span>}
                        {showQuizResult && isSelected && !isCorrect && <span className="ml-2 text-red-600 font-bold">✗</span>}
                      </button>
                    );
                  })}
                </div>
                {!showQuizResult ? (
                  <Button
                    onClick={handleQuizSubmit}
                    disabled={quizAnswer === null}
                    className="bg-blue-900 hover:bg-blue-900 text-white"
                  >
                    提交答案
                  </Button>
                ) : (
                  <div>
                    {quizAnswer === step.quiz.correctIndex ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-3">
                        <p className="text-sm text-green-800 font-medium">👍 正确！</p>
                        <p className="text-sm text-green-700 mt-1">{step.quiz.explanation}</p>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-3">
                        <p className="text-sm text-red-800 font-medium">❌ 答错了</p>
                        <p className="text-sm text-red-700 mt-1">正确做法：{step.quiz.explanation}</p>
                        <Button
                          onClick={handleQuizUnderstood}
                          size="sm"
                          className="mt-2 bg-blue-900 hover:bg-blue-900 text-white"
                        >
                          明白了
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action button */}
            {!isStepCompleted && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  {step.quiz && !quizConfirmed ? '请先完成快速检验' : `第 ${activeStep + 1} 步，共 ${totalSteps} 步`}
                </div>
                <Button
                  onClick={handleLearned}
                  disabled={step.quiz ? !quizConfirmed : false}
                  className="bg-gradient-to-r from-sky-400 to-blue-800 hover:from-blue-900 hover:to-blue-950 text-white gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  我学会了{activeStep < totalSteps - 1 ? '，下一步' : ''}
                  {activeStep < totalSteps - 1 && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            )}

            {/* Already completed step */}
            {isStepCompleted && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> 已完成
                </div>
                {activeStep < totalSteps - 1 && (
                  <Button
                    variant="outline"
                    onClick={() => { setActiveStep(activeStep + 1); setQuizAnswer(null); setShowQuizResult(false); setQuizConfirmed(false); }}
                    className="gap-1"
                  >
                    下一步 <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Module completion message */}
            {allCompleted && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <div className="text-4xl mb-2">🎉</div>
                <h3 className="text-lg font-bold text-green-800">模块学习完成！</h3>
                <p className="text-sm text-green-700 mt-1">你已经掌握了「{currentModule.name}」的全部内容</p>
                <Button
                  onClick={() => router.push('/training')}
                  className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                >
                  返回培训路径
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile step navigation */}
      <div className="lg:hidden flex gap-2 overflow-x-auto pb-2">
        {currentModule.steps.map((s, i) => {
          const done = progress[`${currentModule.id}_step_${i}`]?.completed ?? false;
          const isActive = i === activeStep;
          return (
            <button
              key={s.id}
              onClick={() => { setActiveStep(i); setQuizAnswer(null); setShowQuizResult(false); setQuizConfirmed(false); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive ? 'bg-blue-900 text-white' : done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {done ? '✓' : `${i + 1}`} {s.title.substring(0, 6)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
