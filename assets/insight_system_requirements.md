# 洞察推送系统开发任务

## 项目信息
- 项目ID: 7637779286912696326
- 项目名: 职盈学海SaaS系统

---

## 1. 新建Supabase表 insight_notifications

请在Supabase SQL编辑器执行以下建表语句：

```sql
CREATE TABLE IF NOT EXISTS insight_notifications (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id varchar(36) NOT NULL,
  user_id varchar(36),
  insight_type varchar(30) NOT NULL,
  title varchar(200) NOT NULL,
  summary text NOT NULL,
  detail jsonb DEFAULT '{}',
  priority varchar(10) DEFAULT 'normal',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_insight_company ON insight_notifications(company_id);
CREATE INDEX idx_insight_user ON insight_notifications(user_id);
CREATE INDEX idx_insight_unread ON insight_notifications(company_id, is_read) WHERE is_read = false;
ALTER TABLE insight_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members view insights" ON insight_notifications FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.company_id = insight_notifications.company_id));
CREATE POLICY "System insert insights" ON insight_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin manage insights" ON insight_notifications FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role IN ('enterprise_manager','enterprise_admin','admin','super_admin')));
NOTIFY pgrst, 'reload schema';
```

---

## 2. 新建API路由

### /src/app/api/insights/route.ts
实现以下功能：
- **GET**: 查询洞察列表
  - 参数: company_id, is_read(可选), page(默认1), size(默认20)
  - 返回: 洞察列表+总数+分页信息
- **POST**: 手动触发生成洞察
  - 参数: { company_id: string }
  - 调用 /api/insights/generate 接口
- **PATCH**: 标记已读
  - 参数: { id: string } 或 { ids: string[] }
  - 将指定洞察标记为已读

### /src/app/api/insights/generate/route.ts
实现洞察生成引擎，POST接口，接收 { company_id: string }：

**6种洞察类型及触发条件：**

1. **质检下滑 (quality_decline)**
   - 触发条件: 对比最近7天vs前7天质检评分，下降>10%
   - 从 quality_inspections 表计算评分

2. **KPI预警 (kpi_warning)**
   - 触发条件: KPI完成率<70%
   - 从 kpi_records 或类似表查询

3. **赔付飙升 (compensation_spike)**
   - 触发条件: 对比最近7天vs前7天赔付金额，上升>30%
   - 从 compensation_records 表计算

4. **规则变动 (rule_change)**
   - 触发条件: phrase_library中规则类目检测到新增条目
   - 从 phrase_library 表查询 category='规则' 的最近新增

5. **激励趋势 (incentive_trend)**
   - 触发条件: 正向激励使用率相比上周变化
   - 从 incentive_records 表计算正向激励占比

6. **学习停滞 (learning_stagnation)**
   - 触发条件: 团队中有员工7天学习进度无变化
   - 从 learning_progress 表查询停滞员工

**生成逻辑：**
- 先查询该company_id已有的今日未读洞察（同type同天不重复生成）
- 根据各数据表计算指标
- 只有超阈值才生成洞察，避免噪音
- 生成后写入insight_notifications表
- 返回生成的洞察列表

**返回格式：**
```json
{
  "success": true,
  "generated": [...洞察列表],
  "skipped": [...跳过的类型及原因]
}
```

---

## 3. 首页洞察卡片组件

创建组件: /src/components/insights/InsightCard.tsx

功能：
- 显示洞察卡片列表（最多3条）
- 未读洞察显示红点badge
- 点击卡片展开详情弹窗
- "查看全部"按钮跳转 /insights

创建组件: /src/components/insights/InsightDetailModal.tsx

功能：
- 洞察详情弹窗
- 显示类型图标、标题、摘要、详细内容
- 关闭按钮

### 修改首页文件，添加洞察卡片：

**个人版首页**: 在首页添加"个人洞察"卡片区域
**主管工作台首页**: 添加"团队洞察"卡片（显示质检下滑/KPI预警/学习停滞）
**老板看板首页**: 添加"经营洞察"卡片（显示赔付飙升/规则变动/激励趋势）

