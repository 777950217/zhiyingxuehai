'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ArrowRight, Loader2, Briefcase } from 'lucide-react';

interface IndustryProfileData {
  complaint_types?: string[];
  after_sales_scenarios?: string[];
  cost_pain_points?: string[];
  script_directions?: string[];
  management_challenges?: string[];
  raw?: string[];
}

interface IndustryInsightCardProps {
  /** 当前课程主题，用于AI生成行业视角 */
  topic: string;
  /** 额外的上下文描述（可选） */
  context?: string;
}

export function IndustryInsightCard({ topic, context }: IndustryInsightCardProps) {
  const { profile } = useAuth();
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [industryData, setIndustryData] = useState<IndustryProfileData | null>(null);
  const [industryMeta, setIndustryMeta] = useState<{ industry: string; main_product: string; material: string; team_size: string } | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  // 检查用户是否有行业档案
  const checkProfile = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const res = await fetch(`/api/industry-profile?user_id=${profile.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.profile_data) {
          setIndustryData(data.data.profile_data as IndustryProfileData);
          setIndustryMeta({
            industry: data.data.industry || '',
            main_product: data.data.main_product || '',
            material: data.data.material || '',
            team_size: data.data.team_size || '',
          });
          setHasProfile(true);
        } else if (data.data) {
          // 有记录但AI还没生成完
          setHasProfile(true);
        } else {
          setHasProfile(false);
        }
      }
    } catch {
      setHasProfile(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    checkProfile();
  }, [checkProfile]);

  // 如果已完成档案且有profile_data，自动生成行业视角
  useEffect(() => {
    if (hasProfile === true && industryData && !insight && !loading) {
      generateInsight(industryData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProfile, industryData]);

  // 强制刷新：重新检查档案，如果数据为空则触发重新生成
  const handleRefresh = async () => {
    setInsight('');
    setLoading(true);
    
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch(`/api/industry-profile?user_id=${profile.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.profile_data) {
          setIndustryData(data.data.profile_data as IndustryProfileData);
          setIndustryMeta({
            industry: data.data.industry || '',
            main_product: data.data.main_product || '',
            material: data.data.material || '',
            team_size: data.data.team_size || '',
          });
          setHasProfile(true);
          // 有数据则生成行业视角
          generateInsight(data.data.profile_data as IndustryProfileData);
        } else if (data.data) {
          // 有记录但AI还没生成完，触发重新生成
          setHasProfile(true);
          setIndustryData(null);
          // 调用PATCH触发重新生成
          const patchRes = await fetch('/api/industry-profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: profile.id,
              industry: data.data.industry,
              mainProduct: data.data.main_product,
              material: data.data.material,
              teamSize: data.data.team_size,
            }),
          });
          if (patchRes.ok) {
            // 等待3秒后重新检查
            setTimeout(() => {
              checkProfile();
            }, 3000);
          }
          setLoading(false);
        } else {
          setHasProfile(false);
          setLoading(false);
        }
      } else {
        setHasProfile(false);
        setLoading(false);
      }
    } catch {
      setHasProfile(false);
      setLoading(false);
    }
  };

  const generateInsight = async (data: IndustryProfileData) => {
    if (!profile?.id) return;
    setLoading(true);

    try {
      const industryName = industryMeta?.industry || profile.industry || '未知行业';
      const mainProduct = industryMeta?.main_product || '';
      const materialInfo = industryMeta?.material || '';
      const teamSize = industryMeta?.team_size || profile.teamSize || '未知';
      const materialSuffix = materialInfo ? `（${materialInfo}）` : '';

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          prompt: `课程主题：${topic}${context ? '\n课程内容：' + context : ''}

用户行业：${industryName}，主营产品：${mainProduct}${materialSuffix}，团队规模：${teamSize}人
行业档案摘要：
- 常见客诉：${(data.complaint_types || []).slice(0, 3).join('、')}
- 售后场景：${(data.after_sales_scenarios || []).slice(0, 2).join('、')}
- 成本痛点：${(data.cost_pain_points || []).slice(0, 2).join('、')}

请用100-200字，说明「${topic}」这个方法在${industryName}行业里具体怎么用。${materialInfo ? `结合${materialInfo}材质特点。` : ''}要结合行业特点给出实操建议，不要泛泛而谈。`,
          systemPrompt: `你是一位${industryName}行业的资深客服管理顾问。请用通俗简洁的语言，结合用户行业特点，说明课程方法在该行业的具体应用。直接输出内容，不要加标题。`,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setInsight(result.data || result.content || result.text || '生成失败，请稍后重试');
      } else {
        setInsight('生成失败，请稍后重试');
      }
    } catch {
      setInsight('生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 未完成档案：显示引导
  if (hasProfile === false) {
    return (
      <Card className="border-dashed border-2 border-blue-200 bg-blue-50/50 mt-6">
        <CardContent className="p-6 text-center">
          <Briefcase className="w-10 h-10 text-blue-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            你的行业视角
          </h3>
          <p className="text-base text-gray-600 mb-4">
            完善行业档案，获取「{topic}」的专属行业解读
          </p>
          <Button
            onClick={() => { if (typeof window !== 'undefined') window.location.href = '/onboarding-industry'; }}
            className="bg-blue-700 hover:bg-blue-800 text-base gap-1"
          >
            完善行业档案
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 有档案但AI还在生成/已生成
  return (
    <Card className="mt-6 border-blue-100 bg-gradient-to-br from-blue-50 to-sky-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="w-5 h-5 text-blue-600" />
          你的行业视角
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-base text-gray-600">正在生成行业专属解读...</span>
          </div>
        ) : insight ? (
          <div className="space-y-3">
            <p className="text-base leading-relaxed text-gray-800">{insight}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="text-xs">
              重新生成
            </Button>
          </div>
        ) : !industryData ? (
          <div className="py-3">
            <p className="text-base text-gray-600 mb-2">AI正在为你生成行业档案，请稍后刷新页面查看。</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              刷新
            </Button>
          </div>
        ) : !industryData.complaint_types ? (
          <div className="py-3">
            <p className="text-base text-gray-600 mb-2">AI正在为你生成行业档案，请稍后刷新页面查看。</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              刷新
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <Button onClick={() => industryData && generateInsight(industryData)} className="bg-blue-700 hover:bg-blue-800">
              生成行业视角
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
