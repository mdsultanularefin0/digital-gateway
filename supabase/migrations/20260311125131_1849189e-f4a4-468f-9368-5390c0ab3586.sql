-- Newsletter subscribers table
CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (active = true);

-- Admins can view all subscribers
CREATE POLICY "Admins can view subscribers" ON public.newsletter_subscribers
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage subscribers
CREATE POLICY "Admins can manage subscribers" ON public.newsletter_subscribers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Announcement banners table
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  link_text text DEFAULT '',
  link_url text DEFAULT '',
  bg_color text DEFAULT 'primary',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Anyone can view active announcements
CREATE POLICY "Public can view active announcements" ON public.announcements
  FOR SELECT TO anon, authenticated
  USING (active = true);

-- Admins can manage announcements
CREATE POLICY "Admins can manage announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));