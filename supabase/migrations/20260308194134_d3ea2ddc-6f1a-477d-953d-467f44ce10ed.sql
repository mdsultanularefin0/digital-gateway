
-- Grant necessary permissions to anon and authenticated roles for guest checkout
GRANT SELECT, INSERT ON public.customers TO anon, authenticated;
GRANT UPDATE ON public.customers TO anon, authenticated;
GRANT SELECT, INSERT ON public.orders TO anon, authenticated;
GRANT SELECT, INSERT ON public.order_items TO anon, authenticated;
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_tiers TO anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
