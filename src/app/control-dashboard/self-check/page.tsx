'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Question {
  id: string;
  dimension: string;
  question: string;
}

interface Answer {
  questionId: string;
  value: 'yes' | 'no' | 'partial';
}

interface DimensionScore {
  name: string;
  score: number;
  maxScore: number;
}

const dimensions = [
  { id: 'foundation', name: '底盘度', color: '#3B82F6' },
  { id: 'rooted', name: '扎根度', color: '#10B981' },
  { id: 'discipline', name: '守线度', color: '#F59E0B' },
  { id: 'growth', name: '造血度', color: '#EF4444' },
  { id: 'quality', name: '定品度', color: '#8B5CF6' },
];

const questions: Question[] = [
  { id: 'f1', dimension: 'foundation', question: '是否建立了完善的客户档案管理体系？' },
  { id: 'f2', dimension: 'foundation', question: '是否有明确的售后服务流程规范？' },
  { id: 'f3', dimension: 'foundation', question: '是否定期进行服务质量评估？' },
  { id: 'f4', dimension: 'foundation', question: '是否建立了客户反馈收集机制？' },
  
  { id: 'r1', dimension: 'rooted', question: '是否深入了解客户真实需求？' },
  { id: 'r2', dimension: 'rooted', question: '是否与客户建立长期信任关系？' },
  { id: 'r3', dimension: 'rooted', question: '是否定期回访老客户？' },
  { id: 'r4', dimension: 'rooted', question: '是否了解客户行业特点和痛点？' },
  
  { id: 'd1', dimension: 'discipline', question: '是否严格遵守服务时间承诺？' },
  { id: 'd2', dimension: 'discipline', question: '是否规范使用服务话术？' },
  { id: 'd3', dimension: 'discipline', question: '是否按时完成工单处理？' },
  { id: 'd4', dimension: 'discipline', question: '是否遵守公司各项规章制度？' },
  
  { id: 'g1', dimension: 'growth', question: '是否主动学习新产品知识？' },
  { id: 'g2', dimension: 'growth', question: '是否提出过服务流程优化建议？' },
  { id: 'g3', dimension: 'growth', question: '是否成功转化过客户升级？' },
  { id: 'g4', dimension: 'growth', question: '是否获得过客户表扬或好评？' },
  
  { id: 'q1', dimension: 'quality', question: '服务态度是否始终保持专业友好？' },
  { id: 'q2', dimension: 'quality', question: '问题解决率是否达到目标要求？' },
  { id: 'q3', dimension: 'quality', question: '是否注重服务细节和客户体验？' },
  { id: 'q4', dimension: 'quality', question: '是否有持续改进服务质量的意识？' },
];

