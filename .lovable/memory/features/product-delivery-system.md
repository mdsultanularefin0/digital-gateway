---
name: Product Delivery System
description: 4 product delivery types (download/code/account/service) with auto-fulfillment trigger, code pool, and per-order delivery records
type: feature
---
Products have a `delivery_type`: download | code | account | service.

**Tables:** `product_codes` (pool of available codes/accounts per product, status: available/assigned/disabled), `order_deliveries` (per-order-item record of what was delivered, payload jsonb).

**Auto-fulfillment:** DB trigger `auto_fulfill_on_payment` runs on orders when `payment_status` flips to `paid`. Function `auto_fulfill_order(order_id)` loops items and:
- download → calls existing `generate_download_tokens` + creates delivered row
- code/account → pulls next available `product_codes` row (FOR UPDATE SKIP LOCKED), assigns it, creates delivered row with code/credentials in payload
- service → creates pending row for manual admin action
- pool empty → creates pending row with `payload.reason = 'pool_empty'`

**Admin UI:** `CodePoolManager` (paste-list bulk add in product editor when type=code/account), `FulfillmentPanel` (in OrderDetail, shows deliveries, allows manual paste-and-deliver for pending), `/admin/inventory` page for pool levels with low-stock badges (<5).

**Customer UI:** `CustomerDeliveries` component on `/account` order list reveals codes with copy button and show/hide toggle.

**Email:** `send-order-confirmation` reads `order_deliveries` and renders a styled deliverables block (codes, credentials, pending notices) in the post-purchase email.

**Manual fallback for unverified MFS:** order stays unpaid, admin marks paid manually → trigger fires → admin uses FulfillmentPanel to paste code if pool was empty.
