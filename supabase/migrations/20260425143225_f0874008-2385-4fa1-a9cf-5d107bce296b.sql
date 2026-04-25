CREATE TABLE public.event_tracking_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL DEFAULT '',
  event_id TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'capi',
  status TEXT NOT NULL DEFAULT 'pending',
  http_status INTEGER,
  events_received INTEGER,
  match_quality NUMERIC,
  order_number TEXT NOT NULL DEFAULT '',
  event_source_url TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  user_data_keys TEXT[] NOT NULL DEFAULT '{}',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.event_tracking_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view event tracking logs"
ON public.event_tracking_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage event tracking logs"
ON public.event_tracking_logs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert event tracking logs"
ON public.event_tracking_logs
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE INDEX idx_event_tracking_logs_created_at ON public.event_tracking_logs (created_at DESC);
CREATE INDEX idx_event_tracking_logs_event_name ON public.event_tracking_logs (event_name);
CREATE INDEX idx_event_tracking_logs_status ON public.event_tracking_logs (status);
CREATE INDEX idx_event_tracking_logs_event_id ON public.event_tracking_logs (event_id);
CREATE INDEX idx_event_tracking_logs_order_number ON public.event_tracking_logs (order_number);