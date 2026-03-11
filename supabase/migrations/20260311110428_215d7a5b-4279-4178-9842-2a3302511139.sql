-- Fix overly permissive RLS policies on orders and order_items

-- Orders: remove public SELECT (guest checkout doesn't need to read back)
DROP POLICY IF EXISTS "Anyone can read own orders" ON public.orders;

-- Order items: remove public SELECT
DROP POLICY IF EXISTS "Anyone can read order items" ON public.order_items;

-- Replace "Anyone can create orders" with scoped policy
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Guests can create orders" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending' AND payment_status = 'unpaid');

-- Replace "Anyone can create order items" with scoped policy
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Guests can create order items" ON public.order_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id));