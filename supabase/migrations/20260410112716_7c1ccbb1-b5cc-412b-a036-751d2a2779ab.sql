
CREATE TABLE public.send_money_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trx_id text NOT NULL UNIQUE,
  sender_number text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  provider text NOT NULL DEFAULT '',
  verified boolean NOT NULL DEFAULT true,
  raw_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.send_money_verifications ENABLE ROW LEVEL SECURITY;

-- Admin read access
CREATE POLICY "Admins can view verifications"
ON public.send_money_verifications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
