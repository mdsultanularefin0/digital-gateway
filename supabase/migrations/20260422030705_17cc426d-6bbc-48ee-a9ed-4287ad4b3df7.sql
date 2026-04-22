-- Prevent duplicate scheduled emails for the same (order, template) pair.
-- Use a partial unique index so retried "failed" rows don't block legitimate re-queues.
CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_order_template_active_idx
  ON public.email_outbox (order_id, template_id)
  WHERE status IN ('pending', 'sent');