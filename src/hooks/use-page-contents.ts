import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PageContent {
  page_slug: string;
  section_key: string;
  content: string;
}

export function usePageContents(pageSlug: string) {
  return useQuery({
    queryKey: ["page-contents", pageSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents" as any)
        .select("section_key, content")
        .eq("page_slug", pageSlug);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data as any[] || []).forEach((row: { section_key: string; content: string }) => {
        map[row.section_key] = row.content;
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
}
