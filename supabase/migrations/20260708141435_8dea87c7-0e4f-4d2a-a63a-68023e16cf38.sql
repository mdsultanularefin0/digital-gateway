
CREATE OR REPLACE FUNCTION public.trigger_auto_fulfill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid') THEN
    PERFORM public.auto_fulfill_order(NEW.id);

    -- Fire-and-forget call to issue-license edge function
    BEGIN
      PERFORM net.http_post(
        url := 'https://hlkjlkjxkmjklrsffvrs.supabase.co/functions/v1/issue-license',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object('order_id', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      -- Never block the order update if the async call fails
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS orders_auto_fulfill ON public.orders;
CREATE TRIGGER orders_auto_fulfill
AFTER UPDATE OF payment_status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_auto_fulfill();
