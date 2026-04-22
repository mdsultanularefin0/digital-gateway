

## Plan: Fix build errors + Email control center + Universal digital download

### Part 1 — Fix build errors (blocking)

1. **`src/components/DownloadLinks.tsx`** — Replace missing `Upload` icon with `ExternalLink` (already-available lucide icon) and replace the unsupported `outline-success` button variant with `outline` plus a green text class. This unblocks the TS build.

2. **`supabase/functions/ai-generate/index.ts`** — Pin the Supabase import to a version that exists on the deploy CDN (`@supabase/supabase-js@2`) — same pattern as the working `mail` function. (The "Bundle generation timed out" error chain ends with this missing-package error.)

### Part 2 — Email "Mailing Order" control center

Goal: full control over which template fires for which product, in what order, plus a global default sequence.

**Schema changes** (one migration):
- Add `sort_order INT DEFAULT 0` to `product_email_templates` (per-template position in its category).
- New table `email_send_plan`:
  ```
  id, product_id (nullable = global default), category, template_id,
  step_order INT, delay_minutes INT DEFAULT 0, enabled BOOL, created_at
  ```
  Lets admins build an ordered sequence per product (or one global default plan) — e.g. step 1: order_confirmation immediately → step 2: post_purchase after 0 min → step 3: follow-up after 1440 min.
- New table `email_outbox` (queue): `id, order_id, template_id, send_at, status (pending|sent|failed|skipped), attempts, last_error, created_at, sent_at`. Used for delayed/sequenced sends.

**Edge function changes**:
- Refactor `send-order-confirmation` → resolve "send plan" for the order: per-product plan first, fall back to global default plan, fall back to existing single-template logic. Emails with `delay_minutes = 0` send immediately; non-zero rows are inserted into `email_outbox`.
- New function `process-email-outbox` (cron-callable, also manually triggerable) that drains due outbox rows. Cron added via migration: every 5 min.

**Admin UI** (`/admin/email-templates` gets a new "Send Plans" tab):
- **Global Default Plan** editor — drag-to-reorder list of category+template+delay rows. Used for any product with no custom plan.
- **Per-Product Plan** editor — pick a product, build its ordered list of templates with delays. Same drag-reorder UI.
- New tab on each template card: "Test send" — input email → invokes `send-order-confirmation` with `dry_run=false, override_recipient`.
- Existing template list keeps `sort_order` as secondary fallback ordering.

**Trigger surface (events)** — confirmed touchpoints, all already wired:
- Order placed (`useCheckout` → `send-order-confirmation`)
- Payment verified (`AdminOrders` payment status flip + `verify-send-money` + `bkash-payment` callback)
- Account auto-created (inside `send-order-confirmation`)
- Manual resend (`Account.tsx` "Resend link" + `OrderDetail`)

All paths route through the new plan resolver, so admins control everything from one place.

### Part 3 — Digital download for ALL downloadable + link products

Today `DownloadLinks` only shows `download_tokens` rows (created only for `delivery_type=download`). Link/external products produce `order_deliveries` rows, not tokens, so customers see nothing on `/account` for those.

Changes:
- Update `DownloadLinks.tsx` to also fetch `order_deliveries` for the order and render delivered link/code/account payloads alongside token-based downloads.
  - For `delivery_type='download'` files with `file_type='link'` → render "Open Link" button (already partly done — fixes the missing icon while we're there).
  - For deliveries with `delivery_type IN ('code','account','service')` → render code/credentials with copy + show/hide (mirrors existing `CustomerDeliveries` pattern).
  - Pending deliveries → "Awaiting fulfillment" notice.
- Add same combined view to `OrderSuccessInstructions` so the post-checkout screen immediately shows the delivered content for link/code products too (today only download tokens appear).
- Email rendering in `send-order-confirmation` already merges `product_files` into `productContentHtml`; extend it to also render `order_deliveries.payload.code` / `credential_extra` / external links so the email is complete for every delivery type.

### Files touched
- `src/components/DownloadLinks.tsx` (fix + extend to all delivery types)
- `src/components/OrderSuccessInstructions.tsx` (use extended view)
- `src/pages/admin/AdminEmailTemplates.tsx` (add Send Plans tab + Test Send)
- New: `src/components/admin/EmailSendPlanEditor.tsx`
- `supabase/functions/ai-generate/index.ts` (pin import — fixes deploy)
- `supabase/functions/send-order-confirmation/index.ts` (plan resolver + outbox enqueue + deliveries in HTML)
- New: `supabase/functions/process-email-outbox/index.ts`
- `supabase/config.toml` (register new function with `verify_jwt = false`)
- New migration: `email_send_plan`, `email_outbox`, `product_email_templates.sort_order`, pg_cron entry for outbox processor.

### Out of scope (ask if you want them)
- Per-customer-segment plans (e.g. VIP-only flow)
- A/B template variants
- HTML email designer beyond current Tiptap

