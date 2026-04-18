import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/lib/storage";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Upload, ImageIcon, FileUp } from "lucide-react";
import { AiGenerateButton } from "@/components/admin/AiGenerateButton";
import { TranslateButton } from "@/components/admin/TranslateButton";
import { MetaSeoFields } from "@/components/admin/MetaSeoFields";
import { BulkBlogImport } from "@/components/admin/BulkBlogImport";
import type { Database } from "@/integrations/supabase/types";

type BlogPost = Database["public"]["Tables"]["blog_posts"]["Row"];
type BlogPostInsert = Database["public"]["Tables"]["blog_posts"]["Insert"];

const emptyPost: BlogPostInsert = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "General",
  author: "GiftCardVibe Team",
  published: false,
};

export default function AdminBlog() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<BlogPost | BlogPostInsert | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeLang, setActiveLang] = useState<"en" | "bn">("en");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadToStorage(file, "blog");
      setEditing((prev) => prev ? { ...prev, image_url: result.url } : prev);
      toast({ title: "Image uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (post: BlogPostInsert & { id?: string }) => {
      const payload = {
        ...post,
        published_at: post.published ? new Date().toISOString() : null,
      };

      if (post.id) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", post.id);
        if (error) throw error;
      } else {
        const { id: _, ...insertPayload } = payload;
        const { error } = await supabase.from("blog_posts").insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      setEditing(null);
      toast({ title: "Post saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast({ title: "Post deleted" });
    },
  });

  const openEditor = (post?: BlogPost) => {
    setActiveLang("en");
    if (post) {
      setEditing(post);
      setIsNew(false);
    } else {
      setEditing({ ...emptyPost });
      setIsNew(true);
    }
  };

  const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    saveMutation.mutate(editing as BlogPostInsert & { id?: string });
  };

  if (editing) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold">{isNew ? "New Blog Post" : "Edit Post"}</h2>
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>

        <form onSubmit={handleSave} className="max-w-2xl space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Slug *</label>
            <input
              required
              value={editing.slug}
              onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Cover Image</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
            />
            {(editing as any).image_url ? (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img src={(editing as any).image_url} alt="Cover" className="w-full h-40 object-cover" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button type="button" variant="secondary" size="icon" className="h-8 w-8" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="secondary" size="icon" className="h-8 w-8" onClick={() => setEditing({ ...editing, image_url: null })}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {uploading ? (
                  <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ImageIcon className="h-8 w-8" />
                )}
                <span className="text-sm">{uploading ? "Uploading..." : "Click to upload cover image"}</span>
              </button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Author</label>
              <input value={editing.author ?? ""} onChange={(e) => setEditing({ ...editing, author: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
            <button type="button" onClick={() => setActiveLang("en")} className={`px-4 h-8 rounded-lg text-xs font-medium transition-colors ${activeLang === "en" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>English</button>
            <button type="button" onClick={() => setActiveLang("bn")} className={`px-4 h-8 rounded-lg text-xs font-medium transition-colors ${activeLang === "bn" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>বাংলা</button>
          </div>

          {activeLang === "en" ? (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">Title *</label>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Excerpt</label>
                  <AiGenerateButton
                    type="blog_seo"
                    payload={{ title: editing.title, content: editing.content, category: editing.category }}
                    onResult={(result) => {
                      const excerptMatch = result.match(/EXCERPT:\s*(.+)/i);
                      if (excerptMatch?.[1]) setEditing({ ...editing, excerpt: excerptMatch[1].trim() });
                    }}
                    label="AI Excerpt"
                  />
                </div>
                <textarea value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} className="w-full rounded-lg border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Content</label>
                  <AiGenerateButton
                    type="blog_draft"
                    payload={{ title: editing.title, category: editing.category, excerpt: editing.excerpt }}
                    onResult={(result) => setEditing({ ...editing, content: result })}
                    label="AI Draft"
                  />
                </div>
                <textarea value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} className="w-full rounded-lg border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[200px]" />
              </div>
              <MetaSeoFields
                values={{
                  meta_title: (editing as any).meta_title ?? "",
                  meta_description: (editing as any).meta_description ?? "",
                  meta_keywords: (editing as any).meta_keywords ?? "",
                  og_image_url: (editing as any).og_image_url ?? "",
                }}
                onChange={(next) => setEditing({ ...editing, ...next } as any)}
                aiType="blog_seo"
                aiPayload={{ title: editing.title, content: editing.content, category: editing.category }}
                langLabel="EN"
              />
            </>
          ) : (
            <>
              <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                Bangla fields are optional. Empty fields fall back to the English version on the storefront.
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">শিরোনাম (Title)</label>
                  <TranslateButton sourceText={editing.title || ""} context="blog" onTranslated={(t) => setEditing({ ...editing, title_bn: t } as any)} size="xs" label="From EN" />
                </div>
                <input value={(editing as any).title_bn ?? ""} onChange={(e) => setEditing({ ...editing, title_bn: e.target.value } as any)} className="h-10 w-full rounded-lg border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Bangla title" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">সারাংশ (Excerpt)</label>
                  <TranslateButton sourceText={editing.excerpt || ""} context="blog" onTranslated={(t) => setEditing({ ...editing, excerpt_bn: t } as any)} size="xs" label="From EN" />
                </div>
                <textarea value={(editing as any).excerpt_bn ?? ""} onChange={(e) => setEditing({ ...editing, excerpt_bn: e.target.value } as any)} className="w-full rounded-lg border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]" placeholder="Bangla excerpt" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">কন্টেন্ট (Content)</label>
                  <TranslateButton sourceText={editing.content || ""} context="blog" onTranslated={(t) => setEditing({ ...editing, content_bn: t } as any)} size="xs" label="From EN" />
                </div>
                <textarea value={(editing as any).content_bn ?? ""} onChange={(e) => setEditing({ ...editing, content_bn: e.target.value } as any)} className="w-full rounded-lg border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[200px]" placeholder="Bangla content" />
              </div>
              <MetaSeoFields
                values={{
                  meta_title: (editing as any).meta_title_bn ?? "",
                  meta_description: (editing as any).meta_description_bn ?? "",
                  meta_keywords: (editing as any).meta_keywords_bn ?? "",
                }}
                onChange={(next) => setEditing({
                  ...editing,
                  meta_title_bn: next.meta_title,
                  meta_description_bn: next.meta_description,
                  meta_keywords_bn: next.meta_keywords,
                } as any)}
                aiType="blog_seo"
                aiPayload={{ title: (editing as any).title_bn || editing.title, content: (editing as any).content_bn || editing.content, category: editing.category, language: "bn" }}
                showOgImage={false}
                langLabel="বাংলা"
                translateAction={
                  <TranslateButton
                    sourceText={`${(editing as any).meta_title || ""}\n---\n${(editing as any).meta_description || ""}\n---\n${(editing as any).meta_keywords || ""}`}
                    context="blog"
                    size="xs"
                    label="From EN"
                    onTranslated={(t) => {
                      const [mt, md, mk] = (t || "").split(/\n---\n/);
                      setEditing({
                        ...editing,
                        meta_title_bn: (mt || "").trim(),
                        meta_description_bn: (md || "").trim(),
                        meta_keywords_bn: (mk || "").trim(),
                      } as any);
                    }}
                  />
                }
              />
            </>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editing.published ?? false} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} className="rounded" />
            Published
          </label>
          <Button variant="gradient" size="lg" type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Post"}
          </Button>
        </form>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold">Blog Posts</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowBulkImport((v) => !v)}>
            <FileUp className="h-4 w-4 mr-1" /> Bulk import
          </Button>
          <Button variant="gradient" size="sm" onClick={() => openEditor()}>
            <Plus className="h-4 w-4 mr-1" /> New Post
          </Button>
        </div>
      </div>

      {showBulkImport && <div className="mb-6"><BulkBlogImport onClose={() => setShowBulkImport(false)} /></div>}

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : !posts?.length ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No blog posts yet. Click "New Post" to create one.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-medium px-4 py-3">Title</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Category</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Status</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.category}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.published ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {p.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditor(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this post?")) deleteMutation.mutate(p.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
