const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// 创建输出目录
const outputDir = '/workspace/projects/软著材料/职盈学海客服管理软件V1.0';

// 源代码PDF生成
async function generateSourceCodePDF() {
  console.log('开始生成源代码PDF...');
  
  // 读取所有源代码文件
  const sourceDir = '/workspace/projects/软著源代码/src';
  const files = [];
  
  function collectFiles(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        collectFiles(fullPath);
      } else if (item.name.match(/\.(ts|tsx|js|jsx|css)$/)) {
        files.push(fullPath);
      }
    }
  }
  
  collectFiles(sourceDir);
  files.sort();
  
  console.log(`找到 ${files.length} 个源代码文件`);
  
  // 合并所有代码
  let allCode = '';
  for (const file of files) {
    const relativePath = file.replace('/workspace/projects/软著源代码/', '');
    const content = fs.readFileSync(file, 'utf-8');
    allCode += `\n// ========== ${relativePath} ==========\n`;
    allCode += content;
    allCode += '\n';
  }
  
  // 分页：每页约50行
  const lines = allCode.split('\n');
  const linesPerPage = 50;
  const totalPages = Math.ceil(lines.length / linesPerPage);
  
  console.log(`总行数: ${lines.length}, 总页数: ${totalPages}`);
  
  // 取前30页+后30页
  const frontPages = 30;
  const backPages = 30;
  
  let selectedLines = [];
  
  if (totalPages <= 60) {
    // 不足60页，全部提交
    selectedLines = lines;
  } else {
    // 前30页
    const frontLines = lines.slice(0, frontPages * linesPerPage);
    // 后30页
    const backLines = lines.slice((totalPages - backPages) * linesPerPage);
    selectedLines = [...frontLines, ...backLines];
  }
  
  console.log(`选中 ${selectedLines.length} 行代码`);
  
  // 创建PDF
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 60, bottom: 40, left: 50, right: 50 }
  });
  
  doc.pipe(fs.createWriteStream(path.join(outputDir, '源代码.pdf')));
  
  // 注册中文字体
  try {
    doc.font('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc');
  } catch (e) {
    console.log('使用默认字体');
  }
  
  // 页眉
  const header = '职盈学海电商客服管理系统V1.0 源程序代码';
  let currentPage = 1;
  let lineIndex = 0;
  
  while (lineIndex < selectedLines.length) {
    // 添加页眉
    doc.fontSize(10).text(header, { align: 'center' });
    doc.moveDown(0.5);
    
    // 添加当前页的代码
    for (let i = 0; i < linesPerPage && lineIndex < selectedLines.length; i++, lineIndex++) {
      const line = selectedLines[lineIndex];
      // 处理中文和代码混合
      doc.fontSize(8).text(line || ' ', {
        continued: false,
        lineBreak: false
      });
    }
    
    // 添加页码
    doc.fontSize(8).text(`第 ${currentPage} 页`, { align: 'center' });
    
    // 新页面
    if (lineIndex < selectedLines.length) {
      doc.addPage();
      currentPage++;
    }
  }
  
  doc.end();
  console.log(`源代码PDF生成完成，共 ${currentPage} 页`);
}

// 设计说明书PDF生成
async function generateManualPDF() {
  console.log('开始生成设计说明书PDF...');
  
  // 说明书内容
  const content = generateManualContent();
  
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 60, bottom: 40, left: 50, right: 50 }
  });
  
  doc.pipe(fs.createWriteStream(path.join(outputDir, '软件设计说明书-完整版.pdf')));
  
  try {
    doc.font('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc');
  } catch (e) {}
  
  const lines = content.split('\n');
  let currentPage = 1;
  const linesPerPage = 45;
  let lineIndex = 0;
  
  const header = '职盈学海电商客服管理系统V1.0 软件设计说明书';
  
  while (lineIndex < lines.length) {
    doc.fontSize(10).text(header, { align: 'center' });
    doc.moveDown(0.5);
    
    for (let i = 0; i < linesPerPage && lineIndex < lines.length; i++, lineIndex++) {
      const line = lines[lineIndex];
      if (line.startsWith('# ')) {
        doc.fontSize(14).text(line.substring(2), { bold: true });
      } else if (line.startsWith('## ')) {
        doc.fontSize(12).text(line.substring(3), { bold: true });
      } else if (line.startsWith('### ')) {
        doc.fontSize(11).text(line.substring(4), { bold: true });
      } else {
        doc.fontSize(9).text(line || ' ');
      }
    }
    
    doc.fontSize(8).text(`第 ${currentPage} 页`, { align: 'center' });
    
    if (lineIndex < lines.length) {
      doc.addPage();
      currentPage++;
    }
  }
  
  doc.end();
  console.log(`设计说明书PDF生成完成，共 ${currentPage} 页`);
}

