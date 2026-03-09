
CREATE TABLE public.product_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  badge text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tiers viewable by everyone" ON public.product_tiers FOR SELECT USING (true);
CREATE POLICY "Admins can insert tiers" ON public.product_tiers FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update tiers" ON public.product_tiers FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete tiers" ON public.product_tiers FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
