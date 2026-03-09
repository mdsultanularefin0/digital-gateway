
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings viewable by everyone" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert settings" ON public.site_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update settings" ON public.site_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete settings" ON public.site_settings FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default settings
INSERT INTO public.site_settings (key, value) VALUES
  ('site_name', 'DigiStack'),
  ('site_tagline', 'Premium Digital Products'),
  ('logo_url', ''),
  ('favicon_url', ''),
  ('currency', 'USD'),
  ('currency_symbol', '$'),
  ('contact_email', ''),
  ('contact_phone', ''),
  ('contact_address', ''),
  ('city', ''),
  ('state', ''),
  ('country', ''),
  ('zip_code', ''),
  ('facebook_url', ''),
  ('twitter_url', ''),
  ('instagram_url', ''),
  ('linkedin_url', ''),
  ('youtube_url', ''),
  ('meta_title', ''),
  ('meta_description', ''),
  ('google_analytics_id', ''),
  ('footer_text', ''),
  ('support_email', ''),
  ('whatsapp_number', '');
