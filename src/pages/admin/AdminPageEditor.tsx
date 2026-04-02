import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Save } from "lucide-react";

interface PageConfig {
  slug: string;
  label: string;
  sections: { key: string; label: string; type: "rich" | "text" | "stats" }[];
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
      { key: "stats", label: "Stats Section (JSON: [{value, label}])", type: "text" },
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
      { key: "values", label: "Values (JSON: [{title, desc, icon}])", type: "text" },
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
      { key: "items", label: "FAQ Items (JSON: [{question, answer}])", type: "text" },
    ],
  },
];

export default function AdminPageEditor() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(pages[0].slug);
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});

  const { data: allContents, isLoading } = useQuery({
    queryKey: ["admin-page-contents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents" as any)
        .select("page_slug, section_key, content");
      if (error) throw error;
      const map: Record<string, Record<string, string>> = {};
      (data as any[] || []).forEach((row: any) => {
        if (!map[row.page_slug]) map[row.page_slug] = {};
        map[row.page_slug][row.section_key] = row.content;
      });
      return map;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ pageSlug, sections }: { pageSlug: string; sections: Record<string, string> }) => {
      const entries = Object.entries(sections);
      for (const [key, content] of entries) {
        const { error } = await supabase
          .from("page_contents" as any)
          .upsert(
            { page_slug: pageSlug, section_key: key, content } as any,
            { onConflict: "page_slug,section_key" }
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
  const currentData = { ...(allContents?.[activeTab] || {}), ...(edits[activeTab] || {}) };

  const updateField = (key: string, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [activeTab]: { ...(prev[activeTab] || {}), [key]: value },
    }));
  };

  const handleSave = () => {
    const pageEdits = edits[activeTab];
    if (!pageEdits || Object.keys(pageEdits).length === 0) {
      toast({ title: "No changes to save" });
      return;
    }
    saveMutation.mutate({ pageSlug: activeTab, sections: pageEdits });
    setEdits((prev) => {
      const next = { ...prev };
      delete next[activeTab];
      return next;
    });
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold">Page Editor</h2>
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
          {activePage.sections.map((section) => (
            <div key={section.key}>
              <label className="text-sm font-medium mb-2 block">{section.label}</label>
              {section.type === "rich" ? (
                <RichTextEditor
                  value={currentData[section.key] || ""}
                  onChange={(html) => updateField(section.key, html)}
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
          ))}

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
