-- Fix SECURITY DEFINER views to be SECURITY INVOKER
-- This ensures views respect RLS policies of the invoking user

-- Recreate reviews_public view with SECURITY INVOKER
DROP VIEW IF EXISTS public.reviews_public;
CREATE VIEW public.reviews_public
  WITH (security_invoker = on)
AS
SELECT
  id,
  product_id,
  customer_name,
  rating,
  title,
  content,
  approved,
  featured,
  created_at
FROM public.reviews
WHERE approved = true;

GRANT SELECT ON public.reviews_public TO anon, authenticated;

-- Recreate coupons_public view with SECURITY INVOKER
DROP VIEW IF EXISTS public.coupons_public;
CREATE VIEW public.coupons_public
  WITH (security_invoker = on)
AS
SELECT
  code,
  discount_type,
  discount_value,
  min_order_amount,
  CASE 
    WHEN active = true 
      AND (expires_at IS NULL OR expires_at > now())
      AND (max_uses IS NULL OR used_count < max_uses)
    THEN true 
    ELSE false 
  END as is_valid
FROM public.coupons
WHERE active = true
  AND (expires_at IS NULL OR expires_at > now())
  AND (max_uses IS NULL OR used_count < max_uses);

GRANT SELECT ON public.coupons_public TO anon, authenticated;