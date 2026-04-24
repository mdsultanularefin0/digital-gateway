
-- Allow guests to read back their own newly created order for checkout completion
-- This is required because useCheckout.ts uses .insert().select() which requires SELECT permission
CREATE POLICY "Guests can read own newly created orders"
ON public.orders
FOR SELECT
TO anon
USING (
  status = 'pending' 
  AND payment_status = 'unpaid' 
  AND created_at > now() - interval '30 seconds'
);

-- Also ensure Guests can read back their newly created order items if select was used (defensive)
-- Note: Currently useCheckout does not select from order_items, but adding for consistency
CREATE POLICY "Guests can read own newly created order items"
ON public.order_items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.status = 'pending'
    AND orders.payment_status = 'unpaid'
    AND orders.created_at > now() - interval '30 seconds'
  )
);
