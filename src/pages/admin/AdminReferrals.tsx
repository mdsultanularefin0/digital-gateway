import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Copy, Check, Users } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";

interface Referral {
  id: string;
  code: string;
  owner_email: string;
  owner_name: string;
  click_count: number;
  signup_count: number;
  order_count: number;
  total_revenue: number;
  active: boolean;
  created_at: string;
}

export default function AdminReferrals() {
  const qc = useQueryClient();
  const { data: settings } = useSiteSettings();
  const sym = settings?.currency_symbol || "৳";
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", owner_email: "", owner_name: "" });

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Referral[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.code.trim() || !form.owner_email.trim()) throw new Error("Code and email required");
      const { error } = await supabase.from("referrals").insert({
        code: form.code.trim().toUpperCase(),
        owner_email: form.owner_email.trim().toLowerCase(),
        owner_name: form.owner_name.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Referral code created" });
      setForm({ code: "", owner_email: "", owner_name: "" });
      qc.invalidateQueries({ queryKey: ["admin-referrals"] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("referrals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Deleted" });
      qc.invalidateQueries({ queryKey: ["admin-referrals"] });
    },
  });

  const copyLink = (code: string, id: string) => {
    const url = `${window.location.origin}/?ref=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const inputClass = "h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Referrals & Affiliates</h1>
        </div>

        <div className="rounded-xl border border-border p-5 bg-muted/10">
          <h2 className="font-semibold mb-3">Create new referral code</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <input className={inputClass} placeholder="CODE (e.g. ALICE10)" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            <input className={inputClass} placeholder="Owner email" value={form.owner_email} onChange={(e) => setForm((f) => ({ ...f, owner_email: e.target.value }))} />
            <input className={inputClass} placeholder="Owner name (optional)" value={form.owner_name} onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))} />
          </div>
          <Button variant="gradient" size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="mt-3">
            <Plus className="h-3.5 w-3.5 mr-1" /> Create code
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-3">Code</th>
                  <th className="text-left p-3">Owner</th>
                  <th className="text-right p-3">Clicks</th>
                  <th className="text-right p-3">Signups</th>
                  <th className="text-right p-3">Orders</th>
                  <th className="text-right p-3">Revenue</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3 font-mono font-bold">{r.code}</td>
                    <td className="p-3">
                      <div>{r.owner_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.owner_email}</div>
                    </td>
                    <td className="p-3 text-right">{r.click_count}</td>
                    <td className="p-3 text-right">{r.signup_count}</td>
                    <td className="p-3 text-right">{r.order_count}</td>
                    <td className="p-3 text-right font-medium">{sym}{Number(r.total_revenue).toFixed(2)}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => copyLink(r.code, r.id)}>
                        {copiedId === r.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(r.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {referrals.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No referral codes yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
