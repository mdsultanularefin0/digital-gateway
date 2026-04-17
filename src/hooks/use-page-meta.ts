import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export interface PageMeta {
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  og_image_url?: string;
}

/**
 * Loads the SEO meta block (meta_title / meta_description / meta_keywords /
 * og_image_url) for a given page slug from the `page_contents` table,
 * preferring the active language and falling back to English.
 */
export function usePageMeta(pageSlug: string) {
  const { lang } = useLanguage();
  return useQuery<PageMeta>({
    queryKey: ["page-meta", pageSlug, lang],
    queryFn: async () => {
      const keys = ["meta_title", "meta_description", "meta_keywords", "og_image_url"];
      const { data, error } = await supabase
        .from("page_contents" as any)
        .select("section_key, content, lang")
        .eq("page_slug", pageSlug)
        .in("section_key", keys);
      if (error) throw error;

      const en: Record<string, string> = {};
      const bn: Record<string, string> = {};
      (data as any[] || []).forEach((row) => {
        const target = row.lang === "bn" ? bn : en;
        target[row.section_key] = row.content || "";
      });

      const pick = (k: string) =>
        lang === "bn" ? (bn[k]?.trim() || en[k] || "") : (en[k] || "");

      return {
        meta_title: pick("meta_title"),
        meta_description: pick("meta_description"),
        meta_keywords: pick("meta_keywords"),
        og_image_url: pick("og_image_url"),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
