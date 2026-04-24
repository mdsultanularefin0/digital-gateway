
-- Extend guest visibility window to 15 minutes and ensure 'paid' orders are visible
-- This resolves the issue where downloads disappear too quickly from the success page

-- 1. Orders policy
DROP POLICY IF EXISTS "Guests can read own newly created orders" ON public.orders;
CREATE POLICY "Guests can read own newly created orders"
ON public.orders
FOR SELECT
TO anon
USING (
  created_at > now() - interval '15 minutes'
);

-- 2. Order Items policy
DROP POLICY IF EXISTS "Guests can read own newly created order items (select)" ON public.order_items;
CREATE POLICY "Guests can read own newly created order items (select)"
ON public.order_items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.created_at > now() - interval '15 minutes'
  )
);

-- 3. Download Tokens policy
DROP POLICY IF EXISTS "Guests can read own newly created tokens" ON public.download_tokens;
CREATE POLICY "Guests can read own newly created tokens"
ON public.download_tokens
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = download_tokens.order_id
    AND orders.created_at > now() - interval '15 minutes'
  )
);

-- 4. Product Files policy (Ensure product files are ALWAYS visible to anon for download mapping)
-- (Existing policy "Product files viewable by everyone" should already handle this)