function generateManualContent() {
  return `
# 职盈学海电商客服管理系统V1.0
# 软件设计说明书

## 第一章 概述

### 1.1 项目背景

随着电商行业的快速发展，客服团队的管理与培训成为企业核心竞争力的重要组成部分。传统的客服管理方式存在效率低下、培训周期长、质量难以量化等问题。本系统旨在通过数字化手段解决这些痛点，提升客服团队整体效能。

电商客服作为企业与消费者沟通的重要桥梁，其服务质量直接影响用户体验和品牌形象。然而，传统客服管理面临诸多挑战：人员流动性大导致培训成本高、服务质量参差不齐、绩效评估缺乏量化标准、知识传承困难等。

本系统通过数字化、智能化的方式，帮助电商企业实现客服团队的精细化管理，提升整体服务水平和运营效率。

### 1.2 系统目标

本系统主要实现以下目标：

1. 实现客服团队的全生命周期管理
   - 从入职到离职的完整档案管理
   - 培训进度追踪与能力评估
   - 职业发展路径规划

2. 提供智能化的培训与考核体系
   - 结构化课程体系
   - 分阶段培训追踪
   - KPI量化考核

3. 构建知识库与话术库支撑体系
   - 产品知识库
   - 标准话术库
   - 行业知识库

4. 提供数据分析与决策支持
   - 实时数据仪表盘
   - 趋势分析报告
   - 问题诊断预警

5. 支持多角色协作与权限管理
   - 多级权限控制
   - 跨部门协作
   - 操作审计追踪

### 1.3 适用范围

本系统适用于电商企业的客服团队管理，支持以下角色：

- 企业管理员：系统配置与全局管理
  - 企业信息管理
  - 套餐订阅管理
  - 数据统计分析
  
- 客服主管：团队管理与考核评估
  - 团队成员管理
  - 培训任务分配
  - KPI考核执行
  
- 客服人员：日常学习与工作记录
  - 课程学习
  - 话术查阅
  - 问题诊断

### 1.4 文档范围

本设计说明书涵盖系统的以下方面：
- 系统整体架构设计
- 功能模块详细设计
- 数据库结构设计
- 接口规范设计
- 安全机制设计
- 性能优化设计
- 测试与部署方案

## 第二章 系统架构

### 2.1 技术架构

本系统采用现代化全栈技术架构，充分利用云计算和微服务理念。

前端技术栈：
- Next.js 16（App Router）：服务端渲染框架
- React 19：用户界面库
- TypeScript 5：类型安全开发
- Tailwind CSS 4：原子化CSS框架
- shadcn/ui组件库：高质量UI组件

后端技术栈：
- Next.js API Routes：服务端API
- Supabase（PostgreSQL）：云数据库服务
- Drizzle ORM：类型安全ORM

技术选型优势：
1. 全栈JavaScript/TypeScript，降低学习成本
2. 服务端渲染提升首屏性能和SEO
3. 类型安全减少运行时错误
4. 云服务降低运维成本

### 2.2 系统架构图

系统采用经典的三层架构设计：

表现层（Presentation Layer）：
- Web用户界面
- 移动端适配界面
- 第三方集成接口

业务层（Business Layer）：
- 用户认证服务
- 业务逻辑处理
- 数据校验转换
- 消息推送服务

数据层（Data Layer）：
- 关系型数据库
- 对象存储服务
- 缓存服务
- 日志存储

### 2.3 模块架构

系统按功能划分为以下核心模块：

核心模块：
1. 认证授权模块（Auth）
2. 用户管理模块（User）
3. 客服管理模块（Agent）
4. 培训中心模块（Training）
5. 考核评估模块（KPI）
6. 知识库模块（Knowledge）
7. AI助手模块（AI）
8. 数据分析模块（Analytics）

支撑模块：
1. 文件存储模块
2. 消息通知模块
3. 日志审计模块
4. 定时任务模块

### 2.4 部署架构

系统支持云端部署，采用容器化部署方式：

生产环境：
- 应用服务器集群
- 数据库主从复制
- 对象存储服务
- CDN加速服务

开发环境：
- 本地开发服务器
- 开发数据库
- 模拟服务

部署流程：
1. 代码构建打包
2. 镜像构建推送
3. 服务滚动更新
4. 健康检查验证

## 第三章 功能模块设计

### 3.1 仪表盘模块

仪表盘是系统的核心入口，为用户提供数据概览和快捷操作。

功能说明：
1. 关键指标概览
   - 团队人数统计
   - 培训完成率
   - 考核平均分
   - 问题处理量

2. 待办事项提醒
   - 待处理工单
   - 待审核内容
   - 即将到期任务
   - 系统通知

3. 数据趋势图表
   - 服务质量趋势
   - 培训进度曲线
   - 考核成绩分布
   - 工单处理统计

4. 快捷操作入口
   - 快速创建工单
   - 快速发起考核
   - 快速查看报告

界面设计：
- 响应式布局适配不同屏幕
- 卡片式信息展示
- 可拖拽排序
- 数据实时刷新

### 3.2 客服管理模块

客服管理模块实现客服人员的信息管理和状态追踪。

功能列表：
1. 客服信息管理
   - 基本信息录入
   - 信息编辑修改
   - 头像上传管理
   - 批量导入导出

2. 培训阶段追踪
   - 入职培训阶段
   - 岗前培训阶段
   - 在岗提升阶段
   - 独立上岗判定

3. 状态管理
   - 在职状态
   - 试用状态
   - 离职状态
   - 状态变更记录

4. 职位管理
   - 售中客服
   - 售后客服
   - 组长
   - 主管

数据字段设计：
- 基本信息：姓名、工号、入职日期
- 岗位信息：职位、所属团队、汇报对象
- 培训信息：培训阶段、完成课程、考核成绩
- 状态信息：在职状态、创建时间、更新时间

### 3.3 培训中心模块

培训中心是系统的核心功能模块，支撑客服人员的成长发展。

课程管理功能：
1. 课程创建与编辑
   - 课程基本信息
   - 课程内容编排
   - 封面图片上传
   - 发布状态管理

2. 课时安排
   - 课时内容编辑
   - 学习时长设置
   - 必修选修标记
   - 课时排序

3. 案例关联
   - 实战案例绑定
   - 案例解析说明
   - 相关知识链接

4. 学习资料
   - 文档资料上传
   - 视频资料管理
   - 外部链接引用

学习追踪功能：
1. 学习进度记录
   - 课程完成进度
   - 课时学习状态
   - 学习时长统计

2. 完成率统计
   - 个人完成率
   - 团队完成率
   - 分类完成率

3. 成绩评定
   - 课程测验成绩
   - 实操评分
   - 综合评定

4. 反馈收集
   - 课程评价
   - 学习心得
   - 改进建议

### 3.4 KPI考核模块

KPI考核实现客服绩效的量化评估，支持多维度考核体系。

方案管理功能：
1. 考核方案创建
   - 方案基本信息
   - 考核周期设置
   - 适用人员选择
   - 方案状态管理

2. 指标权重设置
   - 指标项定义
   - 权重分配
   - 评分区间
   - 加分项设置

3. 评分标准定义
   - 评分等级划分
   - 等级描述说明
   - 示例参考

4. 方案版本管理
   - 版本历史记录
   - 版本对比
   - 版本回滚

考核执行功能：
1. 定期考核发起
   - 自动周期考核
   - 手动发起考核
   - 考核任务分配

2. 评分数据录入
   - 主管评分
   - 自评分数
   - 同事互评
   - 系统评分

3. 结果计算汇总
   - 加权分数计算
   - 排名统计
   - 趋势对比

4. 报告生成导出
   - 个人考核报告
   - 团队汇总报告
   - 趋势分析报告

### 3.5 话术库模块

话术库提供标准化的客服应答模板，帮助客服快速响应客户问题。

分类管理体系：
1. 售前话术
   - 产品咨询话术
   - 促销活动话术
   - 下单引导话术
   - 支付问题话术

2. 售后话术
   - 物流查询话术
   - 退换货话术
   - 质量问题话术
   - 使用指导话术

3. 投诉处理
   - 投诉接收话术
   - 安抚沟通话术
   - 解决方案话术
   - 回访跟进话术

4. 特殊场景
   - 大促期间话术
   - 节假日话术
   - VIP客户话术
   - 紧急情况话术

功能特点：
1. 场景化分类
   - 按业务场景分类
   - 按客户类型分类
   - 按问题类型分类

2. 智能搜索
   - 关键词搜索
   - 语义搜索
   - 标签筛选

3. 使用频次统计
   - 热门话术排行
   - 使用趋势分析
   - 效果评估

4. 效果反馈收集
   - 有效/无效标记
   - 改进建议
   - 版本迭代

### 3.6 知识库模块

知识库支撑客服的日常学习和问题解答，是企业知识的沉淀平台。

内容管理体系：
1. 产品知识
   - 产品基本信息
   - 产品规格参数
   - 使用方法说明
   - 常见问题解答

2. 行业知识
   - 行业政策法规
   - 行业标准规范
   - 行业趋势动态
   - 竞品对比分析

3. 操作流程
   - 系统操作指南
   - 业务流程说明
   - 注意事项提醒
   - 常见错误规避

4. 常见问题
   - FAQ问答库
   - 问题分类标签
   - 解决方案链接
   - 相关知识关联

知识类型支持：
1. 文本知识
   - 纯文本内容
   - 富文本编辑
   - Markdown支持

2. 图片说明
   - 截图说明
   - 流程图示
   - 示意图展示

3. 视频教程
   - 操作演示视频
   - 培训视频
   - 案例讲解视频

4. 文档附件
   - PDF文档
   - Word文档
   - Excel表格

### 3.7 AI助手模块

AI助手提供智能化支持，帮助客服更高效地解决问题。

功能场景：
1. 问题诊断分析
   - 问题类型识别
   - 原因分析建议
   - 解决方案推荐
   - 相关案例引用

2. 话术优化建议
   - 表达方式优化
   - 语气措辞建议
   - 个性化调整
   - 效果评估

3. 培训内容推荐
   - 学习内容推荐
   - 薄弱环节强化
   - 进阶课程建议

4. 数据洞察分析
   - 数据趋势解读
   - 异常预警
   - 优化建议

技术实现：
1. 基于大语言模型
   - 采用先进LLM技术
   - 支持多模型切换
   - 持续优化提示词

2. 上下文理解
   - 多轮对话理解
   - 上下文关联
   - 意图识别

3. 流式响应
   - 实时响应输出
   - 打字机效果
   - 提升用户体验

4. 多轮对话
   - 对话历史保持
   - 上下文连贯
   - 智能追问

### 3.8 问题诊断模块

问题诊断帮助客服快速定位问题并找到解决方案。

诊断流程设计：
1. 问题描述输入
   - 问题分类选择
   - 详细描述输入
   - 相关信息补充
   - 图片附件上传

2. AI智能分析
   - 问题类型识别
   - 关键信息提取
   - 原因推理分析
   - 严重程度评估

3. 解决方案推荐
   - 标准解决方案
   - 历史相似案例
   - 话术建议
   - 注意事项

4. 相关知识关联
   - 相关产品知识
   - 相关操作流程
   - 相关政策规定

诊断类型分类：
1. 产品问题
   - 产品质量
   - 产品使用
   - 产品规格

2. 物流问题
   - 发货延迟
   - 物流查询
   - 签收异常

3. 售后问题
   - 退换货
   - 维修服务
   - 投诉处理

4. 账户问题
   - 登录问题
   - 支付问题
   - 会员问题

### 3.9 工单管理模块

工单管理实现问题的跟踪处理，确保每个问题得到妥善解决。

工单流程设计：
1. 工单创建
   - 问题基本信息
   - 客户信息关联
   - 紧急程度标记
   - 负责人分配

2. 分派处理
   - 自动分派规则
   - 手动分派调整
   - 转派处理
   - 协办邀请

3. 进度跟踪
   - 处理进度更新
   - 客户通知
   - 超时预警
   - 催办提醒

4. 完结归档
   - 解决方案记录
   - 客户满意度
   - 归档分类
   - 知识沉淀

工单类型：
1. 客户投诉
   - 服务投诉
   - 质量投诉
   - 物流投诉

2. 问题咨询
   - 产品咨询
   - 政策咨询
   - 操作咨询

3. 协作处理
   - 跨部门协作
   - 资源协调
   - 问题升级

4. 内部协作
   - 知识共享
   - 经验交流
   - 培训协助

### 3.10 财务管理模块

财务管理实现收入支出的记录分析，支撑经营决策。

功能范围：
1. 收款记录
   - 订单收款
   - 会员充值
   - 其他收入

2. 付款记录
   - 成本支出
   - 费用报销
   - 采购付款

3. 成本核算
   - 人力成本
   - 运营成本
   - 技术成本

4. 利润分析
   - 毛利计算
   - 净利分析
   - 利润率统计

报表功能：
1. 日报表
   - 当日收支汇总
   - 异常交易提醒
   - 重点关注事项

2. 周报表
   - 周度收支汇总
   - 环比分析
   - 趋势图表

3. 月度汇总
   - 月度收支明细
   - 预算执行情况
   - 异常分析

4. 趋势分析
   - 收支趋势图
   - 结构分析
   - 预测分析

## 第四章 数据库设计

### 4.1 数据库概述

系统采用PostgreSQL关系型数据库，通过Supabase云服务提供托管。数据库设计遵循第三范式原则，确保数据一致性和完整性。

数据库特点：
1. 云端托管，高可用保障
2. 自动备份，数据安全
3. 行级安全，细粒度权限
4. 实时订阅，数据同步

### 4.2 核心数据表

用户表(users)设计：
- id: 用户唯一标识(UUID)
- email: 登录邮箱(唯一)
- password_hash: 密码哈希
- display_name: 显示名称
- role: 用户角色
- user_type: 用户类型
- company_id: 所属企业(外键)
- status: 账户状态
- last_login_at: 最后登录时间
- created_at: 创建时间
- updated_at: 更新时间

企业表(companies)设计：
- id: 企业唯一标识(UUID)
- name: 企业名称
- industry: 所属行业
- team_size: 团队规模
- contact_name: 联系人姓名
- contact_phone: 联系电话
- plan: 订阅套餐(basic/pro/flagship)
- plan_start: 套餐开始时间
- plan_end: 套餐结束时间
- trial_end_at: 试用结束时间
- status: 企业状态
- created_at: 创建时间
- updated_at: 更新时间

客服表(agents)设计：
- id: 客服唯一标识(UUID)
- company_id: 所属企业(外键)
- name: 客服姓名
- employee_id: 工号
- hire_date: 入职日期
- position: 职位(售中客服/售后客服/组长/主管)
- training_stage: 培训阶段(基础/售中/售后/进阶/独立上岗)
- status: 在职状态(在职/离职/试用)
- created_at: 创建时间
- updated_at: 更新时间

课程表(courses)设计：
- id: 课程唯一标识(UUID)
- company_id: 所属企业(外键)
- title: 课程标题
- content: 课程内容
- category: 课程分类
- cover_image: 封面图片URL
- duration: 课程时长
- status: 发布状态
- created_at: 创建时间
- updated_at: 更新时间

KPI方案表(kpi_schemes)设计：
- id: 方案唯一标识(UUID)
- company_id: 所属企业(外键)
- name: 方案名称
- description: 方案描述
- metrics: 考核指标(JSON)
- weights: 权重配置(JSON)
- period: 考核周期
- status: 方案状态
- created_at: 创建时间
- updated_at: 更新时间

话术库表(phrase_library)设计：
- id: 话术唯一标识(UUID)
- company_id: 所属企业(外键)
- category: 话术分类
- scenario: 适用场景
- content: 话术内容
- tags: 标签(JSON)
- use_count: 使用次数
- effectiveness: 有效性评分
- created_at: 创建时间
- updated_at: 更新时间

### 4.3 数据关系设计

主要实体关系：
1. 用户与企业：多对一关系
   - 一个企业有多个用户
   - 一个用户属于一个企业

2. 客服与企业：多对一关系
   - 一个企业有多个客服
   - 一个客服属于一个企业

3. 课程与企业：多对一关系
   - 一个企业有多个课程
   - 一个课程属于一个企业

4. KPI方案与企业：多对一关系
   - 一个企业有多个考核方案
   - 一个方案属于一个企业

5. 话术与企业：多对一关系
   - 一个企业有多个话术
   - 一个话术属于一个企业

关系约束：
- 外键约束保证数据完整性
- 级联删除策略
- 软删除机制

### 4.4 索引设计

索引用于优化查询性能：
1. 主键索引
   - 所有表都有主键索引
   - UUID类型主键

2. 外键索引
   - company_id字段索引
   - user_id字段索引

3. 业务索引
   - email唯一索引
   - status状态索引
   - created_at时间索引

4. 复合索引
   - (company_id, status)复合索引
   - (company_id, created_at)复合索引

### 4.5 数据安全设计

安全措施：
1. 行级安全策略(RLS)
   - 每个表启用RLS
   - 用户只能访问本企业数据
   - service_role绕过RLS

2. 数据校验
   - 服务端数据校验
   - 类型安全约束
   - 业务规则校验

3. 敏感数据保护
   - 密码哈希存储
   - 敏感字段脱敏
   - 加密传输

4. 操作审计
   - 关键操作日志
   - 数据变更记录
   - 异常操作告警

## 第五章 接口设计

### 5.1 接口规范

系统采用RESTful API设计风格，遵循以下规范：

HTTP方法语义：
- GET: 查询资源，幂等操作
- POST: 创建资源，非幂等
- PUT: 更新资源，幂等操作
- PATCH: 部分更新，幂等操作
- DELETE: 删除资源，幂等操作

URL设计规范：
- 资源名词复数形式
- 层级关系清晰
- 查询参数过滤
- 版本号前缀

响应格式规范：
- 成功响应返回数据
- 错误响应返回错误信息
- 分页响应包含分页信息
- 统一HTTP状态码

### 5.2 认证接口

登录接口：
- URL: POST /api/auth/login
- 请求参数：
  {
    "email": "用户邮箱",
    "password": "用户密码"
  }
- 成功响应：
  {
    "success": true,
    "token": "JWT令牌",
    "user": {用户信息}
  }
- 失败响应：
  {
    "error": "登录失败",
    "detail": "邮箱或密码错误"
  }

注册接口：
- URL: POST /api/auth/register
- 请求参数：
  {
    "email": "用户邮箱",
    "password": "用户密码",
    "companyName": "企业名称",
    "displayName": "显示名称"
  }
- 成功响应：
  {
    "success": true,
    "userId": "用户ID",
    "trialEndAt": "试用结束时间"
  }

获取Profile接口：
- URL: GET /api/auth/profile
- 请求头：Authorization: Bearer {token}
- 成功响应：
  {
    "user": {用户信息},
    "company": {企业信息},
    "planEnd": "套餐结束时间"
  }

### 5.3 业务接口

客服管理接口：
- 列表查询：GET /api/agents
- 详情查询：GET /api/agents/:id
- 创建：POST /api/agents
- 更新：PUT /api/agents/:id
- 删除：DELETE /api/agents/:id

课程管理接口：
- 列表查询：GET /api/courses
- 详情查询：GET /api/courses/:id
- 创建：POST /api/courses
- 更新：PUT /api/courses/:id
- 删除：DELETE /api/courses/:id

KPI方案接口：
- 列表查询：GET /api/kpi-schemes
- 详情查询：GET /api/kpi-schemes/:id
- 创建：POST /api/kpi-schemes
- 更新：PUT /api/kpi-schemes/:id
- 删除：DELETE /api/kpi-schemes/:id

话术库接口：
- 列表查询：GET /api/phrase-library
- 创建：POST /api/phrase-library
- 更新：PUT /api/phrase-library/:id
- 删除：DELETE /api/phrase-library/:id

### 5.4 分页接口

分页参数：
- page: 页码，从1开始
- limit: 每页数量，默认20

分页响应：
{
  "data": [...],
  "total": 总数量,
  "page": 当前页,
  "limit": 每页数量,
  "totalPages": 总页数
}

### 5.5 错误处理

统一错误响应格式：
{
  "error": "错误类型",
  "detail": "详细信息",
  "code": "错误代码"
}

常见错误码：
- 400: 请求参数错误
- 401: 未认证
- 403: 无权限
- 404: 资源不存在
- 500: 服务器内部错误

## 第六章 安全设计

### 6.1 认证安全

认证机制：
1. JWT令牌认证
   - 令牌有效期设置
   - 令牌刷新机制
   - 令牌撤销支持

2. 密码安全
   - 密码强度要求
   - 密码哈希存储(bcrypt)
   - 密码定期更换提醒

3. 登录安全
   - 登录频率限制
   - 异常登录告警
   - 多设备登录管理

4. 会话管理
   - 会话超时控制
   - 会话并发限制
   - 会话安全注销

### 6.2 权限控制

角色权限设计：
1. admin角色
   - 系统管理员
   - 全局配置权限
   - 所有数据访问

2. enterprise_admin角色
   - 企业管理员
   - 企业配置权限
   - 本企业数据访问

3. enterprise_manager角色
   - 客服主管
   - 团队管理权限
   - 本团队数据访问

4. staff角色
   - 普通客服
   - 基本操作权限
   - 个人数据访问

权限校验层级：
1. 路由级权限控制
   - 页面访问权限
   - API访问权限

2. 功能级权限控制
   - 功能可见性
   - 操作可执行性

3. 数据级权限控制
   - 数据可见范围
   - 数据操作权限

### 6.3 数据安全

数据保护措施：
1. 传输安全
   - HTTPS强制加密
   - 证书有效验证
   - 安全头部设置

2. 存储安全
   - 敏感数据加密
   - 数据脱敏处理
   - 安全删除机制

3. 备份安全
   - 定期自动备份
   - 备份数据加密
   - 异地备份存储

4. 审计追踪
   - 操作日志记录
   - 数据变更追踪
   - 异常行为告警

### 6.4 安全策略

安全策略配置：
1. 内容安全策略(CSP)
   - 脚本执行限制
   - 外部资源限制
   - 内联脚本禁止

2. 跨域策略(CORS)
   - 允许域名配置
   - 请求方法限制
   - 凭证携带控制

3. 安全头部
   - X-Frame-Options
   - X-Content-Type-Options
   - Strict-Transport-Security

## 第七章 性能设计

### 7.1 前端性能优化

优化措施：
1. 代码分割
   - 路由级别分割
   - 组件级别分割
   - 第三方库分割

2. 懒加载
   - 图片懒加载
   - 组件懒加载
   - 路由懒加载

3. 缓存策略
   - 静态资源缓存
   - API响应缓存
   - Service Worker缓存

4. 服务端渲染
   - 首屏服务端渲染
   - SEO友好
   - 性能提升

### 7.2 后端性能优化

优化措施：
1. 数据库优化
   - 索引优化
   - 查询优化
   - 连接池配置

2. 缓存层设计
   - Redis缓存
   - 内存缓存
   - 缓存策略

3. 异步处理
   - 耗时操作异步
   - 消息队列
   - 定时任务

4. 并发处理
   - 并发请求处理
   - 连接复用
   - 负载均衡

### 7.3 网络优化

网络优化措施：
1. CDN加速
   - 静态资源CDN
   - 图片CDN
   - 全球加速节点

2. 压缩传输
   - Gzip压缩
   - Brotli压缩
   - 图片压缩

3. 请求优化
   - 请求合并
   - 请求取消
   - 请求去重

### 7.4 可扩展性设计

扩展设计：
1. 模块化架构
   - 功能模块独立
   - 接口标准统一
   - 低耦合设计

2. 微服务预留
   - 服务边界清晰
   - 通信协议标准
   - 服务发现预留

3. 水平扩展支持
   - 无状态设计
   - 会话外部存储
   - 数据库读写分离

## 第八章 测试设计

### 8.1 测试策略

测试层次：
1. 单元测试
   - 函数级别测试
   - 组件级别测试
   - 工具函数测试

2. 集成测试
   - API集成测试
   - 数据库集成测试
   - 服务集成测试

3. 端到端测试
   - 用户流程测试
   - 关键路径测试
   - 跨功能测试

4. 性能测试
   - 负载测试
   - 压力测试
   - 并发测试

### 8.2 测试用例

功能测试用例：
1. 用户认证测试
   - 正常登录
   - 异常登录
   - 密码重置
   - 会话管理

2. 客服管理测试
   - 创建客服
   - 更新客服
   - 删除客服
   - 查询客服

3. 课程学习测试
   - 课程创建
   - 课程学习
   - 进度追踪
   - 成绩评定

4. KPI考核测试
   - 方案创建
   - 考核执行
   - 结果计算
   - 报告生成

### 8.3 测试数据

测试数据准备：
1. 用户测试数据
   - 管理员账户
   - 主管账户
   - 客服账户
   - 边界账户

2. 企业测试数据
   - 正常企业
   - 试用期企业
   - 过期企业

3. 业务测试数据
   - 课程数据
   - 话术数据
   - 考核数据

### 8.4 测试工具

测试工具选择：
1. Jest - 单元测试框架
2. Testing Library - 组件测试
3. Playwright - E2E测试
4. k6 - 性能测试

## 第九章 部署运维

### 9.1 部署流程

部署步骤：
1. 代码构建
   - 依赖安装
   - 代码编译
   - 资源优化

2. 环境配置
   - 环境变量设置
   - 配置文件生成
   - 密钥注入

3. 数据库迁移
   - 数据库连接
   - 迁移脚本执行
   - 数据初始化

4. 服务启动
   - 健康检查
   - 服务启动
   - 负载均衡配置

5. 部署验证
   - 功能验证
   - 性能验证
   - 安全验证

### 9.2 环境配置

配置项说明：
1. 数据库配置
   - DATABASE_URL: 数据库连接串
   - SUPABASE_URL: Supabase服务地址
   - SUPABASE_ANON_KEY: 匿名密钥
   - SUPABASE_SERVICE_ROLE_KEY: 服务密钥

2. 认证配置
   - JWT_SECRET: JWT密钥
   - SESSION_SECRET: 会话密钥

3. 服务配置
   - PORT: 服务端口
   - NODE_ENV: 运行环境

### 9.3 监控告警

监控项设计：
1. 服务状态监控
   - 服务存活检查
   - 健康状态检查
   - 资源使用监控

2. 性能指标监控
   - 响应时间监控
   - 吞吐量监控
   - 错误率监控

3. 日志监控
   - 错误日志收集
   - 访问日志分析
   - 审计日志保存

4. 业务指标监控
   - 用户活跃度
   - 功能使用率
   - 异常行为检测

### 9.4 运维流程

日常运维：
1. 日志分析
   - 错误日志排查
   - 性能瓶颈分析
   - 用户行为分析

2. 数据备份
   - 定期自动备份
   - 备份验证
   - 恢复演练

3. 安全更新
   - 依赖更新
   - 安全补丁
   - 漏洞修复

4. 性能优化
   - 性能监控
   - 瓶颈定位
   - 优化实施

## 第十章 附录

### 10.1 技术选型说明

前端框架选择Next.js的原因：
1. 服务端渲染支持，提升首屏性能
2. App Router路由系统，开发体验好
3. React生态成熟，社区活跃
4. TypeScript支持完善，类型安全

UI组件库选择shadcn/ui的原因：
1. 基于Radix UI，可访问性好
2. Tailwind CSS集成，样式灵活
3. 组件质量高，设计美观
4. 可定制性强，易于维护

数据库选择PostgreSQL的原因：
1. 功能强大，支持JSON、全文搜索等
2. 性能稳定，经过长期验证
3. Supabase托管，运维成本低
4. RLS支持，安全机制完善

### 10.2 术语说明

术语定义：
- KPI: Key Performance Indicator，关键绩效指标
- RLS: Row Level Security，行级安全策略
- JWT: JSON Web Token，JSON网络令牌
- API: Application Programming Interface，应用程序接口
- ORM: Object Relational Mapping，对象关系映射
- CDN: Content Delivery Network，内容分发网络
- SSR: Server Side Rendering，服务端渲染
- CSR: Client Side Rendering，客户端渲染

### 10.3 缩略语表

| 缩略语 | 全称 | 说明 |
|--------|------|------|
| API | Application Programming Interface | 应用程序接口 |
| JWT | JSON Web Token | JSON网络令牌 |
| KPI | Key Performance Indicator | 关键绩效指标 |
| ORM | Object Relational Mapping | 对象关系映射 |
| RLS | Row Level Security | 行级安全策略 |
| SSR | Server Side Rendering | 服务端渲染 |
| CSR | Client Side Rendering | 客户端渲染 |
| CDN | Content Delivery Network | 内容分发网络 |

### 10.4 版本历史

版本记录：
V1.0.0 - 初始版本(2024年)
功能清单：
- 基础框架搭建
- 用户认证系统
- 企业管理功能
- 客服管理功能
- 培训中心功能
- KPI考核功能
- 话术库功能
- 知识库功能
- AI助手功能
- 数据分析功能
- 工单管理功能
- 财务管理功能

### 10.5 未来规划

后续版本计划：

V1.1.0 - 功能增强版
- 移动端适配优化
- 数据导出功能增强
- 报表功能扩展
- 批量操作优化
- 通知系统升级

V1.2.0 - 智能化升级版
- AI能力增强
- 自动化推荐
- 智能排班
- 预测分析
- 智能客服

V2.0.0 - 平台化版本
- 多企业支持
- 开放API平台
- 插件系统
- 自定义工作流
- 数据中台

---
文档编制：研发团队
编制日期：2024年
文档版本：V1.0
审核状态：已审核
`;
}

// 主函数
async function main() {
  try {
    await generateSourceCodePDF();
    await generateManualPDF();
    
    // 输出文件信息
    console.log('\n=== 生成的文件 ===');
    const files = fs.readdirSync(outputDir);
    for (const file of files) {
      if (file.endsWith('.pdf')) {
        const stat = fs.statSync(path.join(outputDir, file));
        console.log(`${file}: ${(stat.size / 1024).toFixed(2)} KB`);
      }
    }
  } catch (error) {
    console.error('生成PDF失败:', error);
  }
}

main();
