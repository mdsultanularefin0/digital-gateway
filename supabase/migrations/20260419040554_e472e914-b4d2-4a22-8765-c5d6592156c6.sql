-- Ensure pgcrypto is installed (works on both Lovable Cloud and self-hosted Postgres)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Reset download_tokens default to use unqualified gen_random_bytes
ALTER TABLE public.download_tokens
  ALTER COLUMN token SET DEFAULT replace(replace(replace(encode(gen_random_bytes(32), 'base64'), '+', '-'), '/', '_'), '=', '');