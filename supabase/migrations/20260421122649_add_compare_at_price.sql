-- Add compare_at_price column to products table
-- This is the original / "crossed out" price used to show a discount
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS compare_at_price numeric DEFAULT NULL;

COMMENT ON COLUMN products.compare_at_price IS 'Original / base price shown with a strikethrough. When set and higher than price, a discount badge is displayed.';
