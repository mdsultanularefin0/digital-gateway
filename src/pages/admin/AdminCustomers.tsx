import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Edit2, Trash2, Users, X, Save, Download } from "lucide-react";
import { exportToCSV, logActivity } from "@/lib/admin-utils";
import { format } from "date-fns";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { countries } from "@/data/countries-currencies";

const emptyCustomer = {
  name: "", email: "", phone: "", whatsapp: "", address: "", city: "", state: "", country: "", zip_code: "", notes: "", tags: [] as string[], status: "active",
};

export default function AdminCustomers() {
  const queryClient = useQueryClient();
  const { data: settings } = useSiteSettings();
  const currencySymbol = settings?.currency_symbol || "৳";
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyCustomer);
  const [tagInput, setTagInput] = useState("");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing?.id) {
        const { error } = await supabase.from("customers").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customers").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      toast({ title: editing?.id ? "Customer updated" : "Customer added" });
      setEditing(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      toast({ title: "Customer deleted" });
    },
  });

  const openEdit = (c?: any) => {
    if (c) {
      setForm({ name: c.name, email: c.email, phone: c.phone, whatsapp: c.whatsapp, address: c.address, city: c.city, state: c.state, country: c.country, zip_code: c.zip_code, notes: c.notes, tags: c.tags || [], status: c.status });
      setEditing(c);
    } else {
      setForm(emptyCustomer);
      setEditing({});
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const filtered = customers.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  if (editing) {
    const inputClass = "h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
    return (
      <AdminLayout>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-display font-bold">{editing.id ? "Edit Customer" : "New Customer"}</h2>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="gradient" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </div>
        <div className="max-w-2xl space-y-6">
          <div className="rounded-xl border border-border divide-y divide-border">
            {[
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
              { key: "whatsapp", label: "WhatsApp" },
            ].map((f) => (
              <div key={f.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
                <label className="text-sm font-medium w-32 shrink-0">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className={inputClass} />
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border divide-y divide-border">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
              <label className="text-sm font-medium w-32 shrink-0">Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
              <label className="text-sm font-medium w-32 shrink-0">City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
              <label className="text-sm font-medium w-32 shrink-0">State</label>
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputClass} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
              <label className="text-sm font-medium w-32 shrink-0">Country</label>
              <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputClass}>
                <option value="">Select country</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
              <label className="text-sm font-medium w-32 shrink-0">ZIP Code</label>
              <input value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} className={inputClass} />
            </div>
          </div>

          <div className="rounded-xl border border-border divide-y divide-border">
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 p-4">
              <label className="text-sm font-medium w-32 shrink-0 pt-2">Tags</label>
              <div className="flex-1">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {t}
                      <button onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Add tag..." className={`${inputClass} flex-1`} />
                  <Button variant="outline" size="sm" onClick={addTag}>Add</Button>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
              <label className="text-sm font-medium w-32 shrink-0">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 p-4">
              <label className="text-sm font-medium w-32 shrink-0 pt-2">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]" />
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-bold">Customers</h2>
          <p className="text-sm text-muted-foreground mt-1">{customers.length} total customers</p>
        </div>
        <Button variant="gradient" onClick={() => openEdit()}>
          <Plus className="h-4 w-4 mr-1" /> Add Customer
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          exportToCSV(
            customers.map((c: any) => ({
              name: c.name,
              email: c.email,
              phone: c.phone,
              city: c.city,
              country: c.country,
              orders: c.total_orders,
              lifetime_value: c.lifetime_value,
              status: c.status,
            })),
            `customers-${format(new Date(), "yyyy-MM-dd")}`
          );
        }}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm md:max-w-sm" />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No customers found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Phone</th>
                <th className="text-left p-3 font-medium">Orders</th>
                <th className="text-left p-3 font-medium">Lifetime Value</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c: any) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{c.name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.email}</td>
                  <td className="p-3 text-muted-foreground">{c.phone || "—"}</td>
                  <td className="p-3">{c.total_orders}</td>
                  <td className="p-3 font-medium">{currencySymbol}{Number(c.lifetime_value).toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${c.status === "active" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                      {c.status}
                    </span>
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
