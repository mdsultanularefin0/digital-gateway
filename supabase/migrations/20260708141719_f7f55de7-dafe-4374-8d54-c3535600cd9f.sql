
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_delivery_type_check;
ALTER TABLE public.products ADD CONSTRAINT products_delivery_type_check
  CHECK (delivery_type = ANY (ARRAY['download'::text, 'code'::text, 'account'::text, 'service'::text, 'license'::text]));

CREATE OR REPLACE FUNCTION public.auto_fulfill_order(_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _item record;
  _product record;
  _code record;
  _has_files boolean;
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

    IF EXISTS (SELECT 1 FROM public.order_deliveries
               WHERE order_id = _order_id AND order_item_id = _item.order_item_id) THEN
      CONTINUE;
    END IF;

    IF _product.delivery_type = 'download' THEN
      PERFORM public.generate_download_tokens(_order_id);
      INSERT INTO public.order_deliveries (order_id, order_item_id, product_id, delivery_type, status, delivered_at, payload)
      VALUES (_order_id, _item.order_item_id, _item.product_id, 'download', 'delivered', now(),
              jsonb_build_object('product_name', _item.product_name));

    ELSIF _product.delivery_type IN ('code','account') THEN
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
        INSERT INTO public.order_deliveries (order_id, order_item_id, product_id, delivery_type, status, payload)
        VALUES (_order_id, _item.order_item_id, _item.product_id, _product.delivery_type, 'pending',
                jsonb_build_object('product_name', _item.product_name, 'reason', 'pool_empty'));
      END IF;

    ELSIF _product.delivery_type = 'license' THEN
      -- Generate download tokens for any attached files (optional)
      SELECT EXISTS(SELECT 1 FROM public.product_files WHERE product_id = _item.product_id) INTO _has_files;
      IF _has_files THEN
        PERFORM public.generate_download_tokens(_order_id);
      END IF;
      -- License key itself is issued asynchronously by the issue-license edge function
      INSERT INTO public.order_deliveries (order_id, order_item_id, product_id, delivery_type, status, payload)
      VALUES (_order_id, _item.order_item_id, _item.product_id, 'license', 'pending',
              jsonb_build_object(
                'product_name', _item.product_name,
                'has_files', _has_files,
                'reason', 'awaiting_webhook'
              ));

    ELSIF _product.delivery_type = 'service' THEN
      INSERT INTO public.order_deliveries (order_id, order_item_id, product_id, delivery_type, status, payload)
      VALUES (_order_id, _item.order_item_id, _item.product_id, 'service', 'pending',
              jsonb_build_object('product_name', _item.product_name));
    END IF;
  END LOOP;
END;
$function$;
