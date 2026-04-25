import { useEffect, useRef } from "react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { flushPendingMetaPurchases, initMetaPixel, trackPageView } from "@/lib/meta-pixel";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
 
 export function MetaPixelProvider() {
   const { data: settings } = useSiteSettings();
   const { user } = useAuth();
   const location = useLocation();
   const initializedRef = useRef(false);
   const lastPathRef = useRef(location.pathname);
 
   const customer = {
     email: user?.email,
     phone: user?.phone || user?.user_metadata?.phone,
     name: user?.user_metadata?.display_name || user?.user_metadata?.full_name,
     externalId: user?.id,
   };

   // Initialize pixel when settings load
   useEffect(() => {
     if (settings?.facebook_pixel_id) {
       initMetaPixel(settings.facebook_pixel_id, customer);
       initializedRef.current = true;
       flushPendingMetaPurchases();
     }
   }, [settings?.facebook_pixel_id, user?.id]);
 
   // Track page views on route change (skip the first one — initMetaPixel already fires PageView)
   useEffect(() => {
     if (!initializedRef.current) return;
     if (lastPathRef.current === location.pathname) return;
     lastPathRef.current = location.pathname;
     
     trackPageView(customer);
   }, [location.pathname, user?.id]);
 
   return null;
 }
