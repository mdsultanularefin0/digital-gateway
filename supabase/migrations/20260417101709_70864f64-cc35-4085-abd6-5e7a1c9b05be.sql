DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.site_settings;

CREATE POLICY "Public can read non-sensitive settings" ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (
  key <> ALL (ARRAY[
    'bkash_app_key'::text,
    'bkash_app_secret'::text,
    'bkash_username'::text,
    'bkash_password'::text,
    'webhook_secret'::text,
    'storage_api_key'::text,
    'facebook_capi_access_token'::text,
    'openrouter_api_key'::text,
    'brevo_api_key'::text,
    'sms_api_key'::text,
    'sms_api_secret'::text
  ])
);