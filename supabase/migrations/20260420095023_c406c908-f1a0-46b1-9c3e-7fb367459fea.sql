-- =========================================================================
-- 1. product_files: remove public SELECT, allow customers who bought it
-- =========================================================================
DROP POLICY IF EXISTS "Product files viewable by everyone" ON public.product_files;

CREATE POLICY "Customers can view files for purchased products"
ON public.product_files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.product_id = product_files.product_id
      AND o.customer_email = lower((auth.jwt() ->> 'email'))
      AND o.payment_status = 'paid'
  )
);

-- =========================================================================
-- 2. product_email_templates: admins only
-- =========================================================================
DROP POLICY IF EXISTS "Public can read active templates" ON public.product_email_templates;

-- =========================================================================
-- 3. referrals: hide PII; expose only safe validation view
-- =========================================================================
DROP POLICY IF EXISTS "Public can read active referral codes" ON public.referrals;

CREATE OR REPLACE VIEW public.referrals_public
WITH (security_invoker = true) AS
SELECT code, active
FROM public.referrals
WHERE active = true;

GRANT SELECT ON public.referrals_public TO anon, authenticated;

-- Allow the view itself to read the underlying table without exposing PII columns
CREATE POLICY "Public can validate active referral codes"
ON public.referrals
FOR SELECT
TO anon, authenticated
USING (false); -- block direct SELECT entirely; view uses security_invoker so we need a different approach

-- Actually: security_invoker views require the caller to have access. Use a SECURITY DEFINER function instead.
DROP VIEW IF EXISTS public.referrals_public;
DROP POLICY IF EXISTS "Public can validate active referral codes" ON public.referrals;

CREATE OR REPLACE FUNCTION public.validate_referral_code(_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.referrals
    WHERE code = _code AND active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.validate_referral_code(text) TO anon, authenticated;

-- =========================================================================
-- 4. newsletter_subscribers: restrict UPDATE
-- =========================================================================
DROP POLICY IF EXISTS "Anyone can resubscribe" ON public.newsletter_subscribers;

CREATE POLICY "Users can update own subscription"
ON public.newsletter_subscribers
FOR UPDATE
TO authenticated
USING (email = lower((auth.jwt() ->> 'email')))
WITH CHECK (email = lower((auth.jwt() ->> 'email')));

-- =========================================================================
-- 5. order_items: shrink anonymous insert window to 5s
-- =========================================================================
DROP POLICY IF EXISTS "Owner can create order items" ON public.order_items;

CREATE POLICY "Owner can create order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.status = 'pending'
      AND orders.payment_status = 'unpaid'
      AND (
        orders.customer_email = lower((auth.jwt() ->> 'email'))
        OR (auth.role() = 'anon' AND orders.created_at > now() - interval '5 seconds')
      )
  )
);

-- =========================================================================
-- 6. Storage buckets: keep files publicly fetchable, block listing
-- =========================================================================
-- Keep buckets public for direct URL access, but ensure no list policy exists
-- Public buckets in Supabase already allow direct fetch via URL without listing,
-- so no policy change needed beyond ensuring no SELECT-all policy on objects.
-- (Listing requires an explicit SELECT policy on storage.objects which we don't add.)

-- =========================================================================
-- 7. Drop English product_translations rows + restrict to bn only
-- =========================================================================
DELETE FROM public.product_translations WHERE lang <> 'bn';

ALTER TABLE public.product_translations
  DROP CONSTRAINT IF EXISTS product_translations_lang_check;

ALTER TABLE public.product_translations
  ADD CONSTRAINT product_translations_lang_check CHECK (lang = 'bn');
