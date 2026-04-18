-- Customer feature: review photos
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}'::text[];

-- Customer feature: referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  owner_email text NOT NULL,
  owner_name text NOT NULL DEFAULT '',
  click_count integer NOT NULL DEFAULT 0,
  signup_count integer NOT NULL DEFAULT 0,
  order_count integer NOT NULL DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_attributions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code text NOT NULL,
  order_id uuid,
  customer_email text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  event_type text NOT NULL DEFAULT 'click', -- click | signup | order
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage referrals" ON public.referrals;
CREATE POLICY "Admins manage referrals" ON public.referrals
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Public can read active referral codes" ON public.referrals;
CREATE POLICY "Public can read active referral codes" ON public.referrals
  FOR SELECT TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS "Admins manage attributions" ON public.referral_attributions;
CREATE POLICY "Admins manage attributions" ON public.referral_attributions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can record attributions" ON public.referral_attributions;
CREATE POLICY "Anyone can record attributions" ON public.referral_attributions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_referral_attr_code ON public.referral_attributions(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(code);

-- Trigger: keep updated_at fresh
DROP TRIGGER IF EXISTS trg_referrals_updated_at ON public.referrals;
CREATE TRIGGER trg_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();