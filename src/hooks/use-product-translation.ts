import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export interface ProductTranslation {
  product_id: string;
  lang: string;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
}

/**
 * Returns a `tr(product)` helper that merges translation row for current
 * language onto a product object. Falls back to base EN columns when BN
 * fields are empty or missing.
 */
export function useProductTranslator() {
  const { lang } = useLanguage();

  const { data: rows } = useQuery({
    queryKey: ["product-translations", lang],
    queryFn: async () => {
      if (lang === "en") return [] as ProductTranslation[];
      const { data, error } = await supabase
        .from("product_translations" as any)
        .select("product_id, lang, name, tagline, description, features, meta_title, meta_description, meta_keywords");
      if (error) throw error;
      return ((data as any[]) || []).filter((r) => r.lang === lang) as ProductTranslation[];
    },
    enabled: lang === "bn",
    staleTime: 5 * 60 * 1000,
  });

  const map = new Map<string, ProductTranslation>();
  (rows || []).forEach((r) => map.set(r.product_id, r));

  function tr<
    T extends {
      id: string;
      name?: string;
      tagline?: string;
      description?: string;
      features?: string[];
      meta_title?: string;
      meta_description?: string;
      meta_keywords?: string;
    }
  >(p: T): T {
    if (lang === "en") return p;
    const t = map.get(p.id);
    if (!t) return p;
    return {
      ...p,
      name: t.name?.trim() || p.name,
      tagline: t.tagline?.trim() || p.tagline,
      description: t.description?.trim() || p.description,
      features: t.features && t.features.length > 0 ? t.features : p.features,
      meta_title: t.meta_title?.trim() || p.meta_title,
      meta_description: t.meta_description?.trim() || p.meta_description,
      meta_keywords: t.meta_keywords?.trim() || p.meta_keywords,
    } as T;
  }

  return { tr, lang };
}

/** Fetch a single product translation row (for admin editor use). */
export function useSingleProductTranslation(productId: string | undefined, lang: "en" | "bn") {
  return useQuery({
    queryKey: ["product-translation", productId, lang],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase
        .from("product_translations" as any)
        .select("*")
        .eq("product_id", productId)
        .eq("lang", lang)
        .maybeSingle();
      if (error) throw error;
      return data as any as ProductTranslation | null;
    },
    enabled: !!productId,
  });
}
