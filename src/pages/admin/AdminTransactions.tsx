import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Search, ArrowUpDown, CheckCircle2, XCircle, Clock, RefreshCw, CreditCard, Smartphone } from "lucide-react";
import { exportToCSV } from "@/lib/admin-utils";
import { format } from "date-fns";
import { DateRangeFilter, filterByDateRange, type DateRange } from "@/components/admin/DateRangeFilter";
import { useSiteSettings } from "@/hooks/use-site-settings";

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  completed: { icon: CheckCircle2, color: "text-success", label: "Completed" },
  paid: { icon: CheckCircle2, color: "text-success", label: "Paid" },
  pending: { icon: Clock, color: "text-warning", label: "Pending" },
  initiated: { icon: Clock, color: "text-warning", label: "Initiated" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
  refunded: { icon: RefreshCw, color: "text-info", label: "Refunded" },
};

const methodLabels: Record<string, { label: string; icon: typeof CreditCard }> = {
  bkash: { label: "bKash PGW", icon: CreditCard },
  bkash_send: { label: "bKash Send", icon: Smartphone },
  nagad_send: { label: "Nagad Send", icon: Smartphone },
};

export default function AdminTransactions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const { data: settings } = useSiteSettings();
  const sym = settings?.currency_symbol || "৳";

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const allTxns = transactions || [];

  const dateFiltered = filterByDateRange(allTxns, dateRange, (t) => t.created_at);

  const filtered = dateFiltered.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      t.order_number.toLowerCase().includes(q) ||
      t.trx_id.toLowerCase().includes(q) ||
      t.payment_id.toLowerCase().includes(q) ||
      t.customer_name.toLowerCase().includes(q) ||
      t.customer_phone.includes(q) ||
      t.sender_number.includes(q);
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesMethod = methodFilter === "all" || t.payment_method === methodFilter;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Stats
  const totalCount = dateFiltered.length;
  const completedCount = dateFiltered.filter((t) => t.status === "completed" || t.status === "paid").length;
  const pendingCount = dateFiltered.filter((t) => t.status === "pending" || t.status === "initiated").length;
  const totalReceived = dateFiltered
    .filter((t) => t.status === "completed" || t.status === "paid")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const handleExport = () => {
    if (!filtered.length) return;
    exportToCSV(
      filtered.map((t) => ({
        order_number: t.order_number,
        payment_method: t.payment_method,
        provider: t.provider,
        sender_number: t.sender_number,
        trx_id: t.trx_id,
        payment_id: t.payment_id,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        customer_name: t.customer_name,
        customer_email: t.customer_email,
        customer_phone: t.customer_phone,
        verified_at: t.verified_at || "",
        created_at: t.created_at,
      })),
      `transactions-${new Date().toISOString().slice(0, 10)}`
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Total Transactions</p>
            <p className="text-2xl font-display font-bold">{totalCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Completed</p>
            <p className="text-2xl font-display font-bold text-success">{completedCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Pending</p>
            <p className="text-2xl font-display font-bold text-warning">{pendingCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Total Received</p>
            <p className="text-2xl font-display font-bold">{sym}{totalReceived.toLocaleString()}</p>
          </div>
        </div>

        {/* Date Range */}
        <DateRangeFilter value={dateRange} onChange={setDateRange} />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Order #, TxID, Payment ID, Name, Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="bkash">bKash PGW</SelectItem>
              <SelectItem value="bkash_send">bKash Send</SelectItem>
              <SelectItem value="nagad_send">Nagad Send</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="initiated">Initiated</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
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
            <ArrowUpDown className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">No transactions found</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Order #</th>
                    <th className="text-left font-medium px-4 py-3">Method</th>
                    <th className="text-left font-medium px-4 py-3">TxID / Payment ID</th>
                    <th className="text-left font-medium px-4 py-3">Sender</th>
                    <th className="text-left font-medium px-4 py-3">Customer</th>
                    <th className="text-right font-medium px-4 py-3">Amount</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="text-left font-medium px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const sc = statusConfig[t.status] || statusConfig.pending;
                    const StatusIcon = sc.icon;
                    const ml = methodLabels[t.payment_method] || { label: t.payment_method, icon: CreditCard };
                    return (
                      <tr key={t.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs">{t.order_number}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs gap-1">
                            <ml.icon className="h-3 w-3" />
                            {ml.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {t.trx_id && <p className="font-mono text-xs">TxID: {t.trx_id}</p>}
                            {t.payment_id && <p className="font-mono text-xs text-muted-foreground">PID: {t.payment_id}</p>}
                            {!t.trx_id && !t.payment_id && <span className="text-muted-foreground text-xs">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs">{t.sender_number || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="font-medium text-xs">{t.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{t.customer_phone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          <span className="font-mono">{sym}{Number(t.amount).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className={`h-3.5 w-3.5 ${sc.color}`} />
                            <span className={`text-xs font-medium ${sc.color}`}>{sc.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(t.created_at), "MMM dd, yyyy HH:mm")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
