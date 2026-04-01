
-- 1. Fix reviews: drop the authenticated SELECT policy that exposes customer_email
DROP POLICY IF EXISTS "Authenticated users can view approved reviews" ON public.reviews;

-- 2. Fix order_items: drop old unrestricted INSERT, add owner-restricted one
DROP POLICY IF EXISTS "Guests can create order items" ON public.order_items;

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
        orders.customer_email = lower(auth.jwt() ->> 'email')
        OR auth.role() = 'anon'
      )
  )
);

-- 3. Fix coupons_public view: make it security invoker so it respects RLS
ALTER VIEW public.coupons_public SET (security_invoker = true);
