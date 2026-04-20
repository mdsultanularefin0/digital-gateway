-- Drop any broad SELECT policies on storage.objects for these public buckets.
-- Public buckets in Supabase serve files via signed CDN URLs without needing
-- a SELECT policy, so removing list access is safe.

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND (qual ILIKE '%product-images%' OR qual ILIKE '%blog-images%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;
