-- ============================================
-- 修复 accessory_gallery 表缺失列
-- 执行时间: 2026-06-01
-- 问题: API 使用了 is_deleted/is_default/source/review_status 列，但表结构里缺少
-- ============================================

-- 添加缺失的列（如果已存在则跳过）
DO $$
BEGIN
  -- is_deleted: 软删除标记
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accessory_gallery' AND column_name = 'is_deleted') THEN
    ALTER TABLE accessory_gallery ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;

  -- is_default: 是否平台默认
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accessory_gallery' AND column_name = 'is_default') THEN
    ALTER TABLE accessory_gallery ADD COLUMN is_default BOOLEAN DEFAULT false;
  END IF;

  -- source: 来源 (merchant/platform)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accessory_gallery' AND column_name = 'source') THEN
    ALTER TABLE accessory_gallery ADD COLUMN source TEXT DEFAULT 'merchant';
  END IF;

  -- review_status: 审核状态
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accessory_gallery' AND column_name = 'review_status') THEN
    ALTER TABLE accessory_gallery ADD COLUMN review_status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- 为现有数据设置默认值
UPDATE accessory_gallery SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE accessory_gallery SET is_default = false WHERE is_default IS NULL;
UPDATE accessory_gallery SET source = 'merchant' WHERE source IS NULL;
UPDATE accessory_gallery SET review_status = 'approved' WHERE review_status IS NULL;

-- 验证结果
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'accessory_gallery' 
ORDER BY ordinal_position;
