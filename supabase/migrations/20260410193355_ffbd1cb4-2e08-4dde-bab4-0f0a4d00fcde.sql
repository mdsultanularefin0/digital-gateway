DROP POLICY "Public can read non-sensitive settings" ON public.site_settings;

CREATE POLICY "Public can read non-sensitive settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (
  key NOT IN (
    'bkash_app_key', 'bkash_app_secret', 'bkash_username', 'bkash_password',
    'webhook_secret', 'storage_api_key', 'facebook_capi_access_token',
    'openrouter_api_key'
  )
);