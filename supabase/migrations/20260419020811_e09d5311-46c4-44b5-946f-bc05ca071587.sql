-- 1) Remove blanket anon SELECT on pending orders (exposed PII of all unpaid orders)
DROP POLICY IF EXISTS "Anon can read own pending orders" ON public.orders;

-- 2) Tighten order_items INSERT: anon can only add items to orders created in last 60s
--    (their own brand-new checkout) instead of ANY pending order in the system.
DROP POLICY IF EXISTS "Owner can create order items" ON public.order_items;

CREATE POLICY "Owner can create order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.status = 'pending'
      AND orders.payment_status = 'unpaid'
      AND (
        -- Authenticated users: must own the order by email
        orders.customer_email = lower(auth.jwt() ->> 'email')
        -- Anonymous: can only attach items to an order they just created (within 60s)
        OR (auth.role() = 'anon' AND orders.created_at > now() - interval '60 seconds')
      )
  )
);