import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';

type TemplateType = 'standard' | 'data_review' | 'team_review';

async function verifyPersonalUser(request: NextRequest) {
  const supabase = getSupabaseClient();
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return { error: NextResponse.json({ error: '未授权' }, { status: 401 }) };

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { error: NextResponse.json({ error: '未授权' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'personal_user') {
    return { error: NextResponse.json({ error: '仅个人版用户可用' }, { status: 403 }) };
  }
  return { userId: user.id };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyPersonalUser(request);
    if (auth.error) return auth.error;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('personal_reports')
      .select('id, report_type, period, title, has_cda, created_at')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '查询失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function getStandardPrompt(type: 'weekly' | 'monthly', period: string): string {
  if (type === 'weekly') {
    return `你是"职盈学海"个人版报告助手，帮助客服主管写周报。

## 输出格式（严格遵守）

# 📊 周报：${period}

## 一、本周数据汇总
（列出各指标的周汇总和日均，附💡说明计算逻辑）

## 二、环比变化
（与上周对比，标注↑↓，附💡说明环比含义）

## 三、TOP3 问题
（列出本周最突出的3个问题，附💡说明为什么这3个最突出）

## 四、整改措施
（针对TOP3问题给出具体整改方案，附💡说明为什么这样做有效）

## 五、验证目标
（下周要达到的量化目标，附💡说明目标合理性）

## 六、下周计划
（3条具体行动计划）

## 七、需要支持事项
（需要老板/同事帮忙的事项）

## 八、本周复盘三问（AI基于数据自动回答）
1. 哪些做得好？→ 固化成习惯
2. 哪里出了问题？→ 定改进动作
3. 下周怎么避免？→ 更新自己的工作方法
💡 为什么要复盘三问？→ 不复盘=重复犯错，每周3分钟复盘能让你的管理能力持续提升

## 九、3分钟汇报句式
（一段可直接在会议上念的话，150字以内）

规则：
- 每个板块必须有💡人话解释，用"💡"标记
- 数据必须基于提供的真实数据，不要编造
- 问题要具体，不要泛泛而谈
- 整改措施要可执行，不要空话`;
  }
  return `你是"职盈学海"个人版报告助手，帮助客服主管写月报。

## 输出格式（严格遵守）

# 📊 月报：${period}

## 一、月度KPI
（转化率/差评率/响应时长，含同比环比，附💡说明每个指标的含义）

## 二、问题深度复盘
（按优先级列出TOP1-2问题，每个问题含：现象→数据佐证→根因分析→影响范围。附💡说明分析逻辑）

## 三、已完成整改
（本月做了哪些改进，效果如何，附💡说明效果验证方法）

## 四、下月量化目标
（3个可量化的改进目标，附💡说明目标依据）

## 五、需审批事项
（需要老板决定的2-3个事项）

## 六、月度复盘三问（AI基于数据自动回答）
1. 本月最大收获是什么？→ 记住有效方法
2. 本月最大教训是什么？→ 避免再犯
3. 下月最需要改进什么？→ 聚焦一个突破口
💡 管理六步法第5步：复盘不是自我批评，是找规律。规律找到了，下月就不用靠运气

## 七、SOP沉淀建议
AI根据本月数据和问题，提取2-3条可标准化的工作方法
💡 什么是SOP？→ Standard Operating Procedure，把经验变成流程，下次不用重新想

## 八、3分钟汇报句式
（一段可直接在会议上念的话，200字以内）

规则：
- 每个板块必须有💡人话解释
- 数据必须基于提供的真实数据，不要编造
- 复盘要深挖根因，不要停留在表面
- 目标要可量化可验证`;
}

function getDataReviewPrompt(type: 'weekly' | 'monthly', period: string, dataSummary: string): string {
  const periodLabel = type === 'weekly' ? '周' : '月';
  return `你是"职盈学海"个人版数据复盘助手，帮助客服主管做数据对比复盘。

用户提供的是本期和上期的对比数据，你需要重点分析数据变化趋势，找出变化原因，给出优化行动建议。

## 输出格式（严格遵守）

# 📊 数据复盘报告：${period}

## 一、核心数据概览
用表格列出本期关键指标，附💡人话解释每个指标的含义和管理价值

## 二、环比变化分析
逐个指标对比上${periodLabel}，标注变化方向和幅度：
- 🟢 改善指标：[指标名] ↑X%（简要说明改善可能原因）
- 🔴 恶化指标：[指标名] ↓X%（深入分析恶化原因）
- ⚪ 持平指标：[指标名] →（说明是否需要关注）

每个变化附💡人话解释"这个变化意味着什么"

## 三、异常指标预警
挑出变化超过10%的指标，深度分析：
- 异常指标名称 + 变化幅度
- 可能原因（至少2个假设）
- 建议验证方式
附💡说明"为什么这个指标异常要重视"

## 四、数据变化根因分析
找出最可能的2-3个根因，用5Why法分析：
- 现象 → 为什么 → 为什么 → 根因
附💡说明"找到根因才知道该改什么"

## 五、优化行动建议
针对每个根因，给出具体行动：
- 行动1：[做什么] → [预期效果] → [验证方式]
- 行动2：[做什么] → [预期效果] → [验证方式]
附💡说明"行动要可执行可验证"

## 六、下期重点监控指标
列出3个下${periodLabel}最需要盯的指标+目标值

## 七、3分钟汇报句式
（一段可直接在会议上念的话，150字以内）

以下是用户的数据：
${dataSummary}

规则：
- 每个板块必须有💡人话解释
- 数据必须基于提供的真实数据，不要编造
- 变化分析要深入，不要只说"上升了/下降了"
- 行动建议要具体可执行`;
}

function getTeamReviewPrompt(type: 'weekly' | 'monthly', period: string, dataSummary: string, teamDataStr: string): string {
  const periodLabel = type === 'weekly' ? '周' : '月';
  return `你是"职盈学海"个人版团队复盘助手，帮助客服主管做团队管理复盘。

用户提供了团队管理维度数据，你需要诊断团队问题，定位管理短板，制定改进计划。

## 输出格式（严格遵守）

# 📊 团队复盘报告：${period}

## 一、团队现状概览
基于团队数据，给出团队整体健康度评估：
- 人数配置是否合理
- 出勤率是否达标
- 新人上手是否顺利
- 培训进度是否正常
附💡人话解释"团队健康度看什么"

## 二、人员问题诊断
逐一分析：
1. 人数够不够？工作量是否合理？（基于接待量/人数算人效）
2. 出勤率是否影响业务？（低出勤率→排班问题/员工情绪问题）
3. 新人进度是否正常？（慢→培训体系问题/快→可能不扎实）
4. 员工情绪状态判断（结合客诉次数/出勤率综合分析）
附💡说明"人员问题是管理问题的放大镜"

## 三、管理短板定位
基于团队数据，判断管理短板在哪：
- 如果新人上手慢→培训体系需要优化
- 如果出勤率低→排班/激励/团队氛围需要调整
- 如果客诉多→质检/话术/流程需要加强
- 如果情绪低→沟通/激励/工作量分配需要改善
- 如果培训完成率低→培训计划需要重新设计
附💡说明"短板决定团队上限"

## 四、改进计划+时间节点
针对定位的管理短板，制定改进计划：
| 问题 | 改进动作 | 负责人 | 完成时间 | 验证标准 |
逐项列出，附💡说明"计划没有时间节点等于没计划"

## 五、团队能力提升建议
基于团队现状，给出能力提升方向：
- 短期（1${periodLabel}内）：紧急要补的能力
- 中期（1-3${periodLabel === '周' ? '周' : '月'}）：体系化提升方向
- 长期（3-6${periodLabel === '周' ? '周' : '月'}）：团队能力建设

## 六、3分钟汇报句式
（一段可直接向老板汇报团队情况的的话，150字以内）

以下是用户的业务数据：
${dataSummary}

以下是用户的团队数据：
${teamDataStr}

规则：
- 每个板块必须有💡人话解释
- 诊断要基于数据，不要泛泛而谈
- 改进计划必须有具体时间节点和验证标准
- 建议要可执行，不要空话`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyPersonalUser(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { type, period, template, manualData, teamData } = body as {
      type: 'weekly' | 'monthly';
      period: string;
      template?: TemplateType;
      manualData?: { current: Record<string, string>; previous: Record<string, string> };
      teamData?: Record<string, string>;
    };
    if (!type || !period) return NextResponse.json({ error: '缺少参数' }, { status: 400 });

    const templateType: TemplateType = template || 'standard';
    const supabase = getSupabaseClient();

    // Trial check
    const { count: reportCount } = await supabase
      .from('personal_reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId);

    const trialUsed = Math.min(reportCount ?? 0, 5);
    const trialRemaining = Math.max(0, 5 - trialUsed);

    // Build data summary
    let dataSummary = '';

    // For data_review template with manual data
    if (templateType === 'data_review' && manualData) {
      const { current, previous } = manualData;
      const fmtObj = (obj: Record<string, string>, label: string) => {
        const names: Record<string, string> = {
          visits: '接待量', avg_response_time: '平均响应时长(秒)',
          consultations: '咨询人数', orders: '成交人数',
          complaints: '差评数', conversion_rate: '转化率(%)', complaint_rate: '差评率(%)'
        };
        const items = Object.entries(obj).filter(([, v]) => v).map(([k, v]) => `${names[k] || k}: ${v}`).join('，');
        return items ? `${label}：${items}` : `${label}：未提供`;
      };
      dataSummary = fmtObj(previous, '上期数据') + '\n' + fmtObj(current, '本期数据');

      // Calculate changes
      const changeNames: Record<string, string> = {
        visits: '接待量', avg_response_time: '响应时长',
        conversion_rate: '转化率', complaint_rate: '差评率',
        consultations: '咨询人数', complaints: '差评数'
      };
      const changes: string[] = [];
      for (const key of Object.keys(changeNames)) {
        const c = parseFloat(current[key]);
        const p = parseFloat(previous[key]);
        if (!isNaN(c) && !isNaN(p) && p !== 0) {
          const pctVal = (c - p) / p * 100;
          const pct = pctVal.toFixed(1);
          changes.push(`${changeNames[key]}：${pctVal > 0 ? '+' : ''}${pct}%`);
        }
      }
      if (changes.length > 0) dataSummary += '\n环比变化：' + changes.join('，');
    } else if (templateType === 'team_review') {
      // For team review, use team data + any existing records
      const { data: records } = await supabase
        .from('personal_data_records')
        .select('*')
        .eq('user_id', auth.userId)
        .order('record_date', { ascending: true });

      if (records && records.length > 0) {
        dataSummary = records.map(r =>
          `${r.record_date}: 接待${r.visits}人 响应${r.avg_response_time}s 咨询${r.consultations}人 成交${r.orders}人 差评${r.complaints}条 转化率${r.conversion_rate}% 差评率${r.complaint_rate}%`
        ).join('\n');
      } else {
        dataSummary = '暂无业务数据录入';
      }
    } else {
      // Standard template - use database records
      const { data: records } = await supabase
        .from('personal_data_records')
        .select('*')
        .eq('user_id', auth.userId)
        .order('record_date', { ascending: true });

      if (!records || records.length === 0) {
        return NextResponse.json({ error: '暂无数据，请先录入工作数据' }, { status: 400 });
      }
      dataSummary = records.map(r =>
        `${r.record_date}: 接待${r.visits}人 响应${r.avg_response_time}s 咨询${r.consultations}人 成交${r.orders}人 差评${r.complaints}条 转化率${r.conversion_rate}% 差评率${r.complaint_rate}% 环比${r.mom_change > 0 ? '+' : ''}${r.mom_change}%`
      ).join('\n');
    }

    // Select prompt based on template
    let systemPrompt: string;
    if (templateType === 'data_review') {
      systemPrompt = getDataReviewPrompt(type, period, dataSummary);
    } else if (templateType === 'team_review') {
      const teamDataStr = teamData
        ? `团队人数: ${teamData.team_size || '未填写'}\n出勤率: ${teamData.attendance_rate || '未填写'}%\n新人上手进度: ${teamData.new_hire_progress || '未填写'}\n客诉次数: ${teamData.complaint_count || '未填写'}\n员工情绪状态: ${teamData.mood_status || '未填写'}\n培训完成率: ${teamData.training_completion || '未填写'}%`
        : '团队数据未提供';
      systemPrompt = getTeamReviewPrompt(type, period, dataSummary, teamDataStr);
    } else {
      systemPrompt = getStandardPrompt(type, period);
    }

    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: templateType === 'standard'
        ? `以下是我的工作数据：\n${dataSummary}`
        : `请根据以上数据生成本期${type === 'weekly' ? '周' : '月'}度${templateType === 'data_review' ? '数据复盘' : '团队复盘'}报告` },
    ];

    let fullResponse = '';
    const llmStream = client.stream(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.7,
    });

    for await (const chunk of llmStream) {
      if (chunk.content) {
        fullResponse += chunk.content.toString();
      }
    }

    if (!fullResponse) {
      return NextResponse.json({ error: '报告生成失败，请重试' }, { status: 500 });
    }

    // Save to database
    const templateLabels: Record<TemplateType, string> = {
      standard: '', data_review: '·数据复盘', team_review: '·团队复盘'
    };
    const title = `${type === 'weekly' ? '周报' : '月报'}${templateLabels[templateType]} ${period}`;
    const { data: report, error: insertError } = await supabase
      .from('personal_reports')
      .insert({
        user_id: auth.userId,
        report_type: type,
        period,
        title,
        content: fullResponse,
        has_cda: false,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ data: report, trialUsed: trialUsed + 1, trialRemaining: Math.max(0, trialRemaining - 1) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '报告生成失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
