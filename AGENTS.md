# 卫浴客服管理系统 - 项目上下文

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4 (深海蓝主题)
- **Database**: Supabase (PostgreSQL)

## 项目概述

卫浴行业客服团队管理平台（客管家），管理企业信息、系统用户与客服团队成员，支持收款码支付订阅、培训阶段追踪、AI问题诊断等功能。

### 核心方法论：五度淬判体系

本系统产品自查体系采用「五度淬判体系」（原5层22项SaaS自检体系），5度22维度逐层淬判：

| 度 | 名称 | 核心关注 |
|----|------|----------|
| 第1度 | 底盘度 | 基础架构是否稳固，能不能跑 |
| 第2度 | 扎根度 | 用户粘性与留存，能不能留下 |
| 第3度 | 守线度 | 合规与安全底线，能不能守 |
| 第4度 | 造血度 | 商业模式与盈利能力，能不能赚 |
| 第5度 | 定品度 | 产品品质与差异化，值不值得上线 |

## 目录结构

```
├── public/
│   └── qrcodes/           # 收款码图片 (alipay.svg, wechat.svg)
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/
│   │   ├── (auth)/         # 认证路由组
│   │   │   ├── login/      # 登录页
│   │   │   └── register/   # 注册页
│   │   ├── (main)/         # 业务路由组
│   │   │   ├── api/        # API 路由
│   │   │   │   ├── dashboard/     # 仪表盘统计接口
│   │   │   │   ├── companies/     # 企业 CRUD 接口
│   │   │   │   ├── users/         # 用户 CRUD 接口
│   │   │   │   ├── agents/        # 客服 CRUD 接口
│   │   │   │   ├── auth/          # 认证接口 (config/profile/register)
│   │   │   │   ├── product-profile/  # 产品档案接口
│   │   │   │   ├── sop-templates/    # SOP流程模板接口
│   │   │   │   ├── ai/             # AI助手接口
│   │   │   │   ├── payment-orders/  # 付款订单接口
│   │   │   │   │   ├── route.ts     # GET列表/POST创建
│   │   │   │   │   ├── [id]/route.ts # PATCH确认/拒绝/上传截图
│   │   │   │   │   └── upload/route.ts # POST截图上传
│   │   │   │   └── daily-data/      # 通用数据接口(subscriptions/recharge_logs)
│   │   │   ├── companies/  # 企业管理页面
│   │   │   ├── users/      # 用户管理页面
│   │   │   ├── agents/     # 客服管理页面
│   │   │   ├── diagnosis/  # 问题诊断页面
│   │   │   ├── quick-phrases/ # 标准话术库页面
│   │   │   ├── product-knowledge/ # 产品知识库页面
│   │   │   ├── training/   # 培训中心页面（含操作流程SOP Tab）
│   │   │   ├── kpi/        # KPI管理页面
│   │   │   ├── membership/ # 会员管理页面（收款码支付弹窗）
│   │   │   ├── ai-assistant/ # AI助手页面（基础版5次限制）
│   │   │   ├── daily-trends/ # 趋势日报页面
│   │   │   ├── product-profile/ # 产品档案页面
│   │   │   ├── cost-alert/ # 成本预警页面
│   │   │   ├── work-orders/ # 工单管理页面
│   │   │   ├── customer-records/ # 客户记录页面
│   │   │   ├── rules/      # 行业判断规则页面
│   │   │   ├── admin/      # 管理员后台（含待确认订单）
│   │   │   ├── consultant/ # 顾问后台
│   │   │   ├── help/       # 帮助中心
│   │   │   ├── notifications/ # 通知页面
│   │   │   ├── practice/   # 每日一练页面
│   │   │   ├── learning-profile/ # 学习档案页面
│   │   │   ├── knowledge-qa/ # 知识问答页面
│   │   │   ├── onboarding/  # 新手引导页面
│   │   │   └── onboarding-flow/ # 入职流程页面
│   │   ├── layout.tsx      # 根布局
│   │   └── page.tsx        # 仪表盘首页
│   ├── components/
│   │   ├── ui/             # Shadcn UI 组件库
│   │   ├── app-shell.tsx   # 全局侧边栏布局（深海蓝+全菜单+Lock+试用横幅）
│   │   ├── onboarding-tour.tsx # 首次引导组件
│   │   └── permission-locked.tsx # 权限锁定组件
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   │   ├── auth-context.tsx # 认证上下文（含planEnd/trialEndAt）
│   │   └── supabase-browser.ts # 浏览器端Supabase客户端
│   └── storage/database/   # Supabase 数据库
│       ├── shared/schema.ts        # Drizzle 表结构定义
│       └── supabase-client.ts      # Supabase 客户端
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 数据库模型

### companies (企业表)
- 字段: id, name, industry, team_size, contact_name, contact_phone, plan, plan_start, plan_end, trial_end_at, ai_credits_remaining, service_level, seat_limit, seat_used, status, created_at, updated_at
- plan 可选值: basic, pro, flagship
- service_level 可选值: self, standard, premium
- status 可选值: active, expired, paused
- seat_limit/seat_used: 座位管理 (basic=1, pro=5, flagship=15)
- trial_end_at: 专业版试用到期时间 (注册后3天)

### users (用户表)
- 字段: id, company_id(FK), email(unique), password_hash, display_name, role, user_type, ai_credits_remaining, status, last_login_at, created_at, updated_at
- role 可选值: admin, enterprise_admin, enterprise_manager, staff
- user_type 可选值: small, manager, premium
- status 可选值: active, suspended, deleted

### agents (客服表)
- 字段: id, company_id(FK), name, employee_id, hire_date, position, training_stage, status, created_at, updated_at
- position 可选值: 售中客服, 售后客服, 组长, 主管
- training_stage 可选值: 基础, 售中, 售后, 进阶, 独立上岗
- status 可选值: 在职, 离职, 试用

### payment_orders (付款订单表)
- 字段: id, company_id, user_id, order_no, plan, amount, period, payment_method, screenshot_url, status, remark, confirmed_by, confirmed_at, created_at
- status 流转: pending → paid → confirmed/rejected
- plan 可选值: basic, pro, flagship
- period 可选值: monthly, quarterly, semiannual
- payment_method: alipay, wechat

### sop_templates (SOP流程模板表)
- 字段: id, company_id(FK), category, name, scenario, steps_json, role, is_preset, needs_update, version, updated_by, created_at, updated_at

## API 接口

| 路径 | 方法 | 说明 |
|------|------|------|
| /api/dashboard | GET | 仪表盘统计数据 |
| /api/companies | GET/POST | 企业列表/创建 |
| /api/companies/[id] | GET/PUT/DELETE | 企业详情/更新/删除 |
| /api/users | GET/POST | 用户列表/创建 |
| /api/users/[id] | GET/PUT/DELETE | 用户详情/更新/删除 |
| /api/agents | GET/POST | 客服列表/创建 |
| /api/agents/[id] | GET/PUT/DELETE | 客服详情/更新/删除 |
| /api/sop-templates | GET/POST | SOP列表/创建 |
| /api/sop-templates/[id] | GET/PUT/DELETE | SOP详情/更新/删除 |
| /api/product-profile | GET/PUT | 产品档案读取/保存 |
| /api/auth/config | GET | Supabase浏览器端配置 |
| /api/auth/profile | GET | 当前用户Profile（含planEnd/trialEndAt） |
| /api/auth/register | POST | 注册新用户（含3天专业版试用） |
| /api/payment-orders | GET/POST | 付款订单列表/创建 |
| /api/payment-orders/[id] | PATCH | 订单操作：上传截图/确认/拒绝 |
| /api/payment-orders/upload | POST | 付款截图上传（Supabase Storage） |

## 套餐与定价

| 套餐 | 月价 | 座位 | 试用 | 角色 |
|------|------|------|------|------|
| 基础版 | ¥19.9/月 | 1人 | AI 5次免费体验 | staff |
| 专业版 | ¥149/月 | 5人 | 3天全功能试用 | enterprise_manager |
| 旗舰版 | ¥299/月+陪跑费 | 15人 | 咨询顾问 | enterprise_admin |

- 季付95折，半年付9折
- 管理员确认订单时自动升级角色和座位

## 权限锁定机制

- 全菜单可见，锁定项显示Lock图标 + text-white/70
- staff 锁定: rules, kpi, work-orders, customer-records, cost-alert, admin, consultant
- enterprise_manager 锁定: admin, consultant
- 试用到期 enterprise_manager 额外锁定: rules, kpi, work-orders, customer-records, cost-alert, training
- PermissionLocked组件：Lock图标 + 提示文案 + 返回首页/了解升级方案

## 深海蓝配色体系

- --primary: oklch(0.35 0.15 250) 深海蓝
- --accent: oklch(0.75 0.15 220) 科技青
- 侧边栏: bg-blue-950, 选中态sky-400
- 替换规则: orange-500/600→blue-800/900, orange-400→sky-400, orange-100→blue-50

## 包管理规范

**仅允许使用 pnpm**，严禁 npm 或 yarn。

## 开发规范

- TypeScript strict 模式，禁止隐式 any
- 字段名使用 snake_case (Supabase SDK 直接使用数据库列名)
- Supabase 操作必须检查 `{ data, error }`，error 必须 throw
- .delete() / .update() 必须带 filter
- RLS 已启用，后端使用 service_role_key 绕过

## 常用命令

- 开发: `pnpm dev` (端口 5000)
- 构建: `pnpm build`
- 类型检查: `pnpm ts-check`
- 代码检查: `pnpm lint`
