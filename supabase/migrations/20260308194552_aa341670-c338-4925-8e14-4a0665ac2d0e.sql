
-- Drop all existing RLS policies on orders
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Drop all existing RLS policies on order_items
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

-- Drop all existing RLS policies on customers
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can create customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can lookup customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;

-- Recreate orders policies as PERMISSIVE (default)
CREATE POLICY "Admins can manage orders" ON public.orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Recreate order_items policies as PERMISSIVE (default)
CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Recreate customers policies as PERMISSIVE (default)
CREATE POLICY "Admins can manage customers" ON public.customers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can lookup customers" ON public.customers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create customers" ON public.customers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update customers" ON public.customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
