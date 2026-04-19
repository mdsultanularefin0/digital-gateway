-- Global AI context presets table
CREATE TABLE public.ai_context_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_context_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read presets"
  ON public.ai_context_presets FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert presets"
  ON public.ai_context_presets FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update presets"
  ON public.ai_context_presets FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete non-system presets"
  ON public.ai_context_presets FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_system = false);

CREATE TRIGGER update_ai_context_presets_updated_at
  BEFORE UPDATE ON public.ai_context_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 8 hardcoded presets
INSERT INTO public.ai_context_presets (label, content, is_system, sort_order) VALUES
  ('Friendly & casual', 'Use a friendly, casual, conversational tone. Write like you''re talking to a friend. Keep it warm, approachable, and easy to read. Avoid jargon.', true, 10),
  ('Professional B2B', 'Use a professional, authoritative B2B tone. Focus on ROI, efficiency, and business outcomes. Be concise, data-driven, and avoid hype or slang.', true, 20),
  ('Urgent sale', 'Create urgency and excitement. Highlight scarcity, limited-time offers, and immediate benefits. Use strong action verbs and persuasive language. Push the reader to act now.', true, 30),
  ('Luxury & premium', 'Use a refined, elegant, premium tone. Emphasize craftsmanship, exclusivity, and quality. Use sophisticated vocabulary. Avoid discounts or aggressive sales language.', true, 40),
  ('Playful & fun', 'Use a playful, witty, and fun tone. Add light humor and personality. Keep it energetic and memorable. Use emojis sparingly where appropriate.', true, 50),
  ('Minimal & direct', 'Be extremely concise and direct. No fluff, no filler. Short sentences. Get to the point immediately. Maximum clarity, minimum words.', true, 60),
  ('Storytelling', 'Use a narrative, storytelling approach. Paint a picture, evoke emotion, and connect with the reader through vivid scenarios and relatable moments.', true, 70),
  ('Bengali audience', 'Write for a Bangladeshi audience. Use culturally relevant references, local examples, and a tone that resonates with Bengali readers. Mix in light Banglish where it feels natural.', true, 80);

-- Default global context settings
INSERT INTO public.site_settings (key, value) VALUES
  ('ai_global_context', ''),
  ('ai_global_context_enabled', 'true')
ON CONFLICT (key) DO NOTHING;