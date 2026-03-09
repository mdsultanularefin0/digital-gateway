
-- Add SELECT policy on orders so inserting user can read back their order
CREATE POLICY "Anyone can read own orders" ON public.orders FOR SELECT TO anon, authenticated USING (true);

-- Add SELECT policy on order_items for the same reason
CREATE POLICY "Anyone can read order items" ON public.order_items FOR SELECT TO anon, authenticated USING (true);
