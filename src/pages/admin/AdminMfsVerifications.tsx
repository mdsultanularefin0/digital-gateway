import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search, ShieldCheck, Smartphone, RefreshCw } from "lucide-react";
import { exportToCSV } from "@/lib/admin-utils";
import { format } from "date-fns";
import { DateRangeFilter, filterByDateRange, type DateRange } from "@/components/admin/DateRangeFilter";
import { useSiteSettings } from "@/hooks/use-site-settings";

export default function AdminMfsVerifications() {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const { data: settings } = useSiteSettings();
  const sym = settings?.currency_symbol || "৳";
  const queryClient = useQueryClient();

  const { data: verifications, isLoading } = useQuery({
    queryKey: ["admin-mfs-verifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("send_money_verifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const all = verifications || [];
  const dateFiltered = filterByDateRange(all, dateRange, (v) => v.created_at);

  const filtered = dateFiltered.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.trx_id.toLowerCase().includes(q) ||
      v.sender_number.toLowerCase().includes(q) ||
      v.provider.toLowerCase().includes(q)
    );
  });

  const totalCount = dateFiltered.length;
  const totalAmount = dateFiltered.reduce((s, v) => s + Number(v.amount || 0), 0);
  const matchedCount = dateFiltered.filter((v) => (v as any).matched_order_id).length;
  const unmatchedCount = dateFiltered.filter((v) => !(v as any).matched_order_id).length;

  const handleExport = () => {
    if (!filtered.length) return;
    exportToCSV(
      filtered.map((v) => ({
        trx_id: v.trx_id,
        sender_number: v.sender_number,
        amount: v.amount,
        provider: v.provider,
        verified: v.verified,
        created_at: v.created_at,
      })),
      `mfs-verifications-${new Date().toISOString().slice(0, 10)}`
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-display font-bold">MFS Verifications</h2>
          <p className="text-sm text-muted-foreground">Incoming payment confirmations received via webhook</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Total Received</p>
            <p className="text-2xl font-display font-bold">{totalCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Total Amount</p>
            <p className="text-2xl font-display font-bold">{sym}{totalAmount.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Matched</p>
            <p className="text-2xl font-display font-bold text-success">{matchedCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Unmatched</p>
            <p className="text-2xl font-display font-bold text-warning">{unmatchedCount}</p>
          </div>
        </div>

        <DateRangeFilter value={dateRange} onChange={setDateRange} />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by TxID, Sender, Provider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-mfs-verifications"] })}
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">No verifications received yet</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">TxID</th>
                    <th className="text-left font-medium px-4 py-3">Provider</th>
                    <th className="text-left font-medium px-4 py-3">Sender</th>
                    <th className="text-right font-medium px-4 py-3">Amount</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="text-left font-medium px-4 py-3">Received At</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => (
                    <tr key={v.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs">{v.trx_id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Smartphone className="h-3 w-3" />
                          {v.provider === "bkash" ? "bKash" : v.provider === "nagad" ? "Nagad" : v.provider}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs">{v.sender_number || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        <span className="font-mono">{sym}{Number(v.amount).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        {(v as any).matched_order_id ? (
                          <Badge variant="default" className="text-xs gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Matched
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Clock className="h-3 w-3" />
                            Unmatched
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(v.created_at), "MMM dd, yyyy HH:mm")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
