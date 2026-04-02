CREATE TABLE public.page_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug text NOT NULL,
  section_key text NOT NULL,
  content text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(page_slug, section_key)
);

ALTER TABLE public.page_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage page contents"
ON public.page_contents FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read page contents"
ON public.page_contents FOR SELECT
TO anon, authenticated
USING (true);

CREATE TRIGGER update_page_contents_updated_at
BEFORE UPDATE ON public.page_contents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();