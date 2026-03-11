
-- ============================================
-- 1. Product Images table
-- ============================================
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product images viewable by everyone"
  ON public.product_images FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can insert product images"
  ON public.product_images FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product images"
  ON public.product_images FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product images"
  ON public.product_images FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 2. Track Order RPC (SECURITY DEFINER)
-- ============================================
CREATE OR REPLACE FUNCTION public.track_order(_order_number text, _email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _order record;
  _items jsonb;
BEGIN
  IF _order_number IS NULL OR trim(_order_number) = '' THEN
    RAISE EXCEPTION 'Order number is required';
  END IF;
  IF _email IS NULL OR trim(_email) = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  SELECT id, order_number, status, payment_status, payment_method,
         subtotal, discount, shipping_cost, total, created_at, updated_at
  INTO _order
  FROM public.orders
  WHERE order_number = trim(_order_number)
    AND customer_email = lower(trim(_email))
  LIMIT 1;

  IF _order IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'product_name', oi.product_name,
    'tier_label', oi.tier_label,
    'quantity', oi.quantity,
    'unit_price', oi.unit_price,
    'total', oi.total
  ) ORDER BY oi.created_at), '[]'::jsonb)
  INTO _items
  FROM public.order_items oi
  WHERE oi.order_id = _order.id;

  RETURN jsonb_build_object(
    'order_number', _order.order_number,
    'status', _order.status,
    'payment_status', _order.payment_status,
    'payment_method', _order.payment_method,
    'subtotal', _order.subtotal,
    'discount', _order.discount,
    'shipping_cost', _order.shipping_cost,
    'total', _order.total,
    'created_at', _order.created_at,
    'updated_at', _order.updated_at,
    'items', _items
  );
END;
$$;

-- ============================================
-- 3. Reviews INSERT policy for guests
-- ============================================
CREATE POLICY "Anyone can submit reviews"
  ON public.reviews FOR INSERT TO anon, authenticated
  WITH CHECK (approved = false);
