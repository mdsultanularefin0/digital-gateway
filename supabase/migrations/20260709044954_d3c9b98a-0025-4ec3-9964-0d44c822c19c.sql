CREATE OR REPLACE FUNCTION public.trigger_auto_fulfill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _function_url text;
  _request_id bigint;
BEGIN
  IF NEW.payment_status = 'paid' AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid') THEN
    RAISE LOG 'trigger_auto_fulfill: starting for order %, operation %', NEW.id, TG_OP;

    PERFORM public.auto_fulfill_order(NEW.id);

    SELECT NULLIF(trim(value), '') INTO _function_url
    FROM public.site_settings
    WHERE key = 'issue_license_function_url'
    LIMIT 1;

    IF _function_url IS NULL THEN
      RAISE WARNING 'trigger_auto_fulfill: issue_license_function_url is not configured; skipped issue-license call for order %', NEW.id;
      RETURN NEW;
    END IF;

    BEGIN
      SELECT net.http_post(
        url := _function_url,
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object('order_id', NEW.id)
      ) INTO _request_id;

      RAISE LOG 'trigger_auto_fulfill: queued issue-license request % for order % to %', _request_id, NEW.id, _function_url;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'trigger_auto_fulfill: issue-license request failed for order %: % [%]', NEW.id, SQLERRM, SQLSTATE;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trigger_auto_fulfill failed for order %: % [%]', NEW.id, SQLERRM, SQLSTATE;
  RAISE;
END;
$function$;

DROP TRIGGER IF EXISTS orders_auto_fulfill ON public.orders;
DROP TRIGGER IF EXISTS auto_fulfill_on_payment ON public.orders;

CREATE TRIGGER auto_fulfill_on_payment
AFTER INSERT OR UPDATE OF payment_status ON public.orders
FOR EACH ROW
WHEN (NEW.payment_status = 'paid')
EXECUTE FUNCTION public.trigger_auto_fulfill();