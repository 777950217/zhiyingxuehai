-- =============================================
-- 卫管家 - customer_records 表补字段（电商专版）
-- =============================================

-- 1. 来源平台细分（替代原 source 的大类）
ALTER TABLE customer_records ADD COLUMN IF NOT EXISTS source_platform VARCHAR(20) DEFAULT 'other';
COMMENT ON COLUMN customer_records.source_platform IS '来源平台: taobao/jd/douyin/pdd/offline/phone/referral/other';

-- 2. 售后风险标签（JSON 数组）
ALTER TABLE customer_records ADD COLUMN IF NOT EXISTS risk_tags JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN customer_records.risk_tags IS '售后风险标签数组，可选项: install_error/emotional/claim/blacklist';

-- 3. 购买产品型号
ALTER TABLE customer_records ADD COLUMN IF NOT EXISTS product_model VARCHAR(100) DEFAULT '';
COMMENT ON COLUMN customer_records.product_model IS '购买产品型号，如: 智能马桶 T80';

-- 4. 坑距
ALTER TABLE customer_records ADD COLUMN IF NOT EXISTS pit_distance VARCHAR(10) DEFAULT 'unknown';
COMMENT ON COLUMN customer_records.pit_distance IS '坑距: 305/400/unknown';

-- 5. 水压
ALTER TABLE customer_records ADD COLUMN IF NOT EXISTS water_pressure VARCHAR(20) DEFAULT 'normal';
COMMENT ON COLUMN customer_records.water_pressure IS '水压: normal/low/no_limit';

-- 6. 最新跟进摘要（替代长备注）
ALTER TABLE customer_records ADD COLUMN IF NOT EXISTS follow_up_summary TEXT DEFAULT '';
COMMENT ON COLUMN customer_records.follow_up_summary IS '最新跟进摘要，短句风格';

-- 7. 关联订单号
ALTER TABLE customer_records ADD COLUMN IF NOT EXISTS related_order_id VARCHAR(100) DEFAULT '';
COMMENT ON COLUMN customer_records.related_order_id IS '关联订单号';

-- 8. 平台ID（买家旺旺/京东账号等）
ALTER TABLE customer_records ADD COLUMN IF NOT EXISTS platform_id VARCHAR(100) DEFAULT '';
COMMENT ON COLUMN customer_records.platform_id IS '平台ID，如旺旺号/京东用户名';

-- =============================================
-- 索引优化
-- =============================================
CREATE INDEX IF NOT EXISTS idx_customer_records_source_platform ON customer_records(source_platform);
CREATE INDEX IF NOT EXISTS idx_customer_records_risk_tags ON customer_records USING gin(risk_tags);
CREATE INDEX IF NOT EXISTS idx_customer_records_related_order_id ON customer_records(related_order_id);
