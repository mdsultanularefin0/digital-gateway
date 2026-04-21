import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings extends Record<string, any> {
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
  meta_keywords: string;
  default_og_image_url: string;
  default_twitter_card: string;
  default_canonical_url: string;
  google_analytics_id: string;
  footer_text: string;
  hero_image_url: string;
  facebook_pixel_id: string;
  payment_methods: string;
  bkash_send_number: string;
  bkash_send_instructions: string;
  nagad_send_number: string;
  nagad_send_instructions: string;
}

const defaults: SiteSettings = {
  site_name: "GiftCardVibe",
  site_tagline: "Premium Gift Cards",
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
  meta_keywords: "",
  default_og_image_url: "",
  default_twitter_card: "",
  default_canonical_url: "",
  google_analytics_id: "",
  footer_text: "",
  hero_image_url: "",
  facebook_pixel_id: "",
  payment_methods: '["cod"]',
  bkash_send_number: "",
  bkash_send_instructions: "",
  nagad_send_number: "",
  nagad_send_instructions: "",
};

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("key, value");
      if (error) throw error;
      const map = { ...defaults } as Record<string, any>;
      (Array.isArray(data) ? data : []).forEach((row: { key: string; value: string }) => {
        map[row.key] = row.value;
      });
      return map as SiteSettings;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
