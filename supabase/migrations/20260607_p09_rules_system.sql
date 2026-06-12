-- ==========================================
-- P0-9 规则变动功能 - 数据库迁移
-- 创建时间: 2026-06-07
-- ==========================================

-- 1. 创建 rules 表（规则库）
CREATE TABLE IF NOT EXISTS public.rules (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 售前/签收/安装/故障/投诉/保修
  summary TEXT,
  responsible_party VARCHAR(100),
  is_system BOOLEAN DEFAULT true, -- 是否系统内置规则
  is_active BOOLEAN DEFAULT true, -- 是否启用
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE, -- 如果是企业自定义规则，关联企业
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_rules_category ON public.rules(category);
CREATE INDEX IF NOT EXISTS idx_rules_company ON public.rules(company_id);
CREATE INDEX IF NOT EXISTS idx_rules_active ON public.rules(is_active);

-- 启用 RLS
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;

-- 权限策略：所有人可查看，只有 admin/manager 可修改
DROP POLICY IF EXISTS "rules_select_policy" ON public.rules;
CREATE POLICY "rules_select_policy" ON public.rules
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "rules_insert_policy" ON public.rules;
CREATE POLICY "rules_insert_policy" ON public.rules
  FOR INSERT WITH CHECK (auth.role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "rules_update_policy" ON public.rules;
CREATE POLICY "rules_update_policy" ON public.rules
  FOR UPDATE USING (auth.role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "rules_delete_policy" ON public.rules;
CREATE POLICY "rules_delete_policy" ON public.rules
  FOR DELETE USING (auth.role() IN ('admin', 'manager'));

-- 2. 创建 rule_versions 表（规则版本历史）
CREATE TABLE IF NOT EXISTS public.rule_versions (
  id SERIAL PRIMARY KEY,
  rule_id INTEGER REFERENCES public.rules(id) ON DELETE CASCADE,
  version INTEGER NOT NULL, -- 版本号（从1开始递增）
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  summary TEXT,
  responsible_party VARCHAR(100),
  change_note TEXT, -- 变更说明
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(rule_id, version)
);

CREATE INDEX IF NOT EXISTS idx_rule_versions_rule ON public.rule_versions(rule_id, version);

ALTER TABLE public.rule_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rule_versions_select_policy" ON public.rule_versions;
CREATE POLICY "rule_versions_select_policy" ON public.rule_versions
  FOR SELECT USING (true);

-- 3. 创建 rule_change_log 表（变更日志 - 审计用）
CREATE TABLE IF NOT EXISTS public.rule_change_log (
  id SERIAL PRIMARY KEY,
  rule_id INTEGER REFERENCES public.rules(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL, -- CREATE/UPDATE/DELETE
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  old_values JSONB, -- 修改前的值
  new_values JSONB, -- 修改后的值
  change_note TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rule_change_log_rule ON public.rule_change_log(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_change_log_company ON public.rule_change_log(company_id);
CREATE INDEX IF NOT EXISTS idx_rule_change_log_time ON public.rule_change_log(changed_at DESC);

ALTER TABLE public.rule_change_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rule_change_log_select_policy" ON public.rule_change_log;
CREATE POLICY "rule_change_log_select_policy" ON public.rule_change_log
  FOR SELECT USING (true);

-- 4. 迁移硬编码的72条规则到 rules 表
-- 注意：需要先获取一个有效的 user id 作为 created_by，这里用第一个 admin 用户
-- 如果找不到，先插入再用 SQL 更新

-- 插入72条系统规则
INSERT INTO public.rules (id, title, category, summary, responsible_party, is_system, is_active, created_by, created_at, updated_at)
VALUES
  (1, '客户咨询产品参数', '售前', '根据客户需求推荐合适产品，确认坑距/水压/安装条件', '售前客服', true, true, NULL, now(), now()),
  (2, '价格异议处理', '售前', '对比竞品突出性价比，强调安装/售后等服务价值', '售前客服', true, true, NULL, now(), now()),
  (3, '促单成交话术', '售前', '限时优惠/库存紧张/赠品策略推动下单', '售前客服', true, true, NULL, now(), now()),
  (4, '竞品对比', '售前', '不贬低竞品，客观对比材质/工艺/售后差异', '售前客服', true, true, NULL, now(), now()),
  (5, '赠品/赠速确认', '售前', '只允许赠送小礼品/消耗品，不赠送主机和核心配件', '售前客服', true, true, NULL, now(), now()),
  (6, '多渠道比价', '售前', '不同平台价格差异以活动解释，不承诺最低价', '售前客服', true, true, NULL, now(), now()),
  (7, '预售/缺货/到货时间', '售前', '确认库存状态，预估到货时间留缓冲', '售前客服', true, true, NULL, now(), now()),
  (8, '套餐推荐/搭配建议', '售前', '根据卫生间面积/风格推荐马桶+花洒+浴室柜套餐', '售前客服', true, true, NULL, now(), now()),
  (9, '客户质疑非正品', '售前', '提供授权书/防伪码/质检报告等正品的证明', '售前客服', true, true, NULL, now(), now()),
  (10, '赠品与消耗品赠送边界', '售前', '只允许赠送小礼品/消耗品安抚挽留，禁止赠送主机/核心配件', '售前客服', true, true, NULL, now(), now()),
  (11, '退差价判断', '售前', '7天内可退差价，超过7天不退，活动价以页面为准', '售前客服', true, true, NULL, now(), now()),
  (12, '质疑非正品要求补偿', '售前', '提供正品证明，补偿仅限消耗品/小礼品，不返现', '售前客服', true, true, NULL, now(), now()),
  (13, '师傅上门安装问题判断', '签收', '确认是否在安装服务范围内，预约时间，师傅资质', '安装调度', true, true, NULL, now(), now()),
  (14, '超7天无理由退货判断', '签收', '超7天不支持无理由退货，质量问题走售后', '售后客服', true, true, NULL, now(), now()),
  (15, '自行安装损坏判断', '签收', '自行安装导致的损坏不在质保范围，提醒客户专业安装', '售后客服', true, true, NULL, now(), now()),
  (16, '误判故障判断', '签收', '先远程排查确认是否真正故障，避免误判导致不必要的上门', '售后客服', true, true, NULL, now(), now()),
  (17, '已安装使用后退货判断', '签收', '已安装使用影响二次销售不支持退货，质量问题走售后维修', '售后客服', true, true, NULL, now(), now()),
  (20, '外箱完好内部缺配件判断', '签收', '外箱完好内部缺配件→补发配件，外箱破损→拒签/物流理赔', '售后客服', true, true, NULL, now(), now()),
  (21, '恶意拒收判断', '签收', '无正当理由拒收需承担往返运费，多次恶意拒收可拉黑', '售后客服', true, true, NULL, now(), now()),
  (32, '快递签收拆开马桶釉面裂纹磕碰掉瓷', '签收', '签收24小时内拍照报损→物流理赔/补发，超时需协商', '售后客服', true, true, NULL, now(), now()),
  (33, '多件套餐只到一部分少配件无法安装', '签收', '确认缺少件数→紧急补发+安装延期通知，赠小礼品安抚', '安装调度', true, true, NULL, now(), now()),
  (18, '水压异常判断', '安装', '确认水压是否在产品要求范围内，偏低推荐无水压限制款', '安装师傅', true, true, NULL, now(), now()),
  (24, '师傅上门安装失败判断链', '安装', '安装失败→确认原因(环境/产品/师傅)→协商方案(改约/换型号/退款)', '安装调度', true, true, NULL, now(), now()),
  (25, '安装完成客户反馈功能不正常判断链', '安装', '现场调试→排除安装问题→故障报修→48小时内二次上门', '安装师傅', true, true, NULL, now(), now()),
  (26, '客户要求改安装位置/移位安装', '安装', '移位安装需额外收费(管道改造)，确认客户同意后再施工', '安装师傅', true, true, NULL, now(), now()),
  (27, '脚感冲水不灵敏/离座不冲水', '安装', '检查感应器设置/电池电量/遮挡物，非硬件问题可远程指导', '安装师傅', true, true, NULL, now(), now()),
  (28, '拆旧时发现下水管/排污口问题', '安装', '下水管问题不在安装范围→建议联系物业，提供改造建议', '安装师傅', true, true, NULL, now(), now()),
  (29, '马桶安装一周底座边缘持续渗水', '安装', '判断法兰圈/排污口/安装工艺问题→48小时内回访处理', '安装师傅', true, true, NULL, now(), now()),
  (30, '客户投诉安装师傅态度差/施工粗糙/拒绝收尾', '安装', '先安抚客户→核实情况→道歉+更换师傅/补偿小礼品', '主管', true, true, NULL, now(), now()),
  (37, '没及时上门安装客户扬言差评平台投诉', '安装', '诚恳道歉→确认最快上门时间→赠送消耗品补偿→跟进完成', '安装调度', true, true, NULL, now(), now()),
  (56, '售前安装条件确认', '安装', '确认坑距(305/400mm)/水压/电路/排污管/空间尺寸', '售前客服', true, true, NULL, now(), now()),
  (62, '安装预约/催安装/改约/爽约重约', '安装', '预约24h内确认→催单优先安排→改约不超过2次→爽约记录', '安装调度', true, true, NULL, now(), now()),
  (19, '质疑非正品判断', '故障', '提供正品证明(授权/防伪/质检)，不接受仅凭怀疑退货', '售后客服', true, true, NULL, now(), now()),
  (31, '冲水后水箱一直嗡嗡响客户判定机器故障', '故障', '正常补水声音→解释原理→如确实异常则安排检修', '售后客服', true, true, NULL, now(), now()),
  (34, '夜间马桶咕咚流水异响怀疑破裂暗漏', '故障', '检查进水阀/浮球/溢水管→远程指导调整→异常安排上门', '售后客服', true, true, NULL, now(), now()),
  (35, '冲水时刺耳摩擦声客户要求换货', '故障', '检查盖板铰链/缓降装置→润滑/更换配件→非整机问题不换货', '售后客服', true, true, NULL, now(), now()),
  (36, '进水阀补水滋滋声客户误以为异常', '故障', '补水正常现象→解释原理→如声音过大可调低进水阀压力', '售后客服', true, true, NULL, now(), now()),
  (44, '智能马桶面板按键没反应触摸失灵', '故障', '断电重启→检查童锁/面板膜→如硬件故障安排维修', '售后客服', true, true, NULL, now(), now()),
  (45, '遥控器时而能用时而失灵', '故障', '检查电池/信号干扰/配对→换电池→仍异常则更换遥控器', '售后客服', true, true, NULL, now(), now()),
  (46, '面板显示乱码黑屏指示灯不亮', '故障', '断电重启→检查电源连接→如硬件故障更换面板', '售后客服', true, true, NULL, now(), now()),
  (47, '自动翻盖感应功能失效', '故障', '检查感应器设置/遮挡物/电源→重置感应→仍异常安排检修', '售后客服', true, true, NULL, now(), now()),
  (48, '马桶水箱一直上水关不住水', '故障', '检查进水阀/浮球/溢水管位置→调整/更换配件→远程指导优先', '售后客服', true, true, NULL, now(), now()),
  (54, '使用阶段清洗/加热/烘干功能故障', '故障', '逐项排查(水路/电路/加热模块)→远程指导→硬件故障上门', '售后客服', true, true, NULL, now(), now()),
  (55, '内部管路漏水VS底座渗漏VS配件漏水VS盖板座圈松动缓降失效', '故障', '定位漏水点→管路漏水更换管路/底座渗漏重新安装/配件漏水更换配件', '售后客服', true, true, NULL, now(), now()),
  (57, '冲水效果问题(冲不干净/冲水力度弱/冲一半回流)', '故障', '检查水压/排污管/法兰圈→调整水件/确认管路通畅→仍异常上门', '售后客服', true, true, NULL, now(), now()),
  (58, '异味问题(马桶返臭、有臭味)', '故障', '检查法兰圈密封/存水弯/排污管→重新密封/更换法兰圈', '售后客服', true, true, NULL, now(), now()),
  (59, '停电后无法冲水(含备用电池应急操作)', '故障', '指导备用电池/手动冲水操作→非故障正常现象→建议加装UPS', '售后客服', true, true, NULL, now(), now()),
  (60, '配件补发后又坏(换了又坏二次故障判断)', '故障', '二次故障升级处理→更换整机或安排高级技师上门', '主管', true, true, NULL, now(), now()),
  (61, '泡沫盾专属故障(不出泡/漏液/加错泡沫液)', '故障', '检查泡沫液余量/管路/加液口→清洗管路/补发泡沫液', '售后客服', true, true, NULL, now(), now()),
  (63, '遥控器/配件丢失补发(丢失≠损坏)', '故障', '丢失需购买补发(非质保范围)→提供配件价格→安排寄送', '售后客服', true, true, NULL, now(), now()),
  (64, '发货型号/颜色错误', '故障', '确认错误责任方→补发正确产品+回收入库错误产品→运费由责任方承担', '售后客服', true, true, NULL, now(), now()),
  (22, '退差价判断', '投诉', '7天内退差价，超7天不退，活动价以页面标注为准', '售后客服', true, true, NULL, now(), now()),
  (38, '对处理方案不满要求全额退款否则曝光', '投诉', '升级主管→提供多方案选择→记录投诉→2小时内回访确认', '主管', true, true, NULL, now(), now()),
  (39, '多次售后没解决客户升级要找12315', '投诉', '主管直接介入→48小时彻底解决方案→书面确认→跟进至满意', '主管', true, true, NULL, now(), now()),
  (40, '购买1年2个月故障客户要求免费换新', '投诉', '质保期内免费维修→超期付费维修→可提供折扣换新但非免费', '售后客服', true, true, NULL, now(), now()),
  (41, '收货7天内功能失灵坚持无理由退货', '投诉', '7天内功能失灵→退货→运费商家承担；超过7天走售后', '售后客服', true, true, NULL, now(), now()),
  (42, '人为磕碰自行拆装损坏想走免费质保', '投诉', '人为损坏不在质保范围→可付费维修→提供维修报价', '售后客服', true, true, NULL, now(), now()),
  (50, '平台介入/仲裁应对', '投诉', '准备完整证据链(聊天/照片/物流)→配合平台→不私自承诺', '主管', true, true, NULL, now(), now()),
  (52, '客户自行改装/加装出问题', '投诉', '自行改装不在质保范围→可付费维修→提醒原厂改装风险', '售后客服', true, true, NULL, now(), now()),
  (23, '质疑非正品要求补偿判断', '保修', '提供正品证明，补偿仅限消耗品/小礼品，不返现不退主机', '售后客服', true, true, NULL, now(), now()),
  (43, '质保期内配件损坏纠结补配件还是整机退换', '保修', '质保期内优先更换配件→如3次以上故障可申请整机更换', '售后客服', true, true, NULL, now(), now()),
  (49, '漏水质量问题用户申请退货要求商家承担运费', '保修', '质量问题→退货+商家承担运费；非质量问题→用户承担运费', '售后客服', true, true, NULL, now(), now()),
  (51, '个人不喜欢/尺寸不合适无理由退货拒绝承担运费', '保修', '7天内无理由退货运费由用户承担，页面已明确标注', '售后客服', true, true, NULL, now(), now()),
  (53, '物流丢件/整件未到处理', '保修', '确认物流状态→超48小时未更新→物流理赔+紧急补发', '售后客服', true, true, NULL, now(), now()),
  (65, '售前成交5步法', '售前', '问需求→共情顾虑→匹配卖点→打消顾虑→给价值理由→引导下单', '售前客服', true, true, NULL, now(), now()),
  (66, '逼单核心逻辑', '售前', '制造稀缺+降低决策成本+打消最后顾虑，帮客户下决心', '售前客服', true, true, NULL, now(), now()),
  (67, '催单核心原则', '售前', '不连环轰炸+给体面台阶+借外力催单(活动/库存/名额)', '售前客服', true, true, NULL, now(), now()),
  (68, '稀缺限时逼单话术', '售前', '明确倒计时+算账对比+锁定价格福利，须有真实活动依据', '售前客服', true, true, NULL, now(), now()),
  (69, '库存现货逼单话术', '售前', '真实库存状态+现在下单vs排单等待时间差+锁定名额发货', '售前客服', true, true, NULL, now(), now()),
  (70, '帮决策式逼单话术', '售前', '确认顾虑点→给明确结论→直接引导下一步，帮客户做选择', '售前客服', true, true, NULL, now(), now()),
  (71, '客户嫌贵/预算不够', '售前', '共情+客观差异+降档推荐+算长期账，不贬低低价竞品', '售前客服', true, true, NULL, now(), now()),
  (72, '老客户复购/转介绍', '售前', '确认身份+专属优惠+引导转介绍+快速通道', '售前客服', true, true, NULL, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 5. 为每条规则创建初始版本（version=1）
INSERT INTO public.rule_versions (rule_id, version, title, category, summary, responsible_party, change_note, changed_by, changed_at)
SELECT id, 1, title, category, summary, responsible_party, '初始版本（从硬编码迁移）', NULL, now()
FROM public.rules
ON CONFLICT (rule_id, version) DO NOTHING;

-- 6. 创建通知类型（如果还没有 platform_rule_change 类型）
-- 先检查 notifications 表的 type 约束，如果没有则跳过
-- 假设 notifications.type 是 VARCHAR 没有枚举约束，可以直接插入新类型

-- 完成提示
SELECT 'P0-9 规则表迁移完成！共插入 ' || COUNT(*) || ' 条规则' AS result
FROM public.rules;
