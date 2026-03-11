import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { initMetaPixel, trackPageView } from "@/lib/meta-pixel";
import { useLocation } from "react-router-dom";

export function MetaPixelProvider() {
  const { data: settings } = useSiteSettings();
  const location = useLocation();

  // Initialize pixel when settings load
  useEffect(() => {
    if (settings?.facebook_pixel_id) {
      initMetaPixel(settings.facebook_pixel_id);
    }
  }, [settings?.facebook_pixel_id]);

  // Track page views on route change
  useEffect(() => {
    trackPageView();
  }, [location.pathname]);

  return null;
}
