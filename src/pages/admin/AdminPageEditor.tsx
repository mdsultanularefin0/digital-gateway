import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { uploadToStorage } from "@/lib/storage";
import { Save, Upload, X, Loader2 } from "lucide-react";
import { RepeaterField, type RepeaterFieldDef } from "@/components/admin/RepeaterField";
import { AiGenerateButton } from "@/components/admin/AiGenerateButton";
import { useSiteSettings } from "@/hooks/use-site-settings";

function HeroImageUploader() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState<string | null>(null);

  const { data: currentUrl = "", isLoading } = useQuery({
    queryKey: ["site-setting", "hero_image_url"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "hero_image_url")
        .maybeSingle();
      return (data?.value as string) || "";
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "hero_image_url", value }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-setting", "hero_image_url"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      setUrlInput(null);
      toast({ title: "Hero image updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await uploadToStorage(file, "assets");
      saveMutation.mutate(url);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = urlInput ?? currentUrl;

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <label className="text-sm font-medium block">Hero Image</label>
      <p className="text-xs text-muted-foreground -mt-2">
        Shown on the right side of the homepage hero (desktop only). Recommended: square PNG with transparent background, ~1080×1080.
      </p>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          {currentUrl && (
            <div className="relative inline-block">
              <img
                src={currentUrl}
                alt="Current hero"
                className="h-32 w-32 object-contain rounded-md border border-border bg-background"
              />
              <button
                onClick={() => saveMutation.mutate("")}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90"
                title="Remove hero image (uses default)"
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || saveMutation.isPending}
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? "Uploading..." : "Upload Image"}
            </Button>

            <div className="flex flex-1 gap-2">
              <Input
                value={displayUrl}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Or paste image URL..."
                className="flex-1"
              />
              {urlInput !== null && urlInput !== currentUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="gradient"
                  onClick={() => saveMutation.mutate(urlInput)}
                  disabled={saveMutation.isPending}
                >
                  Save URL
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type SectionType = "rich" | "text" | "repeater";

interface SectionConfig {
  key: string;
  label: string;
  type: SectionType;
  itemLabel?: string;
  fields?: RepeaterFieldDef[];
}

interface PageConfig {
  slug: string;
  label: string;
  sections: SectionConfig[];
}

const pages: PageConfig[] = [
  {
    slug: "home",
    label: "Homepage",
    sections: [
      { key: "hero_badge", label: "Hero Badge Text", type: "text" },
      { key: "hero_heading", label: "Hero Heading (HTML allowed)", type: "rich" },
      { key: "hero_description", label: "Hero Description", type: "text" },
      { key: "hero_cta_primary", label: "Primary CTA Text", type: "text" },
      { key: "hero_cta_secondary", label: "Secondary CTA Text", type: "text" },
      {
        key: "stats",
        label: "Stats Section",
        type: "repeater",
        itemLabel: "Stat",
        fields: [
          { key: "value", label: "Value", placeholder: "e.g. 50K+" },
          { key: "label", label: "Label", placeholder: "e.g. Active Users" },
        ],
      },
      { key: "featured_heading", label: "Featured Section Heading", type: "text" },
      { key: "featured_badge", label: "Featured Section Badge", type: "text" },
    ],
  },
  {
    slug: "about",
    label: "About Us",
    sections: [
      { key: "heading", label: "Page Heading", type: "text" },
      { key: "subheading", label: "Subheading", type: "text" },
      { key: "body", label: "Body Content", type: "rich" },
      {
        key: "values",
        label: "Values",
        type: "repeater",
        itemLabel: "Value",
        fields: [
          { key: "title", label: "Title", placeholder: "e.g. Quality First" },
          { key: "icon", label: "Icon name (optional)", placeholder: "e.g. Star" },
          { key: "desc", label: "Description", placeholder: "Short description", type: "textarea" },
        ],
      },
    ],
  },
  {
    slug: "terms",
    label: "Terms of Service",
    sections: [
      { key: "heading", label: "Page Heading", type: "text" },
      { key: "body", label: "Content", type: "rich" },
    ],
  },
  {
    slug: "privacy",
    label: "Privacy Policy",
    sections: [
      { key: "heading", label: "Page Heading", type: "text" },
      { key: "body", label: "Content", type: "rich" },
    ],
  },
  {
    slug: "contact",
    label: "Contact Page",
    sections: [
      { key: "heading", label: "Page Heading", type: "text" },
      { key: "subheading", label: "Subheading", type: "text" },
      { key: "body", label: "Additional Info (shown below form)", type: "rich" },
    ],
  },
  {
    slug: "faq",
    label: "FAQ Page",
    sections: [
      { key: "heading", label: "Page Heading", type: "text" },
      { key: "subheading", label: "Subheading", type: "text" },
      {
        key: "items",
        label: "FAQ Items",
        type: "repeater",
        itemLabel: "FAQ",
        fields: [
          { key: "question", label: "Question", placeholder: "e.g. How do I get my download?" },
          { key: "answer", label: "Answer", placeholder: "Write the answer here…", type: "textarea" },
        ],
      },
    ],
  },
  {
    slug: "footer",
    label: "Footer",
    sections: [
      { key: "tagline", label: "Footer Tagline", type: "text" },
      { key: "footer_text", label: "Copyright / Bottom Text", type: "text" },
      {
        key: "product_links",
        label: "Product Links",
        type: "repeater",
        itemLabel: "Link",
        fields: [
          { key: "label", label: "Label", placeholder: "e.g. All Products" },
          { key: "to", label: "URL / Path", placeholder: "/products" },
        ],
      },
      {
        key: "company_links",
        label: "Company Links",
        type: "repeater",
        itemLabel: "Link",
        fields: [
          { key: "label", label: "Label", placeholder: "e.g. About" },
          { key: "to", label: "URL / Path", placeholder: "/about" },
        ],
      },
      {
        key: "legal_links",
        label: "Legal Links",
        type: "repeater",
        itemLabel: "Link",
        fields: [
          { key: "label", label: "Label", placeholder: "e.g. Privacy" },
          { key: "to", label: "URL / Path", placeholder: "/privacy" },
        ],
      },
    ],
  },
];

export default function AdminPageEditor() {
  const queryClient = useQueryClient();
  const settingsQuery = useSiteSettings();
  const siteName = (settingsQuery as any)?.data?.site_name || "GiftCardVibe";
  const [activeTab, setActiveTab] = useState(pages[0].slug);
  const [editLang, setEditLang] = useState<"en" | "bn">("en");
  const [edits, setEdits] = useState<Record<string, Record<string, Record<string, string>>>>({});
  // edits[lang][pageSlug][sectionKey] = content

  const { data: allContents, isLoading } = useQuery({
    queryKey: ["admin-page-contents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents" as any)
        .select("page_slug, section_key, content, lang");
      if (error) throw error;
      const map: Record<string, Record<string, Record<string, string>>> = { en: {}, bn: {} };
      (data as any[] || []).forEach((row: any) => {
        const lang = row.lang === "bn" ? "bn" : "en";
        if (!map[lang][row.page_slug]) map[lang][row.page_slug] = {};
        map[lang][row.page_slug][row.section_key] = row.content;
      });
      return map;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ pageSlug, sections, lang }: { pageSlug: string; sections: Record<string, string>; lang: "en" | "bn" }) => {
      const entries = Object.entries(sections);
      for (const [key, content] of entries) {
        const { error } = await supabase
          .from("page_contents" as any)
          .upsert(
            { page_slug: pageSlug, section_key: key, content, lang } as any,
            { onConflict: "page_slug,section_key,lang" }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-page-contents"] });
      queryClient.invalidateQueries({ queryKey: ["page-contents"] });
      toast({ title: "Page content saved!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const activePage = pages.find((p) => p.slug === activeTab)!;
  const baseData = allContents?.[editLang]?.[activeTab] || {};
  const localEdits = edits[editLang]?.[activeTab] || {};
  const currentData = { ...baseData, ...localEdits };

  const updateField = (key: string, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [editLang]: {
        ...(prev[editLang] || {}),
        [activeTab]: { ...((prev[editLang] || {})[activeTab] || {}), [key]: value },
      },
    }));
  };

  const handleSave = () => {
    const pageEdits = edits[editLang]?.[activeTab];
    if (!pageEdits || Object.keys(pageEdits).length === 0) {
      toast({ title: "No changes to save" });
      return;
    }
    saveMutation.mutate({ pageSlug: activeTab, sections: pageEdits, lang: editLang });
    setEdits((prev) => {
      const next = { ...prev };
      if (next[editLang]) {
        const langCopy = { ...next[editLang] };
        delete langCopy[activeTab];
        next[editLang] = langCopy;
      }
      return next;
    });
  };

  const translateSection = async (sectionKey: string) => {
    const enContent = allContents?.en?.[activeTab]?.[sectionKey] || edits.en?.[activeTab]?.[sectionKey] || "";
    if (!enContent.trim()) {
      toast({ title: "Nothing to translate", description: "English version is empty.", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("translate", {
        body: { text: enContent, target: "bn", context: "page" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      updateField(sectionKey, (data?.translated || "").trim());
      toast({ title: "Translated section to Bangla" });
    } catch (err: any) {
      toast({ title: "Translation failed", description: err?.message || String(err), variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h2 className="text-xl font-display font-bold">Page Editor</h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-full border border-border bg-background p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setEditLang("en")}
              className={`px-3 py-1 rounded-full ${editLang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >EN</button>
            <button
              type="button"
              onClick={() => setEditLang("bn")}
              className={`px-3 py-1 rounded-full ${editLang === "bn" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >বাংলা</button>
          </div>
          <Button
            variant="gradient"
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 mb-6 rounded-lg border border-border p-1 bg-muted/30">
        {pages.map((p) => (
          <button
            key={p.slug}
            onClick={() => setActiveTab(p.slug)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === p.slug
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <div className="max-w-4xl space-y-6">
          {activeTab === "home" && editLang === "en" && <HeroImageUploader />}

          {activePage.sections.map((section) => {
            const aiPayload = {
              pageSlug: activeTab,
              sectionKey: section.key,
              sectionLabel: section.label,
              fieldType: section.type,
              currentValue: currentData[section.key] || "",
              repeaterFields: section.fields || [],
              itemLabel: section.itemLabel || "Item",
              siteName,
              language: editLang,
            };
            const handleAiResult = (result: string) => {
              if (section.type === "repeater") {
                const cleaned = result
                  .replace(/^```(?:json)?\s*/i, "")
                  .replace(/\s*```\s*$/i, "")
                  .trim();
                try {
                  const parsed = JSON.parse(cleaned);
                  if (Array.isArray(parsed)) {
                    updateField(section.key, JSON.stringify(parsed, null, 2));
                    return;
                  }
                } catch {}
                toast({
                  title: "AI returned invalid JSON",
                  description: "Try again or edit manually.",
                  variant: "destructive",
                });
                return;
              }
              updateField(section.key, result.trim());
            };

            return (
              <div key={section.key}>
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                  <label className="text-sm font-medium">
                    {section.label} <span className="ml-1 text-xs text-muted-foreground">({editLang.toUpperCase()})</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {editLang === "bn" && section.type !== "repeater" && (
                      <Button type="button" variant="outline" size="sm" onClick={() => translateSection(section.key)}>
                        Translate EN→BN
                      </Button>
                    )}
                    {section.type !== "repeater" && (
                      <AiGenerateButton
                        type="page_section"
                        payload={aiPayload}
                        onResult={handleAiResult}
                        label="AI Generate"
                      />
                    )}
                  </div>
                </div>
                {section.type === "rich" ? (
                  <RichTextEditor
                    value={currentData[section.key] || ""}
                    onChange={(html) => updateField(section.key, html)}
                  />
                ) : section.type === "repeater" ? (
                  <RepeaterField
                    value={currentData[section.key] || ""}
                    onChange={(json) => updateField(section.key, json)}
                    fields={section.fields || []}
                    itemLabel={section.itemLabel || "Item"}
                    toolbar={
                      <AiGenerateButton
                        type="page_section"
                        payload={aiPayload}
                        onResult={handleAiResult}
                        label="AI Generate Items"
                      />
                    }
                  />
                ) : (
                  <textarea
                    value={currentData[section.key] || ""}
                    onChange={(e) => updateField(section.key, e.target.value)}
                    className="w-full rounded-lg border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                    placeholder={section.label}
                  />
                )}
              </div>
            );
          })}

          <Button
            variant="gradient"
            size="lg"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="mt-4"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </AdminLayout>
  );
}
