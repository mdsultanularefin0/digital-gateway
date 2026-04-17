-- Social posts tracking table
CREATE TABLE public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caption TEXT NOT NULL DEFAULT '',
  media_url TEXT NOT NULL DEFAULT '',
  media_type TEXT NOT NULL DEFAULT 'image', -- 'image' | 'video'
  target TEXT NOT NULL DEFAULT 'both',      -- 'facebook' | 'instagram' | 'both'
  mode TEXT NOT NULL DEFAULT 'now',         -- 'now' | 'schedule'
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | published | scheduled | failed
  fb_post_id TEXT NOT NULL DEFAULT '',
  ig_post_id TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  raw_response JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage social posts"
ON public.social_posts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_social_posts_updated_at
BEFORE UPDATE ON public.social_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mark Meta token settings as sensitive (hide from public reads)
DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.site_settings;
CREATE POLICY "Public can read non-sensitive settings"
ON public.site_settings FOR SELECT
TO anon, authenticated
USING (
  key <> ALL (ARRAY[
    'bkash_app_key','bkash_app_secret','bkash_username','bkash_password',
    'webhook_secret','storage_api_key','facebook_capi_access_token',
    'openrouter_api_key','brevo_api_key','sms_api_key','sms_api_secret',
    'meta_page_access_token','meta_ig_access_token'
  ])
);