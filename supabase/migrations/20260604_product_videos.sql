-- 产品使用视频功能数据库表
-- 创建时间：2026-06-04

-- 1. 产品型号表
CREATE TABLE IF NOT EXISTS product_models (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(36) REFERENCES companies(id) ON DELETE CASCADE,
  model_no TEXT NOT NULL,
  model_name TEXT,
  description TEXT,
  cover_image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(36) REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═── 2. 版本文档表 ───
CREATE TABLE IF NOT EXISTS version_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES product_models(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═── 3. 媒体文件表 ───
CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES version_docs(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL CHECK (file_type IN ('video', 'pdf', 'image')),
  file_url TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═── 4. 创建 Storage Bucket ───
-- 注意：bucket 需要通过 Supabase Dashboard 或 CLI 创建，SQL 无法直接创建
-- 创建后需要设置 bucket 为 public

-- ═── 5. RLS 策略 ───

-- product_models RLS
ALTER TABLE product_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_models_select" ON product_models;
CREATE POLICY "product_models_select" ON product_models
  FOR SELECT USING (
    company_id IS NULL OR
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "product_models_insert" ON product_models;
CREATE POLICY "product_models_insert" ON product_models
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "product_models_update" ON product_models;
CREATE POLICY "product_models_update" ON product_models
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "product_models_delete" ON product_models;
CREATE POLICY "product_models_delete" ON product_models
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- version_docs RLS
ALTER TABLE version_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "version_docs_select" ON version_docs;
CREATE POLICY "version_docs_select" ON version_docs
  FOR SELECT USING (
    model_id IN (SELECT id FROM product_models WHERE company_id IS NULL OR company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "version_docs_insert" ON version_docs;
CREATE POLICY "version_docs_insert" ON version_docs
  FOR INSERT WITH CHECK (
    model_id IN (SELECT id FROM product_models WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "version_docs_update" ON version_docs;
CREATE POLICY "version_docs_update" ON version_docs
  FOR UPDATE USING (
    model_id IN (SELECT id FROM product_models WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "version_docs_delete" ON version_docs;
CREATE POLICY "version_docs_delete" ON version_docs
  FOR DELETE USING (
    model_id IN (SELECT id FROM product_models WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  );

-- media_items RLS
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_items_select" ON media_items;
CREATE POLICY "media_items_select" ON media_items
  FOR SELECT USING (
    doc_id IN (
      SELECT vd.id FROM version_docs vd
      JOIN product_models pm ON vd.model_id = pm.id
      WHERE pm.company_id IS NULL OR pm.company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "media_items_insert" ON media_items;
CREATE POLICY "media_items_insert" ON media_items
  FOR INSERT WITH CHECK (
    doc_id IN (
      SELECT vd.id FROM version_docs vd
      JOIN product_models pm ON vd.model_id = pm.id
      WHERE pm.company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "media_items_update" ON media_items;
CREATE POLICY "media_items_update" ON media_items
  FOR UPDATE USING (
    doc_id IN (
      SELECT vd.id FROM version_docs vd
      JOIN product_models pm ON vd.model_id = pm.id
      WHERE pm.company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "media_items_delete" ON media_items;
CREATE POLICY "media_items_delete" ON media_items
  FOR DELETE USING (
    doc_id IN (
      SELECT vd.id FROM version_docs vd
      JOIN product_models pm ON vd.model_id = pm.id
      WHERE pm.company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- ═── 6. 索引 ───
CREATE INDEX IF NOT EXISTS idx_product_models_company ON product_models(company_id);
CREATE INDEX IF NOT EXISTS idx_product_models_active ON product_models(is_active);
CREATE INDEX IF NOT EXISTS idx_version_docs_model ON version_docs(model_id);
CREATE INDEX IF NOT EXISTS idx_media_items_doc ON media_items(doc_id);
