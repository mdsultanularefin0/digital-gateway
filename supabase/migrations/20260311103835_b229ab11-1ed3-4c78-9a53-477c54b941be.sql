
-- 1. Create a SECURITY DEFINER function for checkout customer upsert
-- This replaces direct client-side customer table access during checkout
CREATE OR REPLACE FUNCTION public.upsert_checkout_customer(
  _email text,
  _name text,
  _phone text,
  _address text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _customer_id uuid;
BEGIN
  -- Validate inputs
  IF _email IS NULL OR trim(_email) = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  
  SELECT id INTO _customer_id FROM public.customers WHERE email = trim(_email) LIMIT 1;
  
  IF _customer_id IS NOT NULL THEN
    UPDATE public.customers SET
      name = COALESCE(NULLIF(trim(_name), ''), name),
      phone = COALESCE(NULLIF(trim(_phone), ''), phone),
      address = COALESCE(NULLIF(trim(_address), ''), address),
      updated_at = now()
    WHERE id = _customer_id;
  ELSE
    INSERT INTO public.customers (name, email, phone, address)
    VALUES (trim(_name), trim(_email), trim(_phone), trim(_address))
    RETURNING id INTO _customer_id;
  END IF;
  
  RETURN _customer_id;
END;
$$;

-- 2. Drop overly permissive customer policies
DROP POLICY IF EXISTS "Anyone can lookup customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can create customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;

-- 3. Fix site_settings: replace open SELECT with split policies
DROP POLICY IF EXISTS "Settings viewable by everyone" ON public.site_settings;

-- Admins can read all settings
CREATE POLICY "Admins can read all settings" ON public.site_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Public can read non-sensitive settings only
CREATE POLICY "Public can read non-sensitive settings" ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (key NOT IN ('bkash_app_key','bkash_app_secret','bkash_username','bkash_password','webhook_secret'));
