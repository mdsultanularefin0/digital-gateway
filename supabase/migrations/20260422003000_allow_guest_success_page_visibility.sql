
-- Allow anon/guests to select download tokens for their newly placed orders
-- This is needed to show downloads on the Success Page immediately after checkout
DROP POLICY IF EXISTS "Guests can read own newly created tokens" ON public.download_tokens;
CREATE POLICY "Guests can read own newly created tokens"
ON public.download_tokens
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = download_tokens.order_id
    AND orders.created_at > now() - interval '5 minutes'
  )
);

-- Ensure anon can read order items for success page summary (defensive)
DROP POLICY IF EXISTS "Guests can read own newly created order items (select)" ON public.order_items;
CREATE POLICY "Guests can read own newly created order items (select)"
ON public.order_items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.created_at > now() - interval '10 minutes'
  )
);
