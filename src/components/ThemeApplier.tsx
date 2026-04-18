import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const THEME_KEYS = [
  "theme_primary",
  "theme_accent",
  "theme_background",
  "theme_foreground",
  "theme_radius",
] as const;

const CSS_VAR_MAP: Record<string, string> = {
  theme_primary: "--primary",
  theme_accent: "--accent",
  theme_background: "--background",
  theme_foreground: "--foreground",
  theme_radius: "--radius",
};

/**
 * Reads theme overrides from site_settings and applies them to :root as CSS vars.
 * Values for color keys must be HSL triplets (e.g. "210 100% 45%").
 * Radius is a CSS length (e.g. "0.75rem").
 */
export function ThemeApplier() {
  const { data } = useQuery({
    queryKey: ["theme-overrides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", THEME_KEYS as unknown as string[]);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((r: { key: string; value: string }) => {
        if (r.value?.trim()) map[r.key] = r.value.trim();
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    Object.entries(data).forEach(([k, v]) => {
      const cssVar = CSS_VAR_MAP[k];
      if (cssVar && v) root.style.setProperty(cssVar, v);
    });
    if (data.theme_primary) {
      root.style.setProperty("--ring", data.theme_primary);
    }
  }, [data]);

  return null;
}
