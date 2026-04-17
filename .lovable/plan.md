
Plan based on user answers. 4 product types, dual delivery (auto for verified payments, manual otherwise), with email + account dashboard + success page, plus a "drive-like" download hub for large/many files.

## Product Types & Delivery Matrix

```text
TYPE                    | INVENTORY        | DELIVERY                          | TRIGGER
------------------------|------------------|-----------------------------------|------------------
1. Code / License Key   | Code pool OR     | Code shown on success page,       | Auto on paid
   (gift cards, keys)   | manual entry     | emailed, visible in /account      | (PGW + verified MFS)
2. Account Credentials  | Account pool OR  | Email+password shown + emailed    | Auto on paid
   (email + password)   | manual entry     | + visible in /account             | (same)
3. Downloadable Files   | product_files    | Secure tokens (existing) +        | Auto on paid
   (ebooks, videos)     | (existing)       | Download Hub page for many files  | (same)
4. Top-up Service       | none — manual    | Admin marks "fulfilled" + note;   | Manual only
   (game $, ad credits) |                  | customer sees status in /account  |
```

**Manual fallback for all types:** when MFS payment can't be auto-verified, order sits in "awaiting fulfillment" — admin opens it, assigns/pastes the deliverable, clicks "Deliver" → email + dashboard updated.

## Architecture

**New `delivery_type` column on `products`:** `download | code | account | service`. Drives which fulfillment UI shows in admin and what customer sees.

**New tables:**
- `product_codes` — pool of pre-loaded codes/accounts per product. Columns: `id, product_id, code_value (text, encrypted), credential_extra (text, for password if account type), status (available|assigned|disabled), assigned_order_id, assigned_at`.
- `order_deliveries` — what was actually given to the customer per order item. Columns: `id, order_id, order_item_id, delivery_type, payload (jsonb: code, username, password, note, file_token_ids), status (pending|delivered|failed), delivered_at, delivered_by`.
- Keep existing `download_tokens` and `product_files` for type 3.

**Auto-assignment trigger:** when `orders.payment_status` flips to `paid`, a DB function loops through order items and:
- type `download` → existing `generate_download_tokens` runs
- type `code` / `account` → pull next `available` row from `product_codes`, mark assigned, write to `order_deliveries`. If pool empty → mark `pending`, notify admin.
- type `service` → just create `order_deliveries` row with status `pending` for admin to action

**Email:** existing `send-order-confirmation` is extended to read `order_deliveries` and inject the deliverable (code, login, download links list) into the post-purchase email template.

## Download Hub (for big/many files)

New customer-facing page `/account/downloads/:orderId` ("Drive-like" view):
- Folder-style list grouped by product, all files in one place
- Bulk "Download all as ZIP" (edge function streams a zip on demand)
- Per-file resumable download via existing `secure-download` tokens with extended expiry (configurable, default 7 days, regenerable on request)
- Persistent — customer can return anytime as long as order exists; tokens auto-regenerate if expired

Order success page shows a single "Open my Download Hub" button instead of a long file list when 3+ files exist.

## Admin UI changes

**Product editor (`AdminProducts.tsx`):**
- New "Delivery Type" dropdown
- When `code` / `account` → show **Code Pool Manager** (paste-list bulk add, CSV import, view stock count, low-stock badge)
- When `download` → existing `DigitalFilesEditor`
- When `service` → instructions textarea ("Manual fulfillment — admin will deliver after payment")

**Order detail (`OrderDetail.tsx`):**
- New "Fulfillment" panel showing `order_deliveries` per item
- For unfulfilled items: paste-code box / paste-account box / "mark service done" button
- "Resend delivery email" button
- Stock warning if a product's pool is empty when order arrives

**New admin page `/admin/inventory`:** quick view of code pool levels per product, with low-stock alerts.

## Customer-facing changes

- `/account` order list shows fulfillment status badge per order
- Order detail in `/account` shows the deliverable (code revealed with copy button, account credentials, or Download Hub link)
- "Resend my email" button per order

## Implementation Steps (high-level)

1. **DB migration** — add `delivery_type` column, create `product_codes`, `order_deliveries`, add trigger function for auto-assignment
2. **Admin Code Pool Manager** component + integration in product editor
3. **Order fulfillment panel** in `OrderDetail.tsx` + manual delivery flow
4. **Update `send-order-confirmation`** edge function to render deliverables
5. **Customer `/account` order detail** — show deliverables
6. **Download Hub** page + ZIP-streaming edge function
7. **Admin Inventory** dashboard page

## Open question for after approval

For codes/accounts: should the code pool be **encrypted at rest** (extra security, codes only decrypted on delivery) or stored plain (simpler, relies on RLS)? Default recommendation: plain text with strict admin-only RLS — matches current pattern and keeps complexity low. Can upgrade later.
