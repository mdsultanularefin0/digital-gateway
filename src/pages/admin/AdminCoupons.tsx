import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Tag, Save } from "lucide-react";
import { format } from "date-fns";
import { useSiteSettings } from "@/hooks/use-site-settings";

const emptyCoupon = {
  code: "", description: "", discount_type: "percentage", discount_value: 0, min_order_amount: 0, max_uses: null as number | null, active: true, expires_at: "",
};

export default function AdminCoupons() {
  const queryClient = useQueryClient();
  const { data: settings } = useSiteSettings();
  const currencySymbol = settings?.currency_symbol || "$";
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyCoupon);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
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
      if (editing?.id) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
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

  const openEdit = (c?: any) => {
    if (c) {
      setForm({
        code: c.code, description: c.description, discount_type: c.discount_type,
        discount_value: c.discount_value, min_order_amount: c.min_order_amount,
        max_uses: c.max_uses, active: c.active,
        expires_at: c.expires_at ? c.expires_at.split("T")[0] : "",
      });
      setEditing(c);
    } else {
      setForm(emptyCoupon);
      setEditing({});
    }
  };

  const inputClass = "h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

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
