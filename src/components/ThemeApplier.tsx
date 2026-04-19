import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const LIGHT_KEYS = [
  "theme_primary",
  "theme_accent",
  "theme_background",
  "theme_foreground",
  "theme_radius",
] as const;

const DARK_KEYS = [
  "theme_dark_primary",
  "theme_dark_accent",
  "theme_dark_background",
  "theme_dark_foreground",
] as const;

const FONT_KEYS = ["theme_font_heading", "theme_font_body"] as const;

const ALL_KEYS = [...LIGHT_KEYS, ...DARK_KEYS, ...FONT_KEYS] as const;

const LIGHT_VAR_MAP: Record<string, string> = {
  theme_primary: "--primary",
  theme_accent: "--accent",
  theme_background: "--background",
  theme_foreground: "--foreground",
  theme_radius: "--radius",
};

const DARK_VAR_MAP: Record<string, string> = {
  theme_dark_primary: "--primary",
  theme_dark_accent: "--accent",
  theme_dark_background: "--background",
  theme_dark_foreground: "--foreground",
};

const GOOGLE_FONT_LINK_ID = "theme-google-fonts";
const LIGHT_STYLE_ID = "theme-light-overrides";
const DARK_STYLE_ID = "theme-dark-overrides";

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

function setScopedStyle(id: string, selector: string, lines: string[]) {
  let style = document.getElementById(id) as HTMLStyleElement | null;
  if (lines.length === 0) {
    if (style) style.textContent = "";
    return;
  }
  if (!style) {
    style = document.createElement("style");
    style.id = id;
    document.head.appendChild(style);
  }
  style.textContent = `${selector} {\n${lines.join("\n")}\n}`;
}

function applyLightOverrides(data: Record<string, string>) {
  const lines: string[] = [];
  Object.entries(LIGHT_VAR_MAP).forEach(([k, cssVar]) => {
    const v = data[k];
    if (v) lines.push(`  ${cssVar}: ${v};`);
  });
  if (data.theme_primary) lines.push(`  --ring: ${data.theme_primary};`);
  // Scope to light mode only so dark-class overrides win in dark mode
  setScopedStyle(LIGHT_STYLE_ID, ":root:not(.dark)", lines);
}

function applyDarkOverrides(data: Record<string, string>) {
  const lines: string[] = [];
  Object.entries(DARK_VAR_MAP).forEach(([k, cssVar]) => {
    const v = data[k];
    if (v) lines.push(`  ${cssVar}: ${v};`);
  });
  if (data.theme_dark_primary) lines.push(`  --ring: ${data.theme_dark_primary};`);
  setScopedStyle(DARK_STYLE_ID, ".dark", lines);
}

/**
 * Reads theme overrides from site_settings and applies them to :root as CSS vars.
 * Light tokens are written inline on :root. Dark tokens are written into a
 * scoped <style> block so they activate only when the .dark class is present.
 */
export function ThemeApplier() {
  const { data } = useQuery({
    queryKey: ["theme-overrides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ALL_KEYS as unknown as string[]);
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

    // Light tokens (scoped via :root:not(.dark) so they don't override dark mode)
    applyLightOverrides(data);

    // Dark tokens (scoped via .dark selector)
    applyDarkOverrides(data);

    // Fonts (these are mode-agnostic — safe to set inline)
    const headingFont = data.theme_font_heading;
    const bodyFont = data.theme_font_body;
    if (headingFont) root.style.setProperty("--font-display", `'${headingFont}'`);
    if (bodyFont) root.style.setProperty("--font-body", `'${bodyFont}'`);
    if (headingFont || bodyFont) {
      ensureGoogleFontsLoaded([headingFont, bodyFont].filter(Boolean) as string[]);
    }
  }, [data]);

  return null;
}
