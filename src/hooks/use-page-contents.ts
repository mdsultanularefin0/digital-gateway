import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export interface PageContent {
  page_slug: string;
  section_key: string;
  content: string;
  lang?: string;
}

/**
 * Loads page_contents for a given slug, returning the BN value when current
 * language is BN and falling back to EN if BN is missing/empty.
 */
export function usePageContents(pageSlug: string) {
  const { lang } = useLanguage();
  return useQuery({
    queryKey: ["page-contents", pageSlug, lang],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents" as any)
        .select("section_key, content, lang")
        .eq("page_slug", pageSlug);
      if (error) throw error;

      const enMap: Record<string, string> = {};
      const bnMap: Record<string, string> = {};
      (data as any[] || []).forEach((row: { section_key: string; content: string; lang?: string }) => {
        if (row.lang === "bn") bnMap[row.section_key] = row.content;
        else enMap[row.section_key] = row.content;
      });

      if (lang === "bn") {
        const merged: Record<string, string> = { ...enMap };
        for (const k of Object.keys(bnMap)) {
          if (bnMap[k] && bnMap[k].trim()) merged[k] = bnMap[k];
        }
        return merged;
      }
      return enMap;
    },
    staleTime: 5 * 60 * 1000,
  });
}
