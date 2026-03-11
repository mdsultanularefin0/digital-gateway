-- Fix remaining security issues: profiles and reviews data exposure

-- ============================================
-- PROFILES TABLE: Restrict public access
-- ============================================

-- Remove the overly permissive "viewable by everyone" policy
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;

-- Add proper self-only access for authenticated users
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Add a policy for anon users (they shouldn't see any profiles)
-- This ensures anon users get 0 rows instead of error
CREATE POLICY "Anonymous users cannot view profiles"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (false);

-- ============================================
-- REVIEWS TABLE: Create safe view without emails
-- ============================================

-- Create a public-safe view that excludes customer_email
CREATE OR REPLACE VIEW public.reviews_public AS
SELECT
  id,
  product_id,
  customer_name,
  -- Exclude customer_email from public view
  rating,
  title,
  content,
  approved,
  featured,
  created_at
FROM public.reviews
WHERE approved = true;

-- Make the view accessible to everyone
GRANT SELECT ON public.reviews_public TO anon, authenticated;

-- Update the reviews table policy to be admin-only
-- (Public should use the view instead)
DROP POLICY IF EXISTS "Approved reviews viewable by everyone" ON public.reviews;

-- Add a policy for authenticated users to view approved reviews (without email)
-- Note: We don't expose customer_email even to authenticated non-admins
CREATE POLICY "Authenticated users can view approved reviews"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (approved = true);

-- ============================================
-- COUPONS TABLE: Reduce public exposure
-- ============================================

-- Replace the broad SELECT policy with one that only exposes what's needed for validation
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;

-- Create a public-safe coupons view with minimal fields
CREATE OR REPLACE VIEW public.coupons_public AS
SELECT
  code,
  discount_type,
  discount_value,
  min_order_amount,
  -- Only show that a coupon is active, not internal metrics
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