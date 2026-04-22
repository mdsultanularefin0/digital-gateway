

## Plan: Consolidate mailing system (remove duplication, add logging, prevent duplicates)

Goal: one SMTP path, one config loader, one from-address resolver, full logging, and no duplicate sequences.

### 1. Shared modules (new)
- **`supabase/functions/_shared/mail-config.ts`** — single `getMailConfig(svc)` + `resolveFrom(cfg, category)`. Category map:
  - `account_created`, `password_reset` → `from_notifications`
  - `order_confirmation`, `payment_verified`, `post_purchase`, `shipping`, `refund` → `from_orders`
  - `newsletter` → `from_newsletter`
  - everything else → `from_support` (fallback chain to `smtp_from` → `smtp_username`)
- **`supabase/functions/_shared/smtp.ts`** — single `smtpSend(cfg, { to, subject, html, text?, fromName?, replyTo? })` — port the robust version from `mail/index.ts` (STARTTLS, AUTH PLAIN→LOGIN fallback, response-code checks, dot-stuffing, raw body write).
- **`supabase/functions/_shared/email-logger.ts`** — `logEmail(svc, { recipient, sender, subject, purpose, status, error?, triggered_by? })` writing to `email_logs`.

### 2. Refactor existing functions to use shared modules
- **`supabase/functions/mail/index.ts`** — replace inline `smtpSend` / `getMailConfig` / `resolveFrom` with imports from `_shared`. Behavior unchanged.
- **`supabase/functions/send-order-confirmation/index.ts`**:
  - Remove its private `sendEmail()` and config loader; use the shared SMTP + config.
  - Resolve `From` via the shared category map (fixes `account_created` going out from `from_orders`).
  - On every send (success or failure), call `logEmail()` so order/account/post-purchase emails appear in `/admin/email-logs`.
  - Use site name as the `From:` display name (no more hardcoded "GiftCardVibe Support" in order mail).
- **`supabase/functions/process-email-outbox/index.ts`** — unchanged behavior (still re-invokes `send-order-confirmation`), but inherits logging via the refactor.

### 3. Database hardening (migration)
- Add `UNIQUE (order_id, template_id)` on `email_outbox` to stop duplicate scheduled steps when the order trigger fires twice (manual resend, payment-verified flip, webhook retry).
- Update outbox enqueue in `send-order-confirmation` to `.upsert(..., { onConflict: 'order_id,template_id', ignoreDuplicates: true })`.
- Add `UNIQUE (order_id, template_id, COALESCE(extract(epoch from sent_at)::bigint, 0))` partial index? — skipped, too brittle. Instead: add `sent_orders_templates` guard via a small helper that checks `email_logs` for a matching `(recipient, subject, status='sent')` within last 60s before re-sending the same template — prevents accidental double-sends from rapid retriggers.

### 4. Admin visibility
- `AdminEmailLogs.tsx` — already lists logs; no schema change needed. After the refactor, order-confirmation, account-created, payment-verified, and outbox-driven emails will all show up here with correct `purpose` (= template `category`) and `triggered_by` (= `order:<id>` or `outbox`).

### Files touched
- New: `supabase/functions/_shared/mail-config.ts`, `_shared/smtp.ts`, `_shared/email-logger.ts`
- Edited: `supabase/functions/mail/index.ts`
- Edited: `supabase/functions/send-order-confirmation/index.ts`
- New migration: unique index on `email_outbox(order_id, template_id)`
- Deploy: `mail`, `send-order-confirmation`, `process-email-outbox`

### What this fixes
- One SMTP implementation, not two divergent copies.
- Account-created emails finally use the notifications sender, not orders.
- Every outgoing email — admin test, order confirm, account, post-purchase, outbox — appears in `/admin/email-logs` with status + error.
- Re-firing the order trigger no longer queues the same template twice.

### Out of scope
- Replacing the custom SMTP path with Lovable's built-in email queue (would change sender domain + require domain re-verification — ask separately if you want that).
- Per-recipient bounce/complaint handling.

