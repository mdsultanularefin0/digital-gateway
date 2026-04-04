
CREATE TABLE public.product_email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  is_global BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email templates" ON public.product_email_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read active templates" ON public.product_email_templates
  FOR SELECT TO anon, authenticated
  USING (active = true);
