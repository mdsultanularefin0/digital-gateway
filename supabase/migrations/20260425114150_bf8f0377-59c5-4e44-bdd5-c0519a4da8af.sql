CREATE OR REPLACE FUNCTION public.create_checkout_order(
  _customer_name text,
  _customer_email text,
  _customer_phone text,
  _shipping_address text,
  _subtotal numeric,
  _discount numeric,
  _shipping_cost numeric,
  _total numeric,
  _payment_method text,
  _coupon_code text,
  _notes text,
  _items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _customer_id uuid;
  _order_id uuid := gen_random_uuid();
  _order_number text;
  _email text := lower(trim(coalesce(_customer_email, '')));
  _item jsonb;
  _product record;
  _product_id uuid;
  _tier_id uuid;
  _product_name text;
  _tier_label text;
  _quantity integer;
  _unit_price numeric;
  _line_total numeric;
  _calculated_subtotal numeric := 0;
BEGIN
  IF trim(coalesce(_customer_name, '')) = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;

  IF _email = '' THEN
    RAISE EXCEPTION 'Customer email is required';
  END IF;

  IF trim(coalesce(_customer_phone, '')) = '' THEN
    RAISE EXCEPTION 'Customer phone is required';
  END IF;

  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Order items are required';
  END IF;

  _customer_id := public.upsert_checkout_customer(_email, _customer_name, _customer_phone, coalesce(_shipping_address, ''));
  _order_number := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || substr(_order_id::text, 1, 8);

  INSERT INTO public.orders (
    id,
    order_number,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    subtotal,
    discount,
    shipping_cost,
    total,
    payment_method,
    coupon_code,
    notes,
    status,
    payment_status
  ) VALUES (
    _order_id,
    _order_number,
    _customer_id,
    trim(_customer_name),
    _email,
    trim(_customer_phone),
    coalesce(_shipping_address, ''),
    coalesce(_subtotal, 0),
    coalesce(_discount, 0),
    coalesce(_shipping_cost, 0),
    coalesce(_total, 0),
    coalesce(_payment_method, ''),
    nullif(trim(coalesce(_coupon_code, '')), ''),
    coalesce(_notes, ''),
    'pending',
    'unpaid'
  );

  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    _product_id := nullif(_item->>'product_id', '')::uuid;
    _tier_id := nullif(_item->>'tier_id', '')::uuid;
    _quantity := greatest(coalesce((_item->>'quantity')::integer, 1), 1);

    SELECT id, name, price, in_stock, published
    INTO _product
    FROM public.products
    WHERE id = _product_id
      AND published = true
      AND in_stock = true
    LIMIT 1;

    IF _product.id IS NULL THEN
      RAISE EXCEPTION 'One or more products are no longer available';
    END IF;

    IF _tier_id IS NOT NULL THEN
      SELECT pt.label, pt.price
      INTO _tier_label, _unit_price
      FROM public.product_tiers pt
      WHERE pt.id = _tier_id
        AND pt.product_id = _product_id
      LIMIT 1;

      IF _unit_price IS NULL THEN
        RAISE EXCEPTION 'One or more selected product options are no longer available';
      END IF;
    ELSE
      _tier_label := coalesce(_item->>'tier_label', '');
      _unit_price := coalesce(_product.price, 0);
    END IF;

    _product_name := _product.name;
    _line_total := _unit_price * _quantity;
    _calculated_subtotal := _calculated_subtotal + _line_total;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      tier_label,
      quantity,
      unit_price,
      total
    ) VALUES (
      _order_id,
      _product_id,
      _product_name,
      coalesce(_tier_label, ''),
      _quantity,
      _unit_price,
      _line_total
    );
  END LOOP;

  IF abs(_calculated_subtotal - coalesce(_subtotal, 0)) > 0.01 THEN
    RAISE EXCEPTION 'Cart prices changed. Please refresh your cart and try again.';
  END IF;

  RETURN jsonb_build_object(
    'id', _order_id,
    'order_number', _order_number,
    'customer_id', _customer_id
  );
END;
$function$;