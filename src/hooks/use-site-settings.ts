import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  site_name: string;
  site_tagline: string;
  logo_url: string;
  favicon_url: string;
  currency: string;
  currency_symbol: string;
  contact_email: string;
  support_email: string;
  contact_phone: string;
  whatsapp_number: string;
  contact_address: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  facebook_url: string;
  twitter_url: string;
  instagram_url: string;
  linkedin_url: string;
  youtube_url: string;
  meta_title: string;
  meta_description: string;
  google_analytics_id: string;
  footer_text: string;
  payment_methods: string;
}

const defaults: SiteSettings = {
  site_name: "DigiStack",
  site_tagline: "Premium Digital Products",
  logo_url: "",
  favicon_url: "",
  currency: "USD",
  currency_symbol: "$",
  contact_email: "",
  support_email: "",
  contact_phone: "",
  whatsapp_number: "",
  contact_address: "",
  city: "",
  state: "",
  country: "",
  zip_code: "",
  facebook_url: "",
  twitter_url: "",
  instagram_url: "",
  linkedin_url: "",
  youtube_url: "",
  meta_title: "",
  meta_description: "",
  google_analytics_id: "",
  footer_text: "",
  payment_methods: '["cod"]',
};

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("key, value");
      if (error) throw error;
      const map = { ...defaults };
      (Array.isArray(data) ? data : []).forEach((row: { key: string; value: string }) => {
        if (row.key in map) {
          (map as any)[row.key] = row.value;
        }
      });
      return map;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
