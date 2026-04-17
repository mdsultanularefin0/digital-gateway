
-- 1. Product translations table
CREATE TABLE public.product_translations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  lang text NOT NULL DEFAULT 'bn',
  name text NOT NULL DEFAULT '',
  tagline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  features text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, lang)
);

ALTER TABLE public.product_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view translations"
  ON public.product_translations FOR SELECT
  TO public USING (true);

CREATE POLICY "Admins can manage translations"
  ON public.product_translations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_product_translations_updated_at
  BEFORE UPDATE ON public.product_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add lang column to page_contents
ALTER TABLE public.page_contents ADD COLUMN lang text NOT NULL DEFAULT 'en';

-- Drop existing unique constraint if any, then add new one including lang
ALTER TABLE public.page_contents DROP CONSTRAINT IF EXISTS page_contents_page_slug_section_key_key;
ALTER TABLE public.page_contents ADD CONSTRAINT page_contents_page_slug_section_key_lang_key UNIQUE (page_slug, section_key, lang);

-- 3. Add BN columns to blog_posts
ALTER TABLE public.blog_posts ADD COLUMN title_bn text;
ALTER TABLE public.blog_posts ADD COLUMN excerpt_bn text;
ALTER TABLE public.blog_posts ADD COLUMN content_bn text;
