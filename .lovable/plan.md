

## Customer Experience Expansion Plan

We'll add four features: order tracking, product image gallery, customer reviews on product pages, and wishlist functionality, plus an order confirmation email.

---

### 1. Order Tracking Page

**New page**: `src/pages/OrderTrack.tsx` — accessible at `/track`

- Simple form: order number + email
- Queries orders via a new SECURITY DEFINER RPC `track_order` that returns order status, items, and timestamps (no PII leak — only returns data matching both order_number AND customer_email)
- Shows order timeline: Pending → Processing → Shipped → Delivered
- Add route to `App.tsx`, add "Track Order" link to Footer and Header nav

**Database**: New RPC function `track_order(_order_number text, _email text)` that returns order details + items securely.

---

### 2. Product Image Gallery

**Database**: New `product_images` table:
- `id`, `product_id` (FK), `image_url`, `alt_text`, `sort_order`, `created_at`
- RLS: public SELECT, admin-only INSERT/UPDATE/DELETE

**ProductDetail.tsx changes**:
- Fetch product images from `product_images` table
- If images exist, render a thumbnail gallery with main image display (clickable thumbnails swap the main image)
- Fallback to current placeholder if no images uploaded

**ProductCard.tsx changes**:
- Use first product image (if available) instead of the letter placeholder

**Admin**: Add image upload section to `AdminProducts.tsx` — upload to `product-images` storage bucket, save URLs to `product_images` table.

---

### 3. Customer Reviews on Product Pages

**Frontend changes to ProductDetail.tsx**:
- Fetch approved reviews from `reviews_public` view filtered by `product_id`
- Replace static testimonials section with real reviews (star rating, name, content, date)
- Show average rating and count
- Add "Write a Review" form (name, email, rating stars, title, content) — submits to `reviews` table with `approved: false`

**Database**: Add RLS policy for anon/authenticated INSERT on `reviews` table (guests can submit reviews).

---

### 4. Wishlist (localStorage)

**New context**: `src/contexts/WishlistContext.tsx`
- Store product IDs in localStorage
- `addToWishlist`, `removeFromWishlist`, `isInWishlist` functions

**UI changes**:
- Heart icon on `ProductCard` and `ProductDetail` pages (toggle wishlist)
- New `/wishlist` page showing saved products with "Add to Cart" buttons
- Add route to `App.tsx`, add heart icon to Header

---

### 5. Order Confirmation Email

**New edge function**: `supabase/functions/send-order-confirmation/index.ts`
- Triggered after order creation in `Checkout.tsx`
- Uses Lovable AI to format a branded HTML email with order details
- Sends via the transactional email system

**Checkout.tsx**: After successful order placement, call the edge function (non-blocking, like the existing webhook call).

---

### Summary of Changes

| Area | Files |
|------|-------|
| Order tracking | New `OrderTrack.tsx`, new RPC, `App.tsx`, `Footer.tsx`, `Header.tsx` |
| Image gallery | New `product_images` table, `ProductDetail.tsx`, `ProductCard.tsx`, `AdminProducts.tsx` |
| Reviews | `ProductDetail.tsx`, new review form component, reviews INSERT policy |
| Wishlist | New `WishlistContext.tsx`, new `Wishlist.tsx` page, `ProductCard.tsx`, `ProductDetail.tsx`, `Header.tsx`, `App.tsx` |
| Confirmation email | New edge function, `Checkout.tsx` |
| Database | 1 migration: `product_images` table + `track_order` RPC + reviews INSERT policy |

