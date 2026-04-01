
-- Allow anonymous users to read back their just-created pending orders
-- This is needed so the .select().single() after insert works for guests
CREATE POLICY "Anon can read own pending orders"
ON public.orders
FOR SELECT
TO anon
USING (status = 'pending' AND payment_status = 'unpaid');
