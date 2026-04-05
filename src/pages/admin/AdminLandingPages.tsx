import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Eye, Globe } from "lucide-react";
import { SectionEditor } from "@/components/admin/SectionEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  landingTemplates,
  getDefaultSections,
  type SectionsData,
} from "@/data/landing-templates";

interface LandingPage {
  id: string;
  title: string;
  slug: string;
  template: string;
  sections_en: SectionsData;
  sections_bn: SectionsData;
  published: boolean;
  product_id: string | null;
  language_mode: "en" | "bn" | "both";
  created_at: string;
  updated_at: string;
}

type LandingPageInsert = Omit<LandingPage, "id" | "created_at" | "updated_at"> & { id?: string };

type ProductOption = { id: string; name: string; slug: string };

export default function AdminLandingPages() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<LandingPageInsert | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [activeLang, setActiveLang] = useState<"en" | "bn">("en");
  const [step, setStep] = useState<"template" | "editor">("template");

  const { data: pages, isLoading } = useQuery({
    queryKey: ["admin-landing-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_pages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LandingPage[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (page: LandingPageInsert) => {
      if (page.id) {
        const { error } = await supabase.from("landing_pages").update({
          title: page.title,
          slug: page.slug,
          template: page.template,
          sections_en: page.sections_en as any,
          sections_bn: page.sections_bn as any,
          published: page.published,
        }).eq("id", page.id);
        if (error) throw error;
      } else {
        const { id: _, ...payload } = page;
        const { error } = await supabase.from("landing_pages").insert({
          ...payload,
          sections_en: payload.sections_en as any,
          sections_bn: payload.sections_bn as any,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-landing-pages"] });
      setEditing(null);
      setStep("template");
      toast({ title: "Landing page saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("landing_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-landing-pages"] });
      toast({ title: "Landing page deleted" });
    },
  });

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const openNew = () => {
    setEditing(null);
    setIsNew(true);
    setStep("template");
  };

  const selectTemplate = (templateId: string) => {
    const tmpl = landingTemplates.find((t) => t.id === templateId)!;
    const defaults = getDefaultSections(tmpl);
    setEditing({
      title: "",
      slug: "",
      template: templateId,
      sections_en: defaults,
      sections_bn: defaults,
      published: false,
      product_id: null,
      language_mode: "both",
    });
    setStep("editor");
  };

  const openEdit = (page: LandingPage) => {
    setEditing({ ...page, language_mode: page.language_mode || "both" });
    setIsNew(false);
    setStep("editor");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    saveMutation.mutate(editing);
  };

  // Template selection step
  if (step === "template" && isNew) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold">Choose a Template</h2>
          <Button variant="ghost" size="sm" onClick={() => { setIsNew(false); setStep("template"); }}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {landingTemplates.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => selectTemplate(tmpl.id)}
              className="text-left rounded-xl border-2 border-border hover:border-primary p-6 transition-colors bg-card group"
            >
              <div className="text-3xl mb-3">{tmpl.preview}</div>
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                {tmpl.name} <span className="text-muted-foreground font-normal">/ {tmpl.nameBn}</span>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{tmpl.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {tmpl.sections.map((s) => (
                  <span key={s.id} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">
                    {s.type}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </AdminLayout>
    );
  }

  // Editor step
  if (editing && step === "editor") {
    const tmpl = landingTemplates.find((t) => t.id === editing.template);
    const sections = activeLang === "en" ? editing.sections_en : editing.sections_bn;

    return (
      <AdminLayout>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold">
            {isNew ? "New Landing Page" : "Edit Landing Page"}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => { setEditing(null); setStep("template"); setIsNew(false); }}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>

        <form onSubmit={handleSave} className="max-w-3xl space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Page Title *</label>
              <input
                required
                value={editing.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setEditing({ ...editing, title, slug: isNew ? generateSlug(title) : editing.slug });
                }}
                className="h-10 w-full rounded-lg border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Slug *</label>
              <input
                required
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                className="h-10 w-full rounded-lg border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Template:</span>
            <span className="text-sm text-muted-foreground">{tmpl?.preview} {tmpl?.name}</span>
            <div className="ml-auto flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveLang("en")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${activeLang === "en" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              >
                🇺🇸 English
              </button>
              <button
                type="button"
                onClick={() => setActiveLang("bn")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${activeLang === "bn" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              >
                🇧🇩 বাংলা
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {tmpl?.sections.map((sec) => (
              <SectionEditor
                key={sec.id}
                section={sec}
                content={sections[sec.id] || {}}
                lang={activeLang}
                onChange={(content) => {
                  const key = activeLang === "en" ? "sections_en" : "sections_bn";
                  setEditing({
                    ...editing,
                    [key]: { ...editing[key], [sec.id]: content },
                  });
                }}
              />
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editing.published}
              onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              className="rounded"
            />
            Published
          </label>

          <div className="flex gap-3">
            <Button variant="gradient" size="lg" type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Landing Page"}
            </Button>
            {editing.id && editing.published && (
              <Button type="button" variant="outline" size="lg" asChild>
                <a href={`/p/${editing.slug}`} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4 mr-2" /> Preview
                </a>
              </Button>
            )}
          </div>
        </form>
      </AdminLayout>
    );
  }

  // Listing
  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold">Landing Pages</h2>
        <Button variant="gradient" size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> New Page
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : !pages?.length ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No landing pages yet. Click "New Page" to create one.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-medium px-4 py-3">Title</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Template</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Slug</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Status</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => {
                const tmpl = landingTemplates.find((t) => t.id === p.template);
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{p.title}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {tmpl?.preview} {tmpl?.name ?? p.template}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">/p/{p.slug}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.published ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {p.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {p.published && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={`/p/${p.slug}`} target="_blank" rel="noopener noreferrer">
                              <Globe className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this page?")) deleteMutation.mutate(p.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
