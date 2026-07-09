REVOKE ALL ON FUNCTION public.trigger_auto_fulfill() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_fulfill_order(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_download_tokens(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.trigger_auto_fulfill() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_fulfill_order(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_download_tokens(uuid) TO service_role;