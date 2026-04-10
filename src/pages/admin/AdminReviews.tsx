import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Search, Check, Star, Trash2, MessageSquare, Sparkles, Loader2, Copy, Globe, Plus, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReviewFormData {
  customer_name: string;
  customer_email: string;
  title: string;
  content: string;
  rating: number;
  product_id: string | null;
  approved: boolean;
  featured: boolean;
}

const emptyForm: ReviewFormData = {
  customer_name: "",
  customer_email: "",
  title: "",
  content: "",
  rating: 5,
  product_id: null,
  approved: true,
  featured: false,
};

export default function AdminReviews() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReviewFormData>(emptyForm);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, products(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const toggleApprove = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase.from("reviews").update({ approved }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: "Review updated" });
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase.from("reviews").update({ featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: "Review deleted" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("reviews").update({
          customer_name: form.customer_name,
          customer_email: form.customer_email,
          title: form.title,
          content: form.content,
          rating: form.rating,
          product_id: form.product_id || null,
          approved: form.approved,
          featured: form.featured,
        }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reviews").insert({
          customer_name: form.customer_name,
          customer_email: form.customer_email,
          title: form.title,
          content: form.content,
          rating: form.rating,
          product_id: form.product_id || null,
          approved: form.approved,
          featured: form.featured,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: editingId ? "Review updated" : "Review created" });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      customer_name: r.customer_name,
      customer_email: r.customer_email,
      title: r.title,
      content: r.content,
      rating: r.rating,
      product_id: r.product_id,
      approved: r.approved,
      featured: r.featured,
    });
    setDialogOpen(true);
  };

  const filtered = reviews.filter((r: any) => {
    const matchSearch =
      r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      r.content.toLowerCase().includes(search.toLowerCase());
    if (filter === "pending") return matchSearch && !r.approved;
    if (filter === "approved") return matchSearch && r.approved;
    if (filter === "featured") return matchSearch && r.featured;
    return matchSearch;
  });

  const pendingCount = reviews.filter((r: any) => !r.approved).length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-bold">Reviews</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingCount > 0 ? `${pendingCount} pending approval` : "All reviews approved"}
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Review
        </Button>
      </div>

      <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reviews..." className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
          <option value="all">All Reviews</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="featured">Featured</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No reviews found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r: any) => (
            <div key={r.id} className={`rounded-xl border p-4 ${r.approved ? "border-border" : "border-yellow-500/30 bg-yellow-500/5"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{r.customer_name}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                    {r.featured && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Featured</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {(r as any).products?.name || "Unknown product"} • {format(new Date(r.created_at), "PP")}
                  </p>
                  {r.title && <p className="text-sm font-medium mb-0.5">{r.title}</p>}
                  <p className="text-sm text-muted-foreground">{r.content}</p>
                  <ReviewResponseGenerator review={r} />
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(r)} title="Edit">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => toggleApprove.mutate({ id: r.id, approved: !r.approved })}
                    className={r.approved ? "text-green-500" : "text-yellow-500"}
                    title={r.approved ? "Unapprove" : "Approve"}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => toggleFeatured.mutate({ id: r.id, featured: !r.featured })}
                    title={r.featured ? "Unfeature" : "Feature"}
                  >
                    <Star className={`h-4 w-4 ${r.featured ? "fill-primary text-primary" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(r.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Review Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Review" : "Add Review"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.customer_name.trim() || !form.content.trim()) {
                toast({ title: "Name and content are required", variant: "destructive" });
                return;
              }
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Customer Name *</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="John Doe" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} placeholder="john@example.com" />
              </div>
            </div>

            <div>
              <Label>Product</Label>
              <Select value={form.product_id || "none"} onValueChange={(v) => setForm({ ...form, product_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No product</SelectItem>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Rating</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" onClick={() => setForm({ ...form, rating: s })}>
                    <Star className={`h-6 w-6 cursor-pointer transition-colors ${s <= form.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Great product!" />
            </div>

            <div>
              <Label>Review Content *</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write the review..." rows={3} />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.approved} onChange={(e) => setForm({ ...form, approved: e.target.checked })} className="rounded" />
                Approved
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="rounded" />
                Featured
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {editingId ? "Save Changes" : "Add Review"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function ReviewResponseGenerator({ review }: { review: any }) {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState<"en" | "bn">("en");

  const generate = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          type: "review_response",
          language,
          customerName: review.customer_name,
          rating: review.rating,
          reviewTitle: review.title,
          reviewContent: review.content,
          productName: review.products?.name,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResponse(data?.result || "");
    } catch (e: any) {
      toast({ title: e.message || "Failed to generate response", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = () => {
    if (!response) return;
    navigator.clipboard.writeText(response);
    setCopied(true);
    toast({ title: "Response copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2">
      {!response ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLanguage(language === "en" ? "bn" : "en")}
            className="text-[10px] font-medium px-2 py-1 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Globe className="h-3 w-3" />
            {language === "en" ? "EN" : "বা"}
          </button>
          <Button variant="ghost" size="sm" onClick={generate} disabled={loading} className="text-xs gap-1.5 h-7 text-muted-foreground hover:text-foreground">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {loading ? "Generating..." : "AI Reply"}
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed relative">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Suggested Reply</p>
          {response}
          <div className="flex gap-1 mt-2">
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={copyResponse}>
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={generate} disabled={loading}>
              Regenerate
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setResponse(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
