import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/lib/storage";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Save, Upload, ChevronDown, Search, Sparkles, Loader2, Palette, RotateCcw } from "lucide-react";
import { countries, currencies } from "@/data/countries-currencies";
import { getErrorMessage } from "@/lib/admin-utils";

interface SettingsMap {
  [key: string]: string;
}

type FieldDef = {
  key: string;
  label: string;
  placeholder: string;
  type?: string;
};

type GroupDef = {
  id: string;
  title: string;
  description: string;
  fields: FieldDef[];
};

const settingGroups: GroupDef[] = [
  {
    id: "general",
    title: "General",
    description: "Basic site identity and branding",
    fields: [
      { key: "site_name", label: "Site Name", placeholder: "e.g. GiftCardVibe" },
      { key: "site_tagline", label: "Tagline", placeholder: "e.g. Premium Digital Products" },
      { key: "logo_url", label: "Logo URL", placeholder: "https://... or upload", type: "image" },
      { key: "hero_image_url", label: "Hero Image", placeholder: "https://... or upload", type: "image" },
      { key: "favicon_url", label: "Favicon URL", placeholder: "https://..." },
      { key: "footer_text", label: "Footer Text", placeholder: "e.g. © 2026 GiftCardVibe. All rights reserved." },
    ],
  },
  {
    id: "contact",
    title: "Contact",
    description: "How customers can reach you",
    fields: [
      { key: "contact_email", label: "Primary Email", placeholder: "hello@example.com", type: "email" },
      { key: "support_email", label: "Support Email", placeholder: "support@example.com", type: "email" },
      { key: "contact_phone", label: "Phone Number", placeholder: "+1 (555) 123-4567" },
      { key: "whatsapp_number", label: "WhatsApp Number", placeholder: "+15551234567" },
    ],
  },
  {
    id: "location",
    title: "Location",
    description: "Business address details",
    fields: [
      { key: "contact_address", label: "Street Address", placeholder: "123 Main St" },
      { key: "city", label: "City", placeholder: "San Francisco" },
      { key: "state", label: "State / Province", placeholder: "California" },
      { key: "zip_code", label: "ZIP / Postal Code", placeholder: "94105" },
      { key: "country", label: "Country", placeholder: "Select a country", type: "country" },
    ],
  },
  {
    id: "currency",
    title: "Currency",
    description: "Pricing display preferences",
    fields: [
      { key: "currency", label: "Currency", placeholder: "Select currency", type: "currency" },
    ],
  },
  {
    id: "downloads",
    title: "Downloads",
    description: "Configure download link expiry and limits for digital products",
    fields: [
      { key: "download_expiry_hours", label: "Link Expiry (hours)", placeholder: "168 (7 days). Set 0 for no expiry" },
      { key: "download_max_count", label: "Max Downloads Per Link", placeholder: "5. Set 0 for unlimited" },
    ],
  },
  {
    id: "social",
    title: "Social",
    description: "Links to your social profiles",
    fields: [
      { key: "facebook_url", label: "Facebook", placeholder: "https://facebook.com/..." },
      { key: "twitter_url", label: "X (Twitter)", placeholder: "https://x.com/..." },
      { key: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/..." },
      { key: "linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/..." },
      { key: "youtube_url", label: "YouTube", placeholder: "https://youtube.com/..." },
    ],
  },
  {
    id: "seo",
    title: "SEO",
    description: "Defaults used as fallback when a specific page hasn't set its own values",
    fields: [
      { key: "meta_title", label: "Default Meta Title", placeholder: "GiftCardVibe — Premium Gift Cards" },
      { key: "meta_description", label: "Default Meta Description", placeholder: "Discover curated digital tools...", type: "textarea" },
      { key: "meta_keywords", label: "Default Meta Keywords", placeholder: "comma, separated, keywords" },
      { key: "default_og_image_url", label: "Default Share Image", placeholder: "https://... or upload (1200×630 recommended)", type: "image" },
      { key: "default_twitter_card", label: "Default Twitter Card", placeholder: "summary_large_image", type: "twitter_card" },
      { key: "default_canonical_url", label: "Site Base URL", placeholder: "https://yourdomain.com" },
      { key: "google_analytics_id", label: "Google Analytics ID", placeholder: "G-XXXXXXXXXX" },
      { key: "facebook_pixel_id", label: "Facebook Pixel ID", placeholder: "e.g. 123456789012345" },
      { key: "facebook_capi_access_token", label: "Conversions API Access Token", placeholder: "EAAxxxxxxx...", type: "password" },
      { key: "facebook_capi_test_code", label: "CAPI Test Event Code (optional)", placeholder: "TEST12345" },
    ],
  },
];

// ----- Theme tab definitions -----
type ThemeKey =
  | "theme_primary"
  | "theme_accent"
  | "theme_background"
  | "theme_foreground"
  | "theme_radius"
  | "theme_dark_primary"
  | "theme_dark_accent"
  | "theme_dark_background"
  | "theme_dark_foreground";

const THEME_DEFAULTS: Record<ThemeKey, string> = {
  theme_primary: "210 100% 45%",
  theme_accent: "195 80% 45%",
  theme_background: "210 30% 98%",
  theme_foreground: "214 60% 10%",
  theme_radius: "0.75rem",
  theme_dark_primary: "210 100% 55%",
  theme_dark_accent: "195 80% 50%",
  theme_dark_background: "214 40% 8%",
  theme_dark_foreground: "210 30% 92%",
};

const THEME_PRESETS: { name: string; values: Record<ThemeKey, string> }[] = [
  { name: "Frost Blue (Default)", values: { theme_primary: "210 100% 45%", theme_accent: "195 80% 45%", theme_background: "210 30% 98%", theme_foreground: "214 60% 10%", theme_radius: "0.75rem", theme_dark_primary: "210 100% 55%", theme_dark_accent: "195 80% 50%", theme_dark_background: "214 40% 8%", theme_dark_foreground: "210 30% 92%" } },
  { name: "Emerald", values: { theme_primary: "160 70% 38%", theme_accent: "175 65% 42%", theme_background: "150 30% 98%", theme_foreground: "160 50% 10%", theme_radius: "0.75rem", theme_dark_primary: "160 70% 48%", theme_dark_accent: "175 65% 50%", theme_dark_background: "160 35% 8%", theme_dark_foreground: "150 25% 92%" } },
  { name: "Sunset Orange", values: { theme_primary: "20 90% 50%", theme_accent: "350 80% 55%", theme_background: "30 40% 98%", theme_foreground: "20 50% 10%", theme_radius: "1rem", theme_dark_primary: "20 90% 58%", theme_dark_accent: "350 80% 62%", theme_dark_background: "20 35% 8%", theme_dark_foreground: "30 25% 92%" } },
  { name: "Royal Violet", values: { theme_primary: "265 75% 55%", theme_accent: "290 70% 55%", theme_background: "265 30% 98%", theme_foreground: "265 40% 10%", theme_radius: "0.5rem", theme_dark_primary: "265 75% 65%", theme_dark_accent: "290 70% 62%", theme_dark_background: "265 35% 8%", theme_dark_foreground: "265 25% 92%" } },
  { name: "Mono Slate", values: { theme_primary: "215 25% 27%", theme_accent: "215 20% 50%", theme_background: "210 20% 98%", theme_foreground: "215 30% 10%", theme_radius: "0.375rem", theme_dark_primary: "215 25% 75%", theme_dark_accent: "215 20% 60%", theme_dark_background: "215 30% 8%", theme_dark_foreground: "210 20% 92%" } },
];

// hsl "h s% l%" <-> hex helpers
function hslToHex(hslStr: string): string {
  const m = hslStr.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (!m) return "#000000";
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const k = (n: number) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function hexToHslStr(hex: string): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return "0 0% 0%";
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const POPULAR_GOOGLE_FONTS = [
  "Plus Jakarta Sans",
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Nunito",
  "Raleway",
  "Source Sans 3",
  "Work Sans",
  "DM Sans",
  "Manrope",
  "Outfit",
  "Figtree",
  "Sora",
  "Space Grotesk",
  "Urbanist",
  "Playfair Display",
  "Merriweather",
  "Lora",
  "Cormorant Garamond",
  "Libre Baskerville",
  "EB Garamond",
  "Crimson Pro",
  "Bebas Neue",
  "Oswald",
  "Archivo",
  "Archivo Black",
  "Bricolage Grotesque",
  "Syne",
  "Fraunces",
  "Instrument Serif",
  "DM Serif Display",
  "Abril Fatface",
  "JetBrains Mono",
  "Space Mono",
  "Fira Code",
];

const loadedFontPreviewSet = new Set<string>();
function loadFontPreview(family: string) {
  if (!family || loadedFontPreviewSet.has(family)) return;
  loadedFontPreviewSet.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
}

function FontPickerRow({
  label,
  help,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  help: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Preload selected + visible options for live preview
  useEffect(() => {
    if (value) loadFontPreview(value);
  }, [value]);

  const filtered = POPULAR_GOOGLE_FONTS.filter((f) =>
    f.toLowerCase().includes(search.toLowerCase())
  );

  // Lazily preload preview fonts when dropdown opens
  useEffect(() => {
    if (!open) return;
    filtered.slice(0, 20).forEach(loadFontPreview);
  }, [open, filtered]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
      <div className="w-40 shrink-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{help}</div>
      </div>
      <div className="flex-1 relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="h-12 w-full rounded-xl border border-border bg-background px-4 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <span
            className={value ? "text-foreground text-base" : "text-muted-foreground text-sm"}
            style={value ? { fontFamily: `'${value}', sans-serif` } : undefined}
          >
            {value || placeholder}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {value && (
              <span
                onClick={(e) => { e.stopPropagation(); onChange(""); }}
                className="text-xs text-muted-foreground hover:text-destructive px-2"
              >
                Clear
              </span>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(""); }} />
            <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-background shadow-lg max-h-72 flex flex-col">
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search Google Fonts..."
                    className="h-8 w-full rounded-xl border border-border bg-muted pl-7 pr-3 text-xs focus:outline-none"
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {filtered.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No matching fonts</div>
                ) : (
                  filtered.map((font) => (
                    <button
                      key={font}
                      type="button"
                      onMouseEnter={() => loadFontPreview(font)}
                      onClick={() => {
                        loadFontPreview(font);
                        onChange(font);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`w-full text-left px-3 py-2.5 hover:bg-muted transition-colors flex items-center justify-between ${font === value ? "bg-primary/10 text-primary" : ""}`}
                      style={{ fontFamily: `'${font}', sans-serif` }}
                    >
                      <span className="text-base">{font}</span>
                      <span className="text-xs opacity-50">Aa</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ThemeEditor({ values, update }: { values: SettingsMap; update: (k: string, v: string) => void }) {
  const colorFields: { key: ThemeKey; label: string; help: string }[] = [
    { key: "theme_primary", label: "Primary", help: "Main brand color (buttons, links)" },
    { key: "theme_accent", label: "Accent", help: "Secondary highlight color" },
    { key: "theme_background", label: "Background", help: "Page background" },
    { key: "theme_foreground", label: "Foreground", help: "Default text color" },
  ];

  const darkColorFields: { key: ThemeKey; label: string; help: string }[] = [
    { key: "theme_dark_primary", label: "Primary (dark)", help: "Brand color when dark mode is active" },
    { key: "theme_dark_accent", label: "Accent (dark)", help: "Secondary highlight in dark mode" },
    { key: "theme_dark_background", label: "Background (dark)", help: "Page background in dark mode" },
    { key: "theme_dark_foreground", label: "Foreground (dark)", help: "Default text color in dark mode" },
  ];

  const renderColorRow = (f: { key: ThemeKey; label: string; help: string }) => {
    const raw = values[f.key] || THEME_DEFAULTS[f.key];
    const hex = hslToHex(raw);
    return (
      <div key={f.key} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
        <div className="w-40 shrink-0">
          <div className="text-sm font-medium">{f.label}</div>
          <div className="text-xs text-muted-foreground">{f.help}</div>
        </div>
        <div className="flex items-center gap-3 flex-1">
          <label className="relative cursor-pointer">
            <input
              type="color"
              value={hex}
              onChange={(e) => update(f.key, hexToHslStr(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <span
              className="block h-10 w-10 rounded-xl border border-border shadow-sm"
              style={{ background: `hsl(${raw})` }}
            />
          </label>
          <input
            value={raw}
            onChange={(e) => update(f.key, e.target.value)}
            placeholder="e.g. 210 100% 45%"
            className="h-10 flex-1 rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
          />
        </div>
      </div>
    );
  };

  const applyPreset = (preset: typeof THEME_PRESETS[number]) => {
    Object.entries(preset.values).forEach(([k, v]) => update(k, v));
    toast({ title: `Applied "${preset.name}"`, description: "Click Save to persist." });
  };

  const resetTheme = () => {
    Object.entries(THEME_DEFAULTS).forEach(([k, v]) => update(k, v));
    toast({ title: "Theme reset", description: "Click Save to persist." });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold tracking-wider uppercase mb-1">Presets</h3>
        <p className="text-xs text-muted-foreground mb-3">Quick-start with a curated palette, then fine-tune below.</p>
        <div className="flex flex-wrap gap-2">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p)}
              className="group flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium hover:border-primary transition-colors"
            >
              <span className="flex gap-1">
                <span className="h-4 w-4 rounded-full border border-border/50" style={{ background: `hsl(${p.values.theme_primary})` }} />
                <span className="h-4 w-4 rounded-full border border-border/50" style={{ background: `hsl(${p.values.theme_accent})` }} />
              </span>
              {p.name}
            </button>
          ))}
          <button
            type="button"
            onClick={resetTheme}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium hover:border-destructive hover:text-destructive transition-colors ml-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to default
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold tracking-wider uppercase mb-1">Colors</h3>
        <p className="text-xs text-muted-foreground mb-3">Pick colors directly. Stored as HSL so dark mode adapts gracefully.</p>
        <div className="rounded-xl border border-border divide-y divide-border">
          {colorFields.map((f) => {
            const raw = values[f.key] || THEME_DEFAULTS[f.key];
            const hex = hslToHex(raw);
            return (
              <div key={f.key} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                <div className="w-40 shrink-0">
                  <div className="text-sm font-medium">{f.label}</div>
                  <div className="text-xs text-muted-foreground">{f.help}</div>
                </div>
                <div className="flex items-center gap-3 flex-1">
                  <label className="relative cursor-pointer">
                    <input
                      type="color"
                      value={hex}
                      onChange={(e) => update(f.key, hexToHslStr(e.target.value))}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <span
                      className="block h-10 w-10 rounded-xl border border-border shadow-sm"
                      style={{ background: `hsl(${raw})` }}
                    />
                  </label>
                  <input
                    value={raw}
                    onChange={(e) => update(f.key, e.target.value)}
                    placeholder="e.g. 210 100% 45%"
                    className="h-10 flex-1 rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold tracking-wider uppercase mb-1">Border Radius</h3>
        <p className="text-xs text-muted-foreground mb-3">Controls roundness of cards, buttons, and inputs.</p>
        <div className="rounded-xl border border-border p-4 flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            value={parseFloat((values.theme_radius || THEME_DEFAULTS.theme_radius).replace("rem", "")) || 0.75}
            onChange={(e) => update("theme_radius", `${e.target.value}rem`)}
            className="flex-1 accent-primary"
          />
          <input
            value={values.theme_radius || THEME_DEFAULTS.theme_radius}
            onChange={(e) => update("theme_radius", e.target.value)}
            className="h-10 w-28 rounded-xl border border-border bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold tracking-wider uppercase mb-1">Typography</h3>
        <p className="text-xs text-muted-foreground mb-3">Pick Google Fonts for headings and body text. They load on save.</p>
        <div className="rounded-xl border border-border divide-y divide-border">
          <FontPickerRow
            label="Heading Font"
            help="Used for titles, hero, and product names"
            value={values.theme_font_heading || ""}
            onChange={(v) => update("theme_font_heading", v)}
            placeholder="Plus Jakarta Sans (default)"
          />
          <FontPickerRow
            label="Body Font"
            help="Used for paragraphs, descriptions, and UI text"
            value={values.theme_font_body || ""}
            onChange={(v) => update("theme_font_body", v)}
            placeholder="Plus Jakarta Sans (default)"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold tracking-wider uppercase mb-1">Live Preview</h3>
        <p className="text-xs text-muted-foreground mb-3">Save changes to apply globally; this preview reflects current values.</p>
        <div
          className="rounded-2xl border border-border p-6 space-y-4"
          style={{
            background: `hsl(${values.theme_background || THEME_DEFAULTS.theme_background})`,
            color: `hsl(${values.theme_foreground || THEME_DEFAULTS.theme_foreground})`,
            borderRadius: values.theme_radius || THEME_DEFAULTS.theme_radius,
          }}
        >
          <h4
            className="text-xl font-bold"
            style={values.theme_font_heading ? { fontFamily: `'${values.theme_font_heading}', sans-serif` } : undefined}
          >
            Preview heading
          </h4>
          <p
            className="text-sm opacity-80"
            style={values.theme_font_body ? { fontFamily: `'${values.theme_font_body}', sans-serif` } : undefined}
          >
            A short paragraph of body text using your chosen colors and fonts.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className="px-4 h-10 text-sm font-medium text-white shadow-sm"
              style={{
                background: `hsl(${values.theme_primary || THEME_DEFAULTS.theme_primary})`,
                borderRadius: values.theme_radius || THEME_DEFAULTS.theme_radius,
              }}
            >
              Primary action
            </button>
            <button
              type="button"
              className="px-4 h-10 text-sm font-medium text-white shadow-sm"
              style={{
                background: `hsl(${values.theme_accent || THEME_DEFAULTS.theme_accent})`,
                borderRadius: values.theme_radius || THEME_DEFAULTS.theme_radius,
              }}
            >
              Accent action
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Searchable select dropdown component
function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  renderOption,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  renderOption?: (opt: string) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-10 w-full rounded-xl border border-border bg-background px-4 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-background shadow-lg max-h-60 flex flex-col">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-8 w-full rounded-xl border border-border bg-muted pl-7 pr-3 text-xs focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">No results</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${opt === value ? "bg-primary/10 text-primary font-medium" : ""
                    }`}
                >
                  {renderOption ? renderOption(opt) : opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(""); }} />
      )}
    </div>
  );
}

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<SettingsMap>({});
  const [uploading, setUploading] = useState(false);
  const [seoGenerating, setSeoGenerating] = useState(false);

  const generateSeoDefaults = async () => {
    setSeoGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          type: "page_meta",
          language: "en",
          pageName: values.site_name || "Home",
          pageDescription: values.site_tagline || "",
          siteName: values.site_name || "",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const result: string = data?.result || "";
      const t = result.match(/TITLE:\s*(.+)/i);
      const d = result.match(/DESCRIPTION:\s*(.+)/i);
      const k = result.match(/KEYWORDS:\s*(.+)/i);
      const next: SettingsMap = { ...values };
      if (t?.[1]) next.meta_title = t[1].trim();
      if (d?.[1]) next.meta_description = d[1].trim();
      if (k?.[1]) next.meta_keywords = k[1].trim();
      if (!t && !d && !k) throw new Error("AI returned no parseable fields");
      setValues(next);
      toast({ title: "SEO defaults generated", description: "Review and click Save to persist." });
    } catch (e: unknown) {
      toast({ title: "AI failed", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setSeoGenerating(false);
    }
  };

  const currencyOptions = currencies.map((c) => c.code);
  const currencyLabels: Record<string, string> = {};
  currencies.forEach((c) => {
    currencyLabels[c.code] = `${c.symbol}  ${c.code} — ${c.name}`;
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;
      const map: SettingsMap = {};
      (data || []).forEach((row: { key: string; value: string }) => {
        map[row.key] = row.value;
      });
      return map;
    },
  });

  useEffect(() => {
    if (settings) setValues(settings);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const upserts = Object.entries(values).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString(),
      }));

      if (upserts.length === 0) return;

      const { error } = await supabase
        .from("site_settings")
        .upsert(upserts, { onConflict: "key" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings-admin"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["theme-overrides"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error saving settings", description: err.message, variant: "destructive" });
    },
  });

  const handleImageUpload = async (key: string, file: File) => {
    setUploading(true);
    try {
      const result = await uploadToStorage(file, "assets");
      setValues({ ...values, [key]: result.url });
      toast({ title: "Image uploaded" });
    } catch (err: unknown) {
      toast({ title: "Upload failed", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleCurrencyChange = (code: string) => {
    const cur = currencies.find((c) => c.code === code);
    if (cur) {
      setValues((prev) => ({ ...prev, currency: cur.code, currency_symbol: cur.symbol }));
    }
  };

  const update = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const inputClass = "h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-muted-foreground">Loading settings...</div>
      </AdminLayout>
    );
  }

  const renderField = (field: FieldDef) => (
    <div key={field.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
      <label className="text-sm font-medium w-40 shrink-0">{field.label}</label>
      <div className="flex-1">
        {field.type === "country" ? (
          <SearchableSelect
            value={values[field.key] || ""}
            onChange={(val) => update(field.key, val)}
            options={countries}
            placeholder={field.placeholder}
          />
        ) : field.type === "currency" ? (
          <SearchableSelect
            value={values[field.key] || ""}
            onChange={handleCurrencyChange}
            options={currencyOptions}
            placeholder={field.placeholder}
            renderOption={(opt) => currencyLabels[opt]}
          />
        ) : field.type === "twitter_card" ? (
          <select
            value={values[field.key] || ""}
            onChange={(e) => update(field.key, e.target.value)}
            className={inputClass}
          >
            <option value="">Auto (large image when image set)</option>
            <option value="summary_large_image">Summary, Large Image</option>
            <option value="summary">Summary (small thumbnail)</option>
          </select>
        ) : field.type === "textarea" ? (
          <textarea
            value={values[field.key] || ""}
            onChange={(e) => update(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
          />
        ) : field.type === "image" ? (
          <div className="flex items-center gap-3">
            {values[field.key] && (
              <img
                src={values[field.key]}
                alt={field.label}
                className="h-10 w-10 rounded-xl border border-border object-contain bg-muted"
              />
            )}
            <input
              value={values[field.key] || ""}
              onChange={(e) => update(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={`${inputClass} flex-1`}
            />
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(field.key, file);
                }}
              />
              <span className="inline-flex items-center gap-1 rounded-xl border border-border px-3 h-10 text-xs font-medium hover:bg-muted transition-colors">
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "..." : "Upload"}
              </span>
            </label>
          </div>
        ) : field.type === "password" ? (
          <input
            type="password"
            value={values[field.key] || ""}
            onChange={(e) => update(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={inputClass}
          />
        ) : (
          <input
            type={field.type || "text"}
            value={values[field.key] || ""}
            onChange={(e) => update(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={inputClass}
          />
        )}
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-display font-bold">Site Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your site configuration</p>
        </div>
        <Button
          variant="gradient"
          size="lg"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="max-w-4xl">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1 rounded-xl">
          {settingGroups.map((g) => (
            <TabsTrigger key={g.id} value={g.id} className="text-xs">
              {g.title}
            </TabsTrigger>
          ))}
          <TabsTrigger value="theme" className="text-xs gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            Theme
          </TabsTrigger>
        </TabsList>

        {settingGroups.map((group) => (
          <TabsContent key={group.id} value={group.id} className="mt-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold tracking-wider uppercase">{group.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
              </div>
              {group.id === "seo" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateSeoDefaults}
                  disabled={seoGenerating}
                  className="gap-1.5 shrink-0"
                >
                  {seoGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {seoGenerating ? "Generating..." : "AI Generate"}
                </Button>
              )}
            </div>
            <div className="rounded-xl border border-border divide-y divide-border">
              {group.fields.map(renderField)}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="theme" className="mt-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold tracking-wider uppercase">Theme Editor</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize brand colors, accents, and roundness. Changes apply site-wide after saving.
            </p>
          </div>
          <ThemeEditor values={values} update={update} />
        </TabsContent>
      </Tabs>

      <div className="max-w-4xl mt-8 pt-6 border-t border-border flex justify-end">
        <Button
          variant="gradient"
          size="lg"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save All Changes"}
        </Button>
      </div>
    </AdminLayout>
  );
}
