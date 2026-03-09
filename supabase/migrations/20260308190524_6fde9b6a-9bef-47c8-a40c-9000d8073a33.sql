
-- Allow anonymous/public to insert orders (for checkout)
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);

-- Allow anonymous/public to insert order items
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);

-- Allow anonymous/public to insert customers (for checkout)
CREATE POLICY "Anyone can create customers" ON public.customers FOR INSERT WITH CHECK (true);

-- Allow public to update their own customer record by email (for checkout)
CREATE POLICY "Anyone can update customers by email" ON public.customers FOR UPDATE USING (true) WITH CHECK (true);

-- Allow public to look up customer by email
CREATE POLICY "Anyone can lookup customers" ON public.customers FOR SELECT USING (true);

-- Allow public to read active coupons for validation
CREATE POLICY "Anyone can read active coupons" ON public.coupons FOR SELECT USING (active = true);
