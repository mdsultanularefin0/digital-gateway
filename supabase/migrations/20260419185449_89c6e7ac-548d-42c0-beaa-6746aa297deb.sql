-- Models registry for OpenRouter (admin-editable list)
CREATE TABLE public.ai_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read ai_models"
  ON public.ai_models FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert ai_models"
  ON public.ai_models FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ai_models"
  ON public.ai_models FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ai_models"
  ON public.ai_models FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_ai_models_updated_at
  BEFORE UPDATE ON public.ai_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.ai_models (model_id, label, is_default, sort_order) VALUES
  ('google/gemini-2.5-flash', 'Gemini 2.5 Flash (fast, cheap)', true, 10),
  ('google/gemini-2.5-pro', 'Gemini 2.5 Pro (best quality)', false, 20),
  ('openai/gpt-4o-mini', 'GPT-4o Mini (balanced)', false, 30),
  ('openai/gpt-4o', 'GPT-4o (powerful)', false, 40),
  ('anthropic/claude-sonnet-4', 'Claude Sonnet 4', false, 50),
  ('meta-llama/llama-4-maverick', 'Llama 4 Maverick (free)', false, 60);