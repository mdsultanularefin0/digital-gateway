

## Plan: Send Money Verification via n8n Webhook

### What we're building

Instead of the current outbound webhook verification, we'll create an **inbound webhook** that n8n calls to push verified send money data into a dedicated table. When n8n confirms a transaction, the system auto-completes the order.

### Changes

**1. New database table: `send_money_verifications`**

Stores verified send money records pushed by n8n:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| trx_id | text | unique, the MFS transaction ID |
| sender_number | text | sender's mobile number |
| amount | numeric | verified amount |
| provider | text | "bkash" or "nagad" |
| verified | boolean | default true |
| raw_data | jsonb | full payload from n8n |
| created_at | timestamptz | auto |

RLS: service-role only (no public access needed since edge function uses service role key).

**2. New edge function: `mfs-webhook`**

An inbound webhook endpoint that n8n calls with verified transaction data:
- Accepts POST with `trx_id`, `sender_number`, `amount`, `provider`, and optional extra fields
- Inserts into `send_money_verifications`
- Looks up matching pending transaction by `trx_id`
- If found: auto-marks order as `paid`/`completed`, generates download tokens, sends confirmation email
- Returns success/failure JSON

**3. Simplify `verify-send-money` edge function**

Remove the outbound webhook verification block (lines 92-162). The function will only:
- Validate input and store send money details on the order
- Insert a pending transaction record
- Return "awaiting verification" — n8n handles the rest asynchronously

**4. Admin visibility (optional)**

The existing Transactions page already shows all records. No new admin page needed, but the `send_money_verifications` table provides a separate audit trail of n8n-confirmed payments.

### Technical details

- `mfs-webhook` will use `verify_jwt = false` in `config.toml` (n8n can't send JWTs)
- Optional: support a shared secret header (`x-webhook-secret`) checked against a `site_settings` key for security
- The `mfs-webhook` function matches transactions by `trx_id` to link verification to the correct order

