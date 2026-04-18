import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Search, Check, Star, Trash2, MessageSquare, Sparkles, Loader2, Copy, Globe } from "lucide-react";
import { format } from "date-fns";
import { getErrorMessage } from "@/lib/admin-utils";
import type { Tables } from "@/integrations/supabase/types";

type ReviewWithProduct = Tables<"reviews"> & { products: { name: string } | null };

export default function AdminReviews() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, products(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReviewWithProduct[];
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

  const filtered = reviews.filter((r: ReviewWithProduct) => {
    const matchSearch =
      r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      r.content.toLowerCase().includes(search.toLowerCase());
    if (filter === "pending") return matchSearch && !r.approved;
    if (filter === "approved") return matchSearch && r.approved;
    if (filter === "featured") return matchSearch && r.featured;
    return matchSearch;
  });

  const pendingCount = reviews.filter((r: ReviewWithProduct) => !r.approved).length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-bold">Reviews</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingCount > 0 ? `${pendingCount} pending approval` : "All reviews approved"}
          </p>
        </div>
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
          {filtered.map((r: ReviewWithProduct) => (
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
                    {r.products?.name || "Unknown product"} • {format(new Date(r.created_at), "PP")}
                  </p>
                  {r.title && <p className="text-sm font-medium mb-0.5">{r.title}</p>}
                  <p className="text-sm text-muted-foreground">{r.content}</p>
                  <ReviewResponseGenerator review={r} />
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => toggleApprove.mutate({ id: r.id, approved: !r.approved })}
                    className={r.approved ? "text-green-500" : "text-yellow-500"}
                    title={r.approved ? "Unapprove" : "Approve"}
                  >
                    {r.approved ? <Check className="h-4 w-4" /> : <Check className="h-4 w-4" />}
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
    </AdminLayout>
  );
}

function ReviewResponseGenerator({ review }: { review: ReviewWithProduct }) {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState<"en" | "bn">("en");
  const [userContext, setUserContext] = useState("");
  const [showContext, setShowContext] = useState(false);

  const generate = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          type: "review_response",
          language,
          userContext,
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
    } catch (e: unknown) {
      toast({ title: getErrorMessage(e, "Failed to generate response"), variant: "destructive" });
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
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setLanguage(language === "en" ? "bn" : "en")}
              className="text-[10px] font-medium px-2 py-1 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Globe className="h-3 w-3" />
              {language === "en" ? "EN" : "বা"}
            </button>
            <button
              type="button"
              onClick={() => setShowContext((v) => !v)}
              className={`text-[10px] font-medium px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                userContext.trim() || showContext
                  ? "border-primary/40 text-primary bg-primary/5"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              + Context{userContext.trim() ? " ✓" : ""}
            </button>
            <Button variant="ghost" size="sm" onClick={generate} disabled={loading} className="text-xs gap-1.5 h-7 text-muted-foreground hover:text-foreground">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {loading ? "Generating..." : "AI Reply"}
            </Button>
          </div>
          {showContext && (
            <textarea
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              placeholder="e.g. Mention our 30-day return policy. Apologize for shipping delay. Keep tone empathetic."
              className="w-full text-xs rounded-lg border border-border/60 bg-background p-2 min-h-[60px] resize-y"
            />
          )}
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
