ALTER TABLE public.products ADD COLUMN slug text;

-- Generate slugs for existing products from their names
UPDATE public.products
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;

-- Make slug NOT NULL and unique after populating
ALTER TABLE public.products ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN slug SET DEFAULT '';
ALTER TABLE public.products ADD CONSTRAINT products_slug_unique UNIQUE (slug);