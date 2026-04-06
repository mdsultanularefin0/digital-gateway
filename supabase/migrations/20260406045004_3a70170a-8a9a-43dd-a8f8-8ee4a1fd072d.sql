
-- Create transactions table to store all payment transactions
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_number text NOT NULL DEFAULT '',
  payment_method text NOT NULL DEFAULT '',
  provider text NOT NULL DEFAULT '',
  sender_number text NOT NULL DEFAULT '',
  trx_id text NOT NULL DEFAULT '',
  payment_id text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BDT',
  status text NOT NULL DEFAULT 'pending',
  customer_name text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  raw_response jsonb DEFAULT NULL,
  verified_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage transactions"
ON public.transactions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Edge functions can insert (service role bypasses RLS anyway)
-- Users can view own transactions
CREATE POLICY "Users can view own transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (customer_email = lower(auth.jwt() ->> 'email'));

-- Index for lookups
CREATE INDEX idx_transactions_order_id ON public.transactions(order_id);
CREATE INDEX idx_transactions_trx_id ON public.transactions(trx_id);
CREATE INDEX idx_transactions_payment_method ON public.transactions(payment_method);