export default function SelfCheckPage() {
  const [answers, setAnswers] = useState<Record<string, Answer['value']>>({});
  const [showResults, setShowResults] = useState(false);
  const [dimensionScores, setDimensionScores] = useState<DimensionScore[]>([]);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase.from('self_check_results').select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          setCompleted(true);
        }
      } catch (err) {
        console.error('获取自检结果失败:', err);
      }
    };

    fetchResults();
  }, []);

  const handleAnswer = (questionId: string, value: Answer['value']) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const calculateScores = () => {
    const scores: DimensionScore[] = [];
    
    dimensions.forEach(dim => {
      const dimQuestions = questions.filter(q => q.dimension === dim.id);
      let score = 0;
      
      dimQuestions.forEach(q => {
        const answer = answers[q.id];
        if (answer === 'yes') score += 10;
        else if (answer === 'partial') score += 5;
      });
      
      scores.push({
        name: dim.name,
        score,
        maxScore: dimQuestions.length * 10,
      });
    });
    
    setDimensionScores(scores);
    setShowResults(true);
  };

  const getPercentage = (score: number, maxScore: number) => {
    return Math.round((score / maxScore) * 100);
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 80) return { grade: '优秀', color: 'text-green-600' };
    if (percentage >= 60) return { grade: '良好', color: 'text-blue-600' };
    if (percentage >= 40) return { grade: '一般', color: 'text-yellow-600' };
    return { grade: '待提升', color: 'text-red-600' };
  };

  const getRadarPath = () => {
    const centerX = 150;
    const centerY = 150;
    const radius = 100;
    const sides = 5;
    const angleStep = (Math.PI * 2) / sides;
    
    let path = '';
    
    dimensionScores.forEach((dim, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const percentage = getPercentage(dim.score, dim.maxScore) / 100;
      const x = centerX + radius * percentage * Math.cos(angle);
      const y = centerY + radius * percentage * Math.sin(angle);
      
      if (index === 0) {
        path = `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    });
    
    path += ' Z';
    return path;
  };

  const getAxisLines = () => {
    const centerX = 150;
    const centerY = 150;
    const radius = 100;
    const sides = 5;
    const angleStep = (Math.PI * 2) / sides;
    
    return dimensions.map((dim, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return { x, y, name: dim.name };
    });
  };

  const saveResults = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase.from('self_check_results').insert({
        user_id: 'user_001',
        user_name: '测试用户',
        check_date: new Date().toISOString().split('T')[0],
        dimension_scores: JSON.stringify(dimensionScores),
        total_score: dimensionScores.reduce((sum, dim) => sum + dim.score, 0),
        company_id: 'company_001',
      });

      if (error) throw error;

      setCompleted(true);
      alert('自检结果已保存！');
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    }
  };

  if (showResults) {
    const totalScore = dimensionScores.reduce((sum, dim) => sum + dim.score, 0);
    const totalMaxScore = dimensionScores.reduce((sum, dim) => sum + dim.maxScore, 0);
    const overallPercentage = getPercentage(totalScore, totalMaxScore);
    const overallGrade = getGrade(overallPercentage);

    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">自检清单</h1>
              <p className="text-slate-500 text-sm mt-1">五度自检结果分析</p>
            </div>
            <button
              onClick={() => {
                setShowResults(false);
                setAnswers({});
              }}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              重新测试
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="text-center">
                <div className={`text-5xl font-bold ${overallGrade.color}`}>{overallPercentage}</div>
                <div className="text-sm text-slate-500 mt-1">综合得分</div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${overallGrade.color}`}>{overallGrade.grade}</div>
                <div className="text-sm text-slate-500 mt-1">评级</div>
              </div>
              <button
                onClick={saveResults}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                保存结果
              </button>
            </div>

            <div className="flex justify-center mb-8">
              <svg width="300" height="300" viewBox="0 0 300 300">
                <g>
                  {[1, 0.75, 0.5, 0.25].map((scale, i) => (
                    <polygon
                      key={i}
                      points={getAxisLines().map(p => `${150 + 100 * scale * (p.x - 150) / 100},${150 + 100 * scale * (p.y - 150) / 100}`).join(' ')}
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="1"
                    />
                  ))}
                  {getAxisLines().map((p, i) => (
                    <line
                      key={i}
                      x1="150"
                      y1="150"
                      x2={p.x}
                      y2={p.y}
                      stroke="#E5E7EB"
                      strokeWidth="1"
                    />
                  ))}
                  <polygon
                    points={getAxisLines().map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="2"
                  />
                  <path
                    d={getRadarPath()}
                    fill="rgba(59, 130, 246, 0.2)"
                    stroke="#3B82F6"
                    strokeWidth="2"
                  />
                  {dimensionScores.map((dim, index) => {
                    const angle = index * (Math.PI * 2) / 5 - Math.PI / 2;
                    const percentage = getPercentage(dim.score, dim.maxScore) / 100;
                    const x = 150 + 100 * percentage * Math.cos(angle);
                    const y = 150 + 100 * percentage * Math.sin(angle);
                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="6"
                        fill="#3B82F6"
                        stroke="white"
                        strokeWidth="2"
                      />
                    );
                  })}
                  {getAxisLines().map((p, i) => (
                    <text
                      key={i}
                      x={p.x + (p.x > 150 ? 5 : -5)}
                      y={p.y}
                      textAnchor={p.x > 150 ? 'start' : 'end'}
                      dominantBaseline="middle"
                      className="text-sm fill-slate-600"
                    >
                      {p.name}
                    </text>
                  ))}
                </g>
              </svg>
            </div>

            <div className="grid grid-cols-5 gap-4">
              {dimensionScores.map((dim, index) => {
                const percentage = getPercentage(dim.score, dim.maxScore);
                const grade = getGrade(percentage);
                return (
                  <div key={index} className="bg-slate-50 rounded-xl p-4 text-center">
                    <div className="text-lg font-semibold text-slate-800 mb-2">{dim.name}</div>
                    <div className={`text-2xl font-bold ${grade.color}`}>{percentage}%</div>
                    <div className={`text-sm mt-1 ${grade.color}`}>{grade.grade}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">自检清单</h1>
          <p className="text-slate-500 text-sm mt-1">五度自检 - 全面评估服务能力</p>
        </div>

        <div className="grid grid-cols-5 gap-4 mb-6">
          {dimensions.map(dim => (
            <div key={dim.id} className="bg-white rounded-xl shadow-sm p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ backgroundColor: `${dim.color}20` }}>
                <span className="text-xl">{dim.name[0]}</span>
              </div>
              <div className="text-sm font-medium text-slate-800">{dim.name}</div>
            </div>
          ))}
        </div>

        {dimensions.map(dim => (
          <div key={dim.id} className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{dim.name}</h3>
            <div className="space-y-4">
              {questions.filter(q => q.dimension === dim.id).map(q => (
                <div key={q.id} className="border border-slate-200 rounded-lg p-4">
                  <p className="text-slate-700 mb-3">{q.question}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAnswer(q.id, 'yes')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        answers[q.id] === 'yes'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      是
                    </button>
                    <button
                      onClick={() => handleAnswer(q.id, 'partial')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        answers[q.id] === 'partial'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                      }`}
                    >
                      部分
                    </button>
                    <button
                      onClick={() => handleAnswer(q.id, 'no')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        answers[q.id] === 'no'
                          ? 'bg-red-600 text-white'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      否
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-center">
          <button
            onClick={calculateScores}
            disabled={Object.keys(answers).length !== questions.length}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            生成报告
          </button>
        </div>
      </div>
    </div>
  );
}