-- Fix: qualify gen_random_bytes with the extensions schema so it works on
-- self-hosted Postgres where pgcrypto is not in the default search_path.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.download_tokens
  ALTER COLUMN token SET DEFAULT replace(replace(replace(encode(extensions.gen_random_bytes(32), 'base64'), '+', '-'), '/', '_'), '=', '');

DROP POLICY IF EXISTS "Anon can view tokens by token value" ON public.download_tokens;