/**
 * 工具↔学习闭环映射
 * 工具页面 ↔ 相关课程 ↔ 实操引导
 */

export interface ToolCourseMapping {
  toolPath: string;
  toolName: string;
  courses: {
    lessonId: string;
    title: string;
    moduleId: string;
  }[];
  practiceLabel: string;
}

/** 工具 → 课程推荐映射 */
export const TOOL_COURSE_MAP: ToolCourseMapping[] = [
  {
    toolPath: '/my-quality',
    toolName: '质检管理',
    courses: [
      { lessonId: 'lesson-18', title: '质检不是找茬：5维质检入门', moduleId: 'business' },
    ],
    practiceLabel: '去质检实操',
  },
  {
    toolPath: '/kpi',
    toolName: 'KPI管理',
    courses: [
      { lessonId: 'lesson-6', title: 'KPI定标：从拍脑袋到算出来', moduleId: 'goal' },
      { lessonId: 'lesson-7', title: 'KPI分层：不是所有人背同一个指标', moduleId: 'goal' },
    ],
    practiceLabel: '去管理KPI',
  },
  {
    toolPath: '/cost-alert',
    toolName: '成本预警',
    courses: [
      { lessonId: 'lesson-19', title: '售后成本第一刀：识别隐形亏损', moduleId: 'business' },
    ],
    practiceLabel: '去设置成本预警',
  },
  {
    toolPath: '/my-schedule',
    toolName: '排班管理',
    courses: [
      { lessonId: 'lesson-16', title: '排班不是填格子', moduleId: 'team' },
    ],
    practiceLabel: '去排班实操',
  },
  {
    toolPath: '/training',
    toolName: '培训中心',
    courses: [
      { lessonId: 'lesson-15', title: '新人7天速成法', moduleId: 'team' },
    ],
    practiceLabel: '去培训管理',
  },
  {
    toolPath: '/templates',
    toolName: 'SOP模板',
    courses: [
      { lessonId: 'lesson-20', title: 'SOP不是写文档：让流程代替人', moduleId: 'business' },
    ],
    practiceLabel: '去创建SOP',
  },
  {
    toolPath: '/rules',
    toolName: '判断规则',
    courses: [
      { lessonId: 'lesson-5', title: '话术标准化：1份话术库抵3个老员工', moduleId: 'role' },
      { lessonId: 'lesson-13', title: '客服行为规范：从「别犯错」到「我知道怎么做」', moduleId: 'team' },
    ],
    practiceLabel: '去设置规则',
  },
];

/** 课程 → 工具实操引导映射 */
export interface CourseToolGuide {
  lessonId: string;
  tools: {
    path: string;
    name: string;
    label: string;
  }[];
}

export const COURSE_TOOL_MAP: CourseToolGuide[] = [
  {
    lessonId: 'lesson-6',
    tools: [{ path: '/kpi', name: 'KPI管理', label: '去制定KPI' }],
  },
  {
    lessonId: 'lesson-7',
    tools: [{ path: '/kpi', name: 'KPI管理', label: '去管理KPI' }],
  },
  {
    lessonId: 'lesson-16',
    tools: [{ path: '/my-schedule', name: '排班管理', label: '去排班实操' }],
  },
  {
    lessonId: 'lesson-15',
    tools: [{ path: '/training', name: '培训中心', label: '去培训管理' }],
  },
  {
    lessonId: 'lesson-18',
    tools: [{ path: '/my-quality', name: '质检管理', label: '去质检实操' }],
  },
  {
    lessonId: 'lesson-19',
    tools: [{ path: '/cost-alert', name: '成本预警', label: '去设置成本预警' }],
  },
  {
    lessonId: 'lesson-20',
    tools: [{ path: '/templates', name: 'SOP模板', label: '去创建SOP' }],
  },
  {
    lessonId: 'lesson-5',
    tools: [{ path: '/rules', name: '判断规则', label: '去设置规则' }],
  },
];

/** 根据工具路径获取相关课程 */
export function getCoursesForTool(path: string): ToolCourseMapping | undefined {
  return TOOL_COURSE_MAP.find((m) => path.startsWith(m.toolPath));
}

/** 根据课程ID获取工具实操引导 */
export function getToolsForCourse(lessonId: string): CourseToolGuide | undefined {
  return COURSE_TOOL_MAP.find((m) => m.lessonId === lessonId);
}

/** 质检分数连续下降→推荐课程 */
export function getQualityDeclineRecommendation(): { lessonId: string; title: string; moduleId: string } {
  return {
    lessonId: 'lesson-18',
    title: '质检不是找茬：5维质检入门',
    moduleId: 'business',
  };
}
