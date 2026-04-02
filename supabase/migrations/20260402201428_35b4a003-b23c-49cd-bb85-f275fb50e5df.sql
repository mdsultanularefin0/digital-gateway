
-- Product digital files table
CREATE TABLE public.product_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  filename TEXT NOT NULL DEFAULT '',
  file_type TEXT NOT NULL DEFAULT 'ebook',
  file_size BIGINT NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage product files" ON public.product_files FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Product files viewable by everyone" ON public.product_files FOR SELECT TO public USING (true);

-- Download tokens table
CREATE TABLE public.download_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_file_id UUID NOT NULL REFERENCES public.product_files(id) ON DELETE CASCADE,
  token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_downloads INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(token)
);

ALTER TABLE public.download_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage download tokens" ON public.download_tokens FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own download tokens" ON public.download_tokens FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.orders WHERE orders.id = download_tokens.order_id AND orders.customer_email = lower(auth.jwt() ->> 'email')
  )
);

CREATE POLICY "Anon can view tokens by token value" ON public.download_tokens FOR SELECT TO anon USING (true);

-- RPC to generate download tokens for an order's digital products
CREATE OR REPLACE FUNCTION public.generate_download_tokens(_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _expiry_hours INTEGER;
  _max_dl INTEGER;
  _file RECORD;
BEGIN
  SELECT COALESCE(NULLIF(value, ''), '168')::INTEGER INTO _expiry_hours
  FROM public.site_settings WHERE key = 'download_expiry_hours';
  IF _expiry_hours IS NULL THEN _expiry_hours := 168; END IF;

  SELECT COALESCE(NULLIF(value, ''), '5')::INTEGER INTO _max_dl
  FROM public.site_settings WHERE key = 'download_max_count';
  IF _max_dl IS NULL THEN _max_dl := 5; END IF;

  FOR _file IN
    SELECT pf.id AS product_file_id
    FROM public.order_items oi
    JOIN public.product_files pf ON pf.product_id = oi.product_id
    WHERE oi.order_id = _order_id
      AND NOT EXISTS (
        SELECT 1 FROM public.download_tokens dt
        WHERE dt.order_id = _order_id AND dt.product_file_id = pf.id
      )
  LOOP
    INSERT INTO public.download_tokens (order_id, product_file_id, expires_at, max_downloads)
    VALUES (
      _order_id,
      _file.product_file_id,
      CASE WHEN _expiry_hours > 0 THEN now() + (_expiry_hours || ' hours')::INTERVAL ELSE NULL END,
      _max_dl
    );
  END LOOP;
END;
$$;
