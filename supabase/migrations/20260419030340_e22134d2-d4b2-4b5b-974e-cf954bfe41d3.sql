DROP TRIGGER IF EXISTS auto_fulfill_on_payment ON public.orders;

CREATE TRIGGER auto_fulfill_on_payment
AFTER INSERT OR UPDATE OF payment_status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_auto_fulfill();