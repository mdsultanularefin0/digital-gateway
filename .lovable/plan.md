

## Landing Pages with Embedded Checkout

### What Changes

Landing pages become self-contained sales funnels. Every CTA button scrolls to a checkout form at the bottom of the page instead of linking to external URLs. The product info (name, price, image) comes from the landing page's own section data — no redirection to `/products` or `/checkout`.

### Architecture

```text
Landing Page (/p/:slug)
├── Hero Section          ← CTA scrolls to #checkout
├── Features Section
├── Pricing Section       ← CTA scrolls to #checkout
├── Testimonials
├── FAQ
├── Countdown             ← CTA scrolls to #checkout
├── Final CTA             ← CTA scrolls to #checkout
└── ★ Embedded Checkout Section (NEW)
    ├── Product Summary (from pricing section data)
    ├── Contact Form (name, email, phone)
    ├── Address
    ├── Payment Method
    ├── Coupon Code
    └── Place Order button
```

### Implementation Steps

**1. Add `checkout` section type to templates** (`src/data/landing-templates.ts`)
- Add `"checkout"` to the `LandingSection.type` union
- Add a `{ id: "checkout", type: "checkout", label: "Checkout" }` section as the last section in every template (except `coming-soon`)
- Add `productName` field to `SectionContent` interface for the checkout to know the product

**2. Make all CTA buttons scroll to `#checkout`** (`src/pages/LandingPage.tsx`)
- In every section renderer (Hero, CTA, Pricing, Countdown), change button behavior: if `buttonUrl` is empty or `#`, scroll to the `#checkout` element using `document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth' })`
- Replace `<a href={...}>` with `<button onClick={scrollToCheckout}>` pattern for internal CTAs

**3. Create `LandingCheckoutSection` component** (`src/pages/LandingPage.tsx`)
- New section renderer that embeds a full checkout form directly in the landing page
- Extracts product info (name, price, image) from the page's pricing section data
- Contains: contact fields (name, email, phone), address textarea, payment method radio buttons, coupon input, order summary, and Place Order button
- Order placement logic reuses the same Supabase flow from `Checkout.tsx`: `upsert_checkout_customer` RPC, insert into `orders` + `order_items`, fire webhook + email confirmation, handle bKash redirect
- Shows success state inline after order is placed
- The checkout section gets `id="checkout"` on its container div

**4. Update `SectionEditor`** (`src/components/admin/SectionEditor.tsx`)
- Add `checkout` to the recognized section types
- Show minimal editable fields for checkout: heading (e.g. "Complete Your Order"), subheading, button text (e.g. "Place Order")

**5. Update `AdminLandingPages.tsx`**
- The checkout section is auto-included in templates, so no special handling needed beyond what `SectionEditor` provides

### Key Details

- Product name and price are pulled from the `pricing` section's content (heading + price fields) of the same landing page — no need for a separate product ID
- Payment methods are loaded from `site_settings` (same as main checkout)
- Coupon validation uses the same `coupons` table query
- The `order_items` entry uses the landing page title as `product_name` and the pricing section price as `unit_price`
- bKash flow redirects to `/bkash/callback` and works as before
- No cart involvement — the landing page is a single-product direct purchase

