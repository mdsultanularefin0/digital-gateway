DROP POLICY IF EXISTS "Anyone can record attributions" ON public.referral_attributions;
CREATE POLICY "Anyone can record attributions for active codes"
  ON public.referral_attributions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.referrals r WHERE r.code = referral_code AND r.active = true)
    AND event_type IN ('click','signup','order')
  );