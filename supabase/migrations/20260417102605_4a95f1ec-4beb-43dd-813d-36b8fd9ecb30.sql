CREATE TABLE public.sms_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient text NOT NULL,
  content text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'transactional',
  tag text NOT NULL DEFAULT '',
  provider text NOT NULL DEFAULT 'brevo',
  status text NOT NULL DEFAULT 'sent',
  message_id text NOT NULL DEFAULT '',
  error text NOT NULL DEFAULT '',
  remaining_credits numeric,
  raw_response jsonb,
  triggered_by text NOT NULL DEFAULT 'manual',
  order_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_logs_created_at ON public.sms_logs(created_at DESC);
CREATE INDEX idx_sms_logs_status ON public.sms_logs(status);
CREATE INDEX idx_sms_logs_type ON public.sms_logs(type);
CREATE INDEX idx_sms_logs_recipient ON public.sms_logs(recipient);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sms logs"
ON public.sms_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert sms logs"
ON public.sms_logs FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete sms logs"
ON public.sms_logs FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));