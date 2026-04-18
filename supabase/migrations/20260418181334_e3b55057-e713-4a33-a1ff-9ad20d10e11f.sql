-- Edge function logs table (24h retention)
CREATE TABLE public.edge_function_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',
  status_code INTEGER NOT NULL DEFAULT 200,
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_edge_function_logs_function_created
  ON public.edge_function_logs (function_name, created_at DESC);
CREATE INDEX idx_edge_function_logs_created_at
  ON public.edge_function_logs (created_at DESC);

ALTER TABLE public.edge_function_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view edge function logs"
  ON public.edge_function_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert edge function logs"
  ON public.edge_function_logs FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete edge function logs"
  ON public.edge_function_logs FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow service role inserts (edge functions use service key)
CREATE POLICY "Service role can insert edge function logs"
  ON public.edge_function_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Cleanup function: delete logs older than 24h
CREATE OR REPLACE FUNCTION public.cleanup_edge_function_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Probabilistic cleanup: only run ~5% of the time to avoid overhead on every insert
  IF random() < 0.05 THEN
    DELETE FROM public.edge_function_logs
    WHERE created_at < now() - interval '24 hours';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_cleanup_edge_function_logs
AFTER INSERT ON public.edge_function_logs
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_edge_function_logs();