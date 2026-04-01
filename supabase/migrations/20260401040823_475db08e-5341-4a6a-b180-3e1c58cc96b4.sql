-- Allow authenticated users to view their own orders by email
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (customer_email = lower(auth.jwt()->>'email'));

-- Allow authenticated users to view order items for their own orders
CREATE POLICY "Users can view own order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders
  WHERE orders.id = order_items.order_id
  AND orders.customer_email = lower(auth.jwt()->>'email')
));

-- Allow authenticated users to view own customer record
CREATE POLICY "Users can view own customer record"
ON public.customers
FOR SELECT
TO authenticated
USING (email = lower(auth.jwt()->>'email'));

-- Allow authenticated users to update own customer record
CREATE POLICY "Users can update own customer record"
ON public.customers
FOR UPDATE
TO authenticated
USING (email = lower(auth.jwt()->>'email'));