import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Search, Check, X, Star, Trash2, MessageSquare } from "lucide-react";
import { format } from "date-fns";

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
