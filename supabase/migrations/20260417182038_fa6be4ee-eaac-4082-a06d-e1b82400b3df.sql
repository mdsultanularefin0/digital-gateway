
-- 1. Add delivery_type to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'download';

-- Constrain values
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_delivery_type_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_delivery_type_check
  CHECK (delivery_type IN ('download','code','account','service'));

-- 2. product_codes table — code/account pool
CREATE TABLE IF NOT EXISTS public.product_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  code_value text NOT NULL,
  credential_extra text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'available',
  assigned_order_id uuid,
  assigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_codes_status_check CHECK (status IN ('available','assigned','disabled'))
);

CREATE INDEX IF NOT EXISTS idx_product_codes_pool
  ON public.product_codes(product_id, status);

ALTER TABLE public.product_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage product codes" ON public.product_codes;
CREATE POLICY "Admins manage product codes"
  ON public.product_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_product_codes_updated_at
  BEFORE UPDATE ON public.product_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. order_deliveries table — what was delivered per order item
CREATE TABLE IF NOT EXISTS public.order_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  delivery_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  admin_note text NOT NULL DEFAULT '',
  delivered_at timestamptz,
  delivered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_deliveries_status_check CHECK (status IN ('pending','delivered','failed'))
);

CREATE INDEX IF NOT EXISTS idx_order_deliveries_order ON public.order_deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_order_deliveries_status ON public.order_deliveries(status);

ALTER TABLE public.order_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage deliveries" ON public.order_deliveries;
CREATE POLICY "Admins manage deliveries"
  ON public.order_deliveries
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Customers view own deliveries" ON public.order_deliveries;
CREATE POLICY "Customers view own deliveries"
  ON public.order_deliveries
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_deliveries.order_id
      AND o.customer_email = lower((auth.jwt() ->> 'email'::text))
  ));

CREATE TRIGGER set_order_deliveries_updated_at
  BEFORE UPDATE ON public.order_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Auto-fulfillment function: runs when order becomes paid
CREATE OR REPLACE FUNCTION public.auto_fulfill_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _item record;
  _product record;
  _code record;
BEGIN
  FOR _item IN
    SELECT oi.id AS order_item_id, oi.product_id, oi.quantity, oi.product_name
    FROM public.order_items oi
    WHERE oi.order_id = _order_id
  LOOP
    IF _item.product_id IS NULL THEN CONTINUE; END IF;

    SELECT id, delivery_type, name INTO _product
    FROM public.products WHERE id = _item.product_id;

    IF _product IS NULL THEN CONTINUE; END IF;

    -- Skip if already has a delivery for this item
    IF EXISTS (SELECT 1 FROM public.order_deliveries
               WHERE order_id = _order_id AND order_item_id = _item.order_item_id) THEN
      CONTINUE;
    END IF;

    IF _product.delivery_type = 'download' THEN
      -- Existing token-based flow handles this
      PERFORM public.generate_download_tokens(_order_id);
      INSERT INTO public.order_deliveries (order_id, order_item_id, product_id, delivery_type, status, delivered_at, payload)
      VALUES (_order_id, _item.order_item_id, _item.product_id, 'download', 'delivered', now(),
              jsonb_build_object('product_name', _item.product_name));

    ELSIF _product.delivery_type IN ('code','account') THEN
      -- Pull next available code from pool
      SELECT id, code_value, credential_extra INTO _code
      FROM public.product_codes
      WHERE product_id = _item.product_id AND status = 'available'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;

      IF _code.id IS NOT NULL THEN
        UPDATE public.product_codes
        SET status = 'assigned', assigned_order_id = _order_id, assigned_at = now()
        WHERE id = _code.id;

        INSERT INTO public.order_deliveries (order_id, order_item_id, product_id, delivery_type, status, delivered_at, payload)
        VALUES (_order_id, _item.order_item_id, _item.product_id, _product.delivery_type, 'delivered', now(),
                jsonb_build_object(
                  'product_name', _item.product_name,
                  'code', _code.code_value,
                  'credential_extra', _code.credential_extra
                ));
      ELSE
        -- Pool empty — pending for admin
        INSERT INTO public.order_deliveries (order_id, order_item_id, product_id, delivery_type, status, payload)
        VALUES (_order_id, _item.order_item_id, _item.product_id, _product.delivery_type, 'pending',
                jsonb_build_object('product_name', _item.product_name, 'reason', 'pool_empty'));
      END IF;

    ELSIF _product.delivery_type = 'service' THEN
      INSERT INTO public.order_deliveries (order_id, order_item_id, product_id, delivery_type, status, payload)
      VALUES (_order_id, _item.order_item_id, _item.product_id, 'service', 'pending',
              jsonb_build_object('product_name', _item.product_name));
    END IF;
  END LOOP;
END;
$$;

-- 5. Trigger on orders.payment_status -> paid
CREATE OR REPLACE FUNCTION public.trigger_auto_fulfill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid') THEN
    PERFORM public.auto_fulfill_order(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_fulfill_on_payment ON public.orders;
CREATE TRIGGER auto_fulfill_on_payment
  AFTER UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_fulfill();
