-- Add scope to coupons
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'global';

ALTER TABLE public.coupons
  DROP CONSTRAINT IF EXISTS coupons_scope_check;
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_scope_check CHECK (scope IN ('global','product'));

-- Join table for product-assigned coupons
CREATE TABLE IF NOT EXISTS public.coupon_products (
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coupon_id, product_id)
);

ALTER TABLE public.coupon_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage coupon_products" ON public.coupon_products;
CREATE POLICY "Admins manage coupon_products"
ON public.coupon_products FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Public can read coupon_products" ON public.coupon_products;
CREATE POLICY "Public can read coupon_products"
ON public.coupon_products FOR SELECT
TO anon, authenticated
USING (true);

-- Recreate the public view to include scope + product list
DROP VIEW IF EXISTS public.coupons_public;
CREATE VIEW public.coupons_public
WITH (security_invoker = true)
AS
SELECT
  c.code,
  c.discount_type,
  c.discount_value,
  c.min_order_amount,
  c.scope,
  COALESCE(
    (SELECT array_agg(cp.product_id) FROM public.coupon_products cp WHERE cp.coupon_id = c.id),
    ARRAY[]::uuid[]
  ) AS product_ids,
  CASE
    WHEN c.active = true
     AND (c.expires_at IS NULL OR c.expires_at > now())
     AND (c.max_uses IS NULL OR c.used_count < c.max_uses)
    THEN true
    ELSE false
  END AS is_valid
FROM public.coupons c
WHERE c.active = true
  AND (c.expires_at IS NULL OR c.expires_at > now())
  AND (c.max_uses IS NULL OR c.used_count < c.max_uses);