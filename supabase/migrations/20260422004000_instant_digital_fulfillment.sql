
-- Update the auto-fulfillment trigger to run on INSERT as well
-- This ensures that downloadable items and links are ready for the Success Page
-- immediately after the order is placed, even before payment is verified.

DROP TRIGGER IF EXISTS auto_fulfill_on_payment ON public.orders;

CREATE OR REPLACE FUNCTION public.trigger_auto_fulfill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Run fulfillment if payment status just became 'paid'
  -- OR run fulfillment for brand-new orders (to ensure digital goods are ready for Success Page)
  IF (TG_OP = 'INSERT') OR 
     (NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid')) THEN
    PERFORM public.auto_fulfill_order(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_fulfill_on_payment
  AFTER INSERT OR UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_fulfill();
