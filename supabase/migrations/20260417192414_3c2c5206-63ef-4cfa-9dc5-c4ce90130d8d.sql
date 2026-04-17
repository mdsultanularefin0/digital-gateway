-- SEO meta fields for products (EN base)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS meta_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_keywords text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS og_image_url text NOT NULL DEFAULT '';

-- SEO meta fields for product translations (BN)
ALTER TABLE public.product_translations
  ADD COLUMN IF NOT EXISTS meta_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_keywords text NOT NULL DEFAULT '';

-- SEO meta fields for blog posts (EN base + BN)
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS meta_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_keywords text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS og_image_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_title_bn text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_description_bn text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_keywords_bn text NOT NULL DEFAULT '';

-- Static pages reuse page_contents (no schema change needed):
-- admins will store meta as section_key IN ('meta_title','meta_description','meta_keywords','og_image_url')
-- per (page_slug, lang).