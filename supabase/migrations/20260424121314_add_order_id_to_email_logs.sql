ALTER TABLE public.email_logs ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;
CREATE INDEX idx_email_logs_order_id ON public.email_logs(order_id);
