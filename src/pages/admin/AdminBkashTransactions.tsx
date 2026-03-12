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
import { Download, Search, CreditCard, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { exportToCSV } from "@/lib/admin-utils";
import { format } from "date-fns";

interface BkashTransaction {
  orderId: string;
  orderNumber: string;
  paymentID: string;
  trxID: string;
  amount: string;
  currency: string;
  status: string;
  paymentStatus: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  createTime: string;
  completedTime: string;
  merchantInvoice: string;
}

function extractTransactions(orders: any[]): BkashTransaction[] {
  return orders
    .filter((o) => o.bkash_response && o.payment_method === "bkash")
    .map((o) => {
      const resp = o.bkash_response as any;
      const create = resp?.create || {};
      const execute = resp?.execute || {};

      const trxID = execute?.trxID || "";
      const paymentID = create?.paymentID || execute?.paymentID || "";
      const createTime = create?.paymentCreateTime || "";
      const completedTime = execute?.paymentExecuteTime || execute?.updateTime || "";

      let status = "Initiated";
      if (execute?.transactionStatus === "Completed") {
        status = "Completed";
      } else if (create?.transactionStatus === "Initiated" && !execute?.trxID) {
        status = o.payment_status === "paid" ? "Completed" : "Initiated";
      }
      if (o.payment_status === "refunded") status = "Refunded";

      return {
        orderId: o.id,
        orderNumber: o.order_number,
        paymentID,
        trxID,
        amount: create?.amount || String(o.total),
        currency: create?.currency || "BDT",
        status,
        paymentStatus: o.payment_status,
        customerName: o.customer_name,
        customerEmail: o.customer_email,
        customerPhone: o.customer_phone,
        createTime,
        completedTime,
        merchantInvoice: create?.merchantInvoiceNumber || o.id,
      };
    })
    .sort((a, b) => {
      // Sort by createTime descending
      if (a.createTime && b.createTime) return b.createTime.localeCompare(a.createTime);
      return 0;
    });
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  Completed: { icon: CheckCircle2, color: "text-success", label: "Completed" },
  Initiated: { icon: Clock, color: "text-warning", label: "Initiated" },
  Refunded: { icon: RefreshCw, color: "text-info", label: "Refunded" },
  Failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
};

export default function AdminBkashTransactions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-bkash-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_method", "bkash")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const transactions = extractTransactions(orders || []);

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      !search ||
      t.paymentID.toLowerCase().includes(search.toLowerCase()) ||
      t.trxID.toLowerCase().includes(search.toLowerCase()) ||
      t.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.customerPhone.includes(search);
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Summary stats
  const totalCount = transactions.length;
  const completedCount = transactions.filter((t) => t.status === "Completed").length;
  const initiatedCount = transactions.filter((t) => t.status === "Initiated").length;
  const totalAmount = transactions
    .filter((t) => t.status === "Completed")
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const handleExport = () => {
    if (!filtered.length) return;
    exportToCSV(
      filtered.map((t) => ({
        order_number: t.orderNumber,
        payment_id: t.paymentID,
        trx_id: t.trxID,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        payment_status: t.paymentStatus,
        customer_name: t.customerName,
        customer_email: t.customerEmail,
        customer_phone: t.customerPhone,
        created_at: t.createTime,
        completed_at: t.completedTime,
      })),
      `bkash-transactions-${new Date().toISOString().slice(0, 10)}`
    );
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "—";
    try {
      // bKash format: "2026-03-10T00:56:06:329 GMT+0600"
      const cleaned = timeStr.replace(/:(\d{3})\s/, ".$1 ");
      const d = new Date(cleaned);
      if (isNaN(d.getTime())) return timeStr;
      return format(d, "MMM dd, yyyy HH:mm");
    } catch {
      return timeStr;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-[4px] border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Total Transactions</p>
            <p className="text-2xl font-display font-bold">{totalCount}</p>
          </div>
          <div className="rounded-[4px] border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Completed</p>
            <p className="text-2xl font-display font-bold text-success">{completedCount}</p>
          </div>
          <div className="rounded-[4px] border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Pending</p>
            <p className="text-2xl font-display font-bold text-warning">{initiatedCount}</p>
          </div>
          <div className="rounded-[4px] border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Total Received</p>
            <p className="text-2xl font-display font-bold">৳{totalAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Payment ID, TxID, Order #, Name, Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Initiated">Initiated</SelectItem>
              <SelectItem value="Refunded">Refunded</SelectItem>
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
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">No bKash transactions found</p>
          </div>
        ) : (
          <div className="rounded-[4px] border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Order #</th>
                    <th className="text-left font-medium px-4 py-3">Payment ID</th>
                    <th className="text-left font-medium px-4 py-3">TxID</th>
                    <th className="text-left font-medium px-4 py-3">Customer</th>
                    <th className="text-right font-medium px-4 py-3">Amount</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="text-left font-medium px-4 py-3">Created</th>
                    <th className="text-left font-medium px-4 py-3">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => {
                    const sc = statusConfig[t.status] || statusConfig.Initiated;
                    const StatusIcon = sc.icon;
                    return (
                      <tr key={`${t.paymentID}-${i}`} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs">{t.orderNumber}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs break-all">{t.paymentID || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs">{t.trxID || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="font-medium text-xs">{t.customerName}</p>
                            <p className="text-xs text-muted-foreground">{t.customerPhone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          <span className="font-mono">৳{parseFloat(t.amount).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className={`h-3.5 w-3.5 ${sc.color}`} />
                            <span className={`text-xs font-medium ${sc.color}`}>{sc.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(t.createTime)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(t.completedTime)}
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
