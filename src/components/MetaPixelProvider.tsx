import { useEffect, useRef } from "react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { initMetaPixel, trackPageView } from "@/lib/meta-pixel";
import { useLocation } from "react-router-dom";

export function MetaPixelProvider() {
  const { data: settings } = useSiteSettings();
  const location = useLocation();
  const initializedRef = useRef(false);
  const lastPathRef = useRef(location.pathname);

  // Initialize pixel when settings load
  useEffect(() => {
    if (settings?.facebook_pixel_id) {
      initMetaPixel(settings.facebook_pixel_id);
      initializedRef.current = true;
    }
  }, [settings?.facebook_pixel_id]);

  // Track page views on route change (skip the first one — initMetaPixel already fires PageView)
  useEffect(() => {
    if (!initializedRef.current) return;
    if (lastPathRef.current === location.pathname) return;
    lastPathRef.current = location.pathname;
    trackPageView();
  }, [location.pathname]);

  return null;
}
