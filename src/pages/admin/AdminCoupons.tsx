import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Tag, Save, X } from "lucide-react";
import { format } from "date-fns";
import { useSiteSettings } from "@/hooks/use-site-settings";

const emptyCoupon = {
  code: "", description: "", discount_type: "percentage", discount_value: 0, min_order_amount: 0, max_uses: null as number | null, active: true, expires_at: "", scope: "global",
};

export default function AdminCoupons() {
  const queryClient = useQueryClient();
  const { data: settings } = useSiteSettings();
  const currencySymbol = settings?.currency_symbol || "৳";
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyCoupon);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-coupons-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        discount_value: Number(form.discount_value),
        min_order_amount: Number(form.min_order_amount),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
      };
      let couponId = editing?.id;
      if (couponId) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", couponId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("coupons").insert(payload).select("id").single();
        if (error) throw error;
        couponId = data.id;
      }

      // Sync coupon_products mapping
      await (supabase as any).from("coupon_products").delete().eq("coupon_id", couponId);
      if (form.scope === "product" && selectedProductIds.length > 0) {
        const rows = selectedProductIds.map((pid) => ({ coupon_id: couponId, product_id: pid }));
        const { error: insErr } = await (supabase as any).from("coupon_products").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: editing?.id ? "Coupon updated" : "Coupon created" });
      setEditing(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "Coupon deleted" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("coupons").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  const openEdit = async (c?: any) => {
    if (c) {
      setForm({
        code: c.code, description: c.description, discount_type: c.discount_type,
        discount_value: c.discount_value, min_order_amount: c.min_order_amount,
        max_uses: c.max_uses, active: c.active,
        expires_at: c.expires_at ? c.expires_at.split("T")[0] : "",
        scope: c.scope || "global",
      });
      setEditing(c);
      // Load assigned products
      const { data } = await (supabase as any).from("coupon_products").select("product_id").eq("coupon_id", c.id);
      setSelectedProductIds((data || []).map((r: any) => r.product_id));
    } else {
      setForm(emptyCoupon);
      setSelectedProductIds([]);
      setEditing({});
    }
    setProductSearch("");
    setProductPickerOpen(false);
  };

  const inputClass = "h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  const toggleProduct = (pid: string) => {
    setSelectedProductIds((prev) => prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]);
  };

  const filteredProducts = products.filter((p: any) => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  const selectedProducts = products.filter((p: any) => selectedProductIds.includes(p.id));

  if (editing) {
    return (
      <AdminLayout>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-display font-bold">{editing.id ? "Edit Coupon" : "New Coupon"}</h2>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="gradient" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </div>
        <div className="max-w-xl rounded-xl border border-border divide-y divide-border">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
            <label className="text-sm font-medium w-36 shrink-0">Code</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className={inputClass} placeholder="e.g. SAVE20" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
            <label className="text-sm font-medium w-36 shrink-0">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} placeholder="e.g. 20% off first order" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
            <label className="text-sm font-medium w-36 shrink-0">Scope</label>
            <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className={inputClass}>
              <option value="global">Global (entire order)</option>
              <option value="product">Product-assigned (specific products)</option>
            </select>
          </div>
          {form.scope === "product" && (
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 p-4">
              <label className="text-sm font-medium w-36 shrink-0 sm:pt-2">Eligible Products</label>
              <div className="flex-1 w-full">
                <div className="flex flex-wrap gap-1.5 mb-2 min-h-[2rem]">
                  {selectedProducts.length === 0 && (
                    <span className="text-xs text-muted-foreground py-1">No products selected</span>
                  )}
                  {selectedProducts.map((p: any) => (
                    <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-1">
                      {p.name}
                      <button type="button" onClick={() => toggleProduct(p.id)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setProductPickerOpen((o) => !o)}>
                  {productPickerOpen ? "Close picker" : "Add products"}
                </Button>
                {productPickerOpen && (
                  <div className="mt-2 rounded-xl border border-border bg-background">
                    <input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products..."
                      className="h-9 w-full rounded-t-xl border-b border-border bg-transparent px-3 text-sm focus:outline-none"
                    />
                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                      {filteredProducts.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-2">No products found</p>
                      ) : filteredProducts.map((p: any) => (
                        <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(p.id)}
                            onChange={() => toggleProduct(p.id)}
                            className="h-4 w-4 rounded border-border"
                          />
                          <span>{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
            <label className="text-sm font-medium w-36 shrink-0">Discount Type</label>
            <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className={inputClass}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount ({currencySymbol})</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
            <label className="text-sm font-medium w-36 shrink-0">Discount Value</label>
            <input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} className={inputClass} />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
            <label className="text-sm font-medium w-36 shrink-0">Min Order Amount</label>
            <input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })} className={inputClass} />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
            <label className="text-sm font-medium w-36 shrink-0">Max Uses</label>
            <input type="number" value={form.max_uses ?? ""} onChange={(e) => setForm({ ...form, max_uses: e.target.value ? Number(e.target.value) : null })} className={inputClass} placeholder="Unlimited" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
            <label className="text-sm font-medium w-36 shrink-0">Expires At</label>
            <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className={inputClass} />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
            <label className="text-sm font-medium w-36 shrink-0">Active</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded border-border" />
              <span className="text-sm">Enabled</span>
            </label>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-bold">Coupons</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage discount codes</p>
        </div>
        <Button variant="gradient" onClick={() => openEdit()}>
          <Plus className="h-4 w-4 mr-1" /> New Coupon
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-20">
          <Tag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No coupons yet</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">Code</th>
                <th className="text-left p-3 font-medium">Scope</th>
                <th className="text-left p-3 font-medium">Discount</th>
                <th className="text-left p-3 font-medium">Used</th>
                <th className="text-left p-3 font-medium">Expires</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coupons.map((c: any) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono font-medium">{c.code}</td>
                  <td className="p-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${(c.scope || "global") === "global" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"}`}>
                      {(c.scope || "global") === "global" ? "Global" : "Product"}
                    </span>
                  </td>
                  <td className="p-3">
                    {c.discount_type === "percentage" ? `${c.discount_value}%` : `${currencySymbol}${Number(c.discount_value).toFixed(2)}`}
                  </td>
                  <td className="p-3">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                  <td className="p-3 text-muted-foreground text-xs">{c.expires_at ? format(new Date(c.expires_at), "PP") : "Never"}</td>
                  <td className="p-3">
                    <button onClick={() => toggleActive.mutate({ id: c.id, active: !c.active })}>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer ${c.active ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                        {c.active ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(c.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
