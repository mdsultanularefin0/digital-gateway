-- Harden download_tokens: use longer cryptographic tokens and remove blanket anon SELECT.
-- Anonymous customers reach the file via the secure-download edge function (service role),
-- so client-side anon SELECT is unnecessary and was the enumeration vector.

-- 1. Replace default with longer URL-safe random token (~43 chars base64 of 32 bytes).
ALTER TABLE public.download_tokens
  ALTER COLUMN token SET DEFAULT replace(replace(replace(encode(gen_random_bytes(32), 'base64'), '+', '-'), '/', '_'), '=', '');

-- 2. Drop the overly permissive anon SELECT policy.
DROP POLICY IF EXISTS "Anon can view tokens by token value" ON public.download_tokens;

-- (Authenticated users keep the existing "Users can view own download tokens" policy,
--  and admins keep "Admins can manage download tokens". The secure-download edge function
--  uses the service role key, so it bypasses RLS regardless.)
