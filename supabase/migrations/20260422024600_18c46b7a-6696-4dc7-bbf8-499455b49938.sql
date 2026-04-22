-- 1. Add sort_order to existing templates
ALTER TABLE public.product_email_templates
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- 2. Email send plan: ordered sequence per product (or global default)
CREATE TABLE IF NOT EXISTS public.email_send_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'post_purchase',
  template_id uuid NOT NULL REFERENCES public.product_email_templates(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 0,
  delay_minutes integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_send_plan_product ON public.email_send_plan(product_id);
CREATE INDEX IF NOT EXISTS idx_email_send_plan_template ON public.email_send_plan(template_id);

ALTER TABLE public.email_send_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage send plans"
ON public.email_send_plan
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_email_send_plan_updated_at
BEFORE UPDATE ON public.email_send_plan
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Email outbox: scheduled/queued emails
CREATE TABLE IF NOT EXISTS public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.product_email_templates(id) ON DELETE CASCADE,
  send_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_due ON public.email_outbox(status, send_at);
CREATE INDEX IF NOT EXISTS idx_email_outbox_order ON public.email_outbox(order_id);

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage outbox"
ON public.email_outbox
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Schedule outbox processor every 5 minutes
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  _job_id bigint;
BEGIN
  SELECT jobid INTO _job_id FROM cron.job WHERE jobname = 'process-email-outbox-every-5min';
  IF _job_id IS NOT NULL THEN
    PERFORM cron.unschedule(_job_id);
  END IF;
END $$;

SELECT cron.schedule(
  'process-email-outbox-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hlkjlkjxkmjklrsffvrs.supabase.co/functions/v1/process-email-outbox',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsa2psa2p4a21qa2xyc2ZmdnJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODA0OTksImV4cCI6MjA4ODU1NjQ5OX0.Ff_OiaFgcIKHq13SlhuWLxcLxe6upUsohE0_YvV1axU"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);