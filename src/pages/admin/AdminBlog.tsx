import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type BlogPost = Database["public"]["Tables"]["blog_posts"]["Row"];
type BlogPostInsert = Database["public"]["Tables"]["blog_posts"]["Insert"];

const emptyPost: BlogPostInsert = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "General",
  author: "DigiStack Team",
  published: false,
};

export default function AdminBlog() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<BlogPost | BlogPostInsert | null>(null);
  const [isNew, setIsNew] = useState(false);

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
            <label className="text-sm font-medium mb-1 block">Slug *</label>
            <input
              required
              value={editing.slug}
              onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
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
          <div>
            <label className="text-sm font-medium mb-1 block">Excerpt</label>
            <textarea value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} className="w-full rounded-lg border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Content</label>
            <textarea value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} className="w-full rounded-lg border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[200px]" />
          </div>
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
        <Button variant="gradient" size="sm" onClick={() => openEditor()}>
          <Plus className="h-4 w-4 mr-1" /> New Post
        </Button>
      </div>

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
