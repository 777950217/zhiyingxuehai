'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ALL_MODULES, type Module } from '@/lib/course-data';
import { Users, BookOpen, Trophy, TrendingUp } from 'lucide-react';

interface TeamMember {
  id: string;
  display_name: string;
  role: string;
}

interface ProgressRecord {
  user_id: string;
  lesson_id: string;
  learned: boolean;
  learned_at: string;
}

interface MemberProgress {
  id: string;
  name: string;
  role: string;
  learnedCount: number;
  totalLessons: number;
  percentage: number;
  currentModule: string;
  currentLesson: string;
  latestLearnedAt: string | null;
}

const TOTAL_LESSONS = 25;

function getModuleForLesson(lessonId: string): { moduleName: string; lessonName: string } | null {
  for (const mod of ALL_MODULES) {
    for (const lesson of mod.lessons) {
      if (lesson.id === lessonId) {
        return { moduleName: mod.name, lessonName: lesson.title };
      }
    }
  }
  return null;
}

function getLatestProgress(progressRecords: ProgressRecord[]): string | null {
  if (progressRecords.length === 0) return null;
  const sorted = [...progressRecords].sort((a, b) =>
    new Date(b.learned_at).getTime() - new Date(a.learned_at).getTime()
  );
  return sorted[0].learned_at;
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'enterprise_manager': return '主管';
    case 'enterprise_admin': return '管理�?;
    case 'staff': return '员工';
    default: return role;
  }
}

export default function TeamLearningProgressPage() {
  const { profile, session } = useAuth();
  const [members, setMembers] = useState<MemberProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token || !profile) return;

    const fetchData = async () => {
      try {
        const res = await fetch('/api/team-learning-progress', {
          headers: { authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }

        const teamMembers: TeamMember[] = data.members || [];
        const progressRecords: ProgressRecord[] = data.progress || [];

        // 按成员汇总进�?
        const memberProgressList: MemberProgress[] = teamMembers.map((member) => {
          const memberProgress = progressRecords.filter((p) => p.user_id === member.id);
          const learnedCount = memberProgress.length;
          const percentage = Math.round((learnedCount / TOTAL_LESSONS) * 100);

          // 找到当前学到哪一课（最后完成的课的下一课，或已完成全部�?
          let currentModule = '尚未开�?;
          let currentLesson = '-';
          if (learnedCount > 0) {
            // 找最后完成的�?
            const latestInfo = getModuleForLesson(
              memberProgress.sort((a, b) =>
                new Date(b.learned_at).getTime() - new Date(a.learned_at).getTime()
              )[0].lesson_id
            );
            if (latestInfo) {
              currentModule = latestInfo.moduleName;
              currentLesson = latestInfo.lessonName;
            }
          }

          return {
            id: member.id,
            name: member.display_name || '未知用户',
            role: member.role,
            learnedCount,
            totalLessons: TOTAL_LESSONS,
            percentage,
            currentModule,
            currentLesson,
            latestLearnedAt: getLatestProgress(memberProgress),
          };
        });

        // 按进度排序（高的在前�?
        memberProgressList.sort((a, b) => b.percentage - a.percentage);
        setMembers(memberProgressList);
      } catch (err) {
        setError('加载团队进度失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, profile]);

  // 统计数据
  const totalMembers = members.length;
  const avgProgress = totalMembers > 0
    ? Math.round(members.reduce((sum, m) => sum + m.percentage, 0) / totalMembers)
    : 0;
  const completedMembers = members.filter((m) => m.percentage >= 100).length;
  const activeMembers = members.filter((m) => m.percentage > 0 && m.percentage < 100).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400">加载团队学习进度...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">团队学习进度</h1>
        <p className="text-slate-500 mt-1">查看团队成员的课程学习情况，掌握培训进展</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-slate-500">团队人数</p>
                <p className="text-2xl font-bold text-slate-900">{totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-slate-500">平均进度</p>
                <p className="text-2xl font-bold text-slate-900">{avgProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm text-slate-500">学习�?/p>
                <p className="text-2xl font-bold text-slate-900">{activeMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-slate-500">已毕�?/p>
                <p className="text-2xl font-bold text-slate-900">{completedMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 团队成员进度列表 */}
      {members.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">暂无团队成员</p>
            <p className="text-slate-400 text-sm mt-1">添加团队成员后，即可查看学习进度</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">成员进度详情</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="border border-slate-100 rounded-lg p-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{member.name}</p>
                      <p className="text-xs text-slate-400">
                        {getRoleLabel(member.role)}
                        {member.latestLearnedAt && (
                          <> · 最近学�?{new Date(member.latestLearnedAt).toLocaleDateString('zh-CN')}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-700">{member.learnedCount}/{member.totalLessons}</p>
                    <Badge
                      variant={member.percentage >= 100 ? 'default' : member.percentage > 0 ? 'secondary' : 'outline'}
                      className={
                        member.percentage >= 100
                          ? 'bg-green-100 text-green-700'
                          : member.percentage > 0
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-50 text-slate-400'
                      }
                    >
                      {member.percentage >= 100 ? '已毕�? : member.percentage > 0 ? `${member.percentage}%` : '未开�?}
                    </Badge>
                  </div>
                </div>
                <Progress value={member.percentage} className="h-2" />
                {member.learnedCount > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <span className="text-slate-400">当前进度�?/span>
                    <span className="text-slate-700">{member.currentModule}</span>
                    <span className="text-slate-300">·</span>
                    <span>{member.currentLesson}</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 课程模块概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">课程模块概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ALL_MODULES.map((mod: Module) => (
              <div key={mod.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                  {mod.id}
                </div>
                <div>
                  <p className="font-medium text-slate-900 text-sm">{mod.name}</p>
                  <p className="text-xs text-slate-400">{mod.lessons.length}节课</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
