
-- Allow guests to see product and file names for their orders
-- This fixes the "Unknown Product" issue on the success page

-- 1. Product Files policy
DROP POLICY IF EXISTS "Guests can read files they have tokens for" ON public.product_files;
CREATE POLICY "Guests can read files they have tokens for"
ON public.product_files
FOR SELECT 
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.download_tokens dt
    JOIN public.orders o ON o.id = dt.order_id
    WHERE dt.product_file_id = product_files.id -- Corrected column name: product_file_id
    AND o.created_at > now() - interval '15 minutes'
  )
);

-- 2. Products policy (Ensure public visibility for names)
DROP POLICY IF EXISTS "Products viewable by everyone" ON public.products;
CREATE POLICY "Products viewable by everyone"
ON public.products
FOR SELECT
TO public
USING (true);

-- Ensure anon users can also see the product names via public
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
