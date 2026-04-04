-- Add facebook_capi_access_token to the sensitive settings list in RLS
DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.site_settings;
CREATE POLICY "Public can read non-sensitive settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (
  key <> ALL (ARRAY[
    'bkash_app_key',
    'bkash_app_secret',
    'bkash_username',
    'bkash_password',
    'webhook_secret',
    'storage_api_key',
    'facebook_capi_access_token'
  ])
);