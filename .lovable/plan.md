
**Site-wide bilingual (EN/BN) overhaul.** Auto-detect with manual override, persisted in localStorage. Admin can edit content in both languages everywhere; AI translation buttons assist.

## 1. Language infrastructure
- **`LanguageContext`** (new) — provides `lang: "en" | "bn"`, `setLang`, `t(en, bn)`. Auto-detects from `navigator.language` on first visit, persists to `localStorage("lang")`.
- **`LanguageToggle`** component — EN / বাং pill, added to `Header` (desktop + mobile).
- **`useTranslation` hook** — small UI-strings dictionary in `src/lib/i18n.ts` (header nav, buttons, footer, common labels, checkout labels, account labels). Easy to extend.

## 2. Database — bilingual content storage
**New `product_translations` table** (separate, scales clean):
- `product_id, lang ('en'|'bn'), name, tagline, description, features (text[])`
- Unique on `(product_id, lang)`. Public read, admin write.

**Extend `page_contents`** — already has `(page_slug, section_key, content)`. Add `lang` column with default `'en'`, unique on `(page_slug, section_key, lang)`. Existing rows become `lang='en'`.

**Extend `blog_posts`** — add `title_bn, excerpt_bn, content_bn` columns (nullable). BN falls back to EN if empty.

## 3. Admin editing
- **`AdminProducts.tsx` editor** — add "EN | BN" tab switcher inside the product modal. BN tab shows the same fields (name, tagline, description, features). "Translate to Bangla" button per field calls a new `translate` edge function.
- **`AdminPageEditor.tsx`** — add EN/BN tab on each section, "Translate EN→BN" button per section.
- **`AdminBlog.tsx`** — add EN/BN tabs, "Translate post to BN" button.
- **New site-strings CMS section** in `AdminSettings` — admins can override hardcoded UI strings (nav labels, hero CTA, footer text) in BN.

## 4. AI translation
- **New edge function `translate`** — accepts `{ text, target: 'bn'|'en', context?: 'product'|'page'|'blog' }`. Calls Lovable AI (`google/gemini-3-flash-preview`) with a translation system prompt tuned for BD digital commerce. Returns translated text.
- Reused by all three editors via a shared `<TranslateButton>` component.

## 5. Customer-facing rendering
- `ProductCard`, `ProductDetail`, `Products` page — read translation row matching current `lang`, fall back to base EN columns if BN missing.
- Static pages (Home, About, Contact, FAQ, Privacy, Terms) — read `page_contents` with current `lang`, fall back to EN.
- `Blog` / `BlogPost` — same fallback pattern using `_bn` columns.
- `Checkout`, `Account`, `OrderSuccessInstructions` — already supports BN in instructions; UI labels (form labels, buttons, cart) translated via `t()`.
- `Header`, `Footer`, `CartDrawer` — translated via `t()`.

## 6. Implementation order
1. **DB migration** — `product_translations` table, `page_contents.lang`, `blog_posts._bn` columns
2. **`LanguageContext` + `i18n.ts` + `LanguageToggle`** in `Header`
3. **`translate` edge function** + shared `<TranslateButton>` component
4. **Admin editors** — Products, Pages, Blog get EN/BN tabs and AI buttons
5. **Customer pages** — Products, ProductDetail, Blog, BlogPost, static pages read translated content
6. **UI strings** — Header, Footer, Cart, Checkout, Account use `t()`

## Notes / scope discipline
- I will NOT touch Landing pages (`/p/:slug`) — they already have full bilingual support.
- UI string dictionary covers ~60–80 common strings; long-tail strings can be added later.
- BN font: keep Plus Jakarta Sans — it has decent Bangla rendering; if you want a dedicated BN font (e.g. Hind Siliguri or Noto Sans Bengali) say the word.
- This is a multi-step build (~20 files). I'll commit DB migration first, then build in passes.
