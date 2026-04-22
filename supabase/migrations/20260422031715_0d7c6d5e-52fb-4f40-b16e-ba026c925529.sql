-- 1. Clean up the older duplicate pending row so we can add the unique constraint
UPDATE public.transactions
SET status = 'rejected',
    raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object('rejected_reason', 'duplicate_trx_id_cleanup', 'rejected_at', now()::text),
    updated_at = now()
WHERE id = 'fb4511eb-4118-4a56-8b3b-0a91dadc052e';

-- 2. Prevent same trx_id+provider from being used across multiple non-rejected transactions
CREATE UNIQUE INDEX IF NOT EXISTS transactions_trx_provider_active_idx
ON public.transactions (trx_id, provider)
WHERE trx_id <> '' AND status <> 'rejected';

-- 3. Prevent the same verification record from being claimed by multiple orders
CREATE UNIQUE INDEX IF NOT EXISTS send_money_verifications_matched_order_idx
ON public.send_money_verifications (matched_order_id)
WHERE matched_order_id IS NOT NULL;
