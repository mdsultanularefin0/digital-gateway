import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const THEME_KEYS = [
  "theme_primary",
  "theme_accent",
  "theme_background",
  "theme_foreground",
  "theme_radius",
  "theme_font_heading",
  "theme_font_body",
] as const;

const COLOR_VAR_MAP: Record<string, string> = {
  theme_primary: "--primary",
  theme_accent: "--accent",
  theme_background: "--background",
  theme_foreground: "--foreground",
  theme_radius: "--radius",
};

const GOOGLE_FONT_LINK_ID = "theme-google-fonts";

function ensureGoogleFontsLoaded(families: string[]) {
  const unique = Array.from(new Set(families.filter(Boolean)));
  if (unique.length === 0) return;
  const href =
    "https://fonts.googleapis.com/css2?" +
    unique
      .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@300;400;500;600;700;800`)
      .join("&") +
    "&display=swap";
  let link = document.getElementById(GOOGLE_FONT_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = GOOGLE_FONT_LINK_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

/**
 * Reads theme overrides from site_settings and applies them to :root as CSS vars.
 * Color values must be HSL triplets (e.g. "210 100% 45%").
 * Radius is a CSS length (e.g. "0.75rem").
 * Fonts are Google Font family names (e.g. "Inter").
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
      const cssVar = COLOR_VAR_MAP[k];
      if (cssVar && v) root.style.setProperty(cssVar, v);
    });

    if (data.theme_primary) {
      root.style.setProperty("--ring", data.theme_primary);
    }

    const headingFont = data.theme_font_heading;
    const bodyFont = data.theme_font_body;
    if (headingFont) {
      root.style.setProperty("--font-display", `'${headingFont}'`);
    }
    if (bodyFont) {
      root.style.setProperty("--font-body", `'${bodyFont}'`);
    }
    if (headingFont || bodyFont) {
      ensureGoogleFontsLoaded([headingFont, bodyFont].filter(Boolean) as string[]);
    }
  }, [data]);

  return null;
}