卡片样式：
- 圆角卡片设计
- 根据类型显示不同颜色图标：
  - 🔴 质检下滑/KPI预警/赔付飙升（红色-警告类）
  - 🟡 规则变动/激励趋势（黄色-关注类）
  - 🔵 学习停滞（蓝色-信息类）
- 未读状态显示红点

---

## 4. 洞察列表页面

新建: /src/app/(main)/insights/page.tsx

功能：
- 页面标题: "洞察中心"
- 洞察列表展示: 时间、类型(带图标)、标题、摘要、已读状态
- 筛选功能: 
  - 按类型筛选（下拉选择）
  - 按已读状态筛选（全部/未读/已读）
- 点击卡片查看详情弹窗
- 一键全部已读按钮
- 分页功能
- 仅主管/老板角色可见（通过路由守卫或权限检查）

详情弹窗使用 InsightDetailModal 组件。

---

## 5. 侧边栏入口

修改 app-shell.tsx 或对应的侧边栏配置文件：

- **主管角色**: 在"管控看板"菜单分组添加 "管理洞察" 菜单项
  - 图标: Lightbulb 或 BarChart
  - 路径: /insights
  
- **老板角色**: 在"驾驶舱"菜单分组添加 "经营洞察" 菜单项
  - 图标: LineChart 或 TrendingUp
  - 路径: /insights

- **Badge显示**: 在洞察菜单图标上显示未读数量badge
  - 从 /api/insights 获取未读数量
  - 未读数>0时显示红色圆点+数字

---

## 6. 工具函数

创建 /src/lib/insights.ts 工具库：

```typescript
// 洞察类型常量
export const INSIGHT_TYPES = {
  QUALITY_DECLINE: 'quality_decline',
  KPI_WARNING: 'kpi_warning',
  COMPENSATION_SPIKE: 'compensation_spike',
  RULE_CHANGE: 'rule_change',
  INCENTIVE_TREND: 'incentive_trend',
  LEARNING_STAGNATION: 'learning_stagnation',
} as const;

// 类型配置
export const INSIGHT_CONFIG = {
  [INSIGHT_TYPES.QUALITY_DECLINE]: {
    label: '质检下滑',
    icon: '🔴',
    color: 'red',
    category: 'warning',
  },
  [INSIGHT_TYPES.KPI_WARNING]: {
    label: 'KPI预警',
    icon: '🔴',
    color: 'red',
    category: 'warning',
  },
  [INSIGHT_TYPES.COMPENSATION_SPIKE]: {
    label: '赔付飙升',
    icon: '🔴',
    color: 'red',
    category: 'warning',
  },
  [INSIGHT_TYPES.RULE_CHANGE]: {
    label: '规则变动',
    icon: '🟡',
    color: 'yellow',
    category: 'attention',
  },
  [INSIGHT_TYPES.INCENTIVE_TREND]: {
    label: '激励趋势',
    icon: '🟡',
    color: 'yellow',
    category: 'attention',
  },
  [INSIGHT_TYPES.LEARNING_STAGNATION]: {
    label: '学习停滞',
    icon: '🔵',
    color: 'blue',
    category: 'info',
  },
};

// 根据角色获取可见洞察类型
export function getInsightTypesByRole(role: string): string[] {
  // ...实现
}
```

---

## 7. 验证要求

1. 执行建表SQL，确认表创建成功
2. 运行 npm run build 验证代码无错误
3. 测试 generate API 能正确返回洞察数据

---

## UI风格要求

- 保持现有项目风格
- 圆角卡片设计
- 渐变紫色按钮
- 使用 sonner toast 做提示
- 洞察类型颜色区分:
  - 警告类(红色): 质检下滑、KPI预警、赔付飙升
  - 关注类(黄色): 规则变动、激励趋势
  - 信息类(蓝色): 学习停滞

---

请按顺序完成以上开发任务，每步完成后汇报进度和结果。
