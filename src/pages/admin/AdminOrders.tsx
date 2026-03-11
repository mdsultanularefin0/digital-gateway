import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Search, Eye, Trash2, Package, CheckSquare, Square, MinusSquare, Download } from "lucide-react";
import { format } from "date-fns";
import { useSiteSettings } from "@/hooks/use-site-settings";
import OrderDetail from "@/components/admin/OrderDetail";
import { exportToCSV, logActivity } from "@/lib/admin-utils";

const statuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
const paymentStatuses = ["unpaid", "paid", "refunded"];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  shipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  delivered: "bg-green-500/10 text-green-600 border-green-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const paymentColors: Record<string, string> = {
  unpaid: "bg-destructive/10 text-destructive border-destructive/20",
  paid: "bg-green-500/10 text-green-600 border-green-500/20",
  refunded: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const { data: settings } = useSiteSettings();
  const currencySymbol = settings?.currency_symbol || "$";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const fireWebhook = (orderId: string, event: string) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/order-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, event }),
    }).catch(() => {});
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
      fireWebhook(id, "order.status_changed");
      logActivity("Updated order status", "order", id, `Status changed to ${status}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "Order status updated" });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, payment_status }: { id: string; payment_status: string }) => {
      const { error } = await supabase.from("orders").update({ payment_status }).eq("id", id);
      if (error) throw error;
      fireWebhook(id, "order.payment_changed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "Payment status updated" });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "Order deleted" });
      setSelectedOrder(null);
    },
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).in("id", ids);
      if (error) throw error;
      ids.forEach((id) => fireWebhook(id, "order.status_changed"));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setSelectedIds(new Set());
      setBulkAction("");
      toast({ title: `Bulk status updated for ${selectedIds.size} orders` });
    },
  });

  const bulkUpdatePaymentMutation = useMutation({
    mutationFn: async ({ ids, payment_status }: { ids: string[]; payment_status: string }) => {
      const { error } = await supabase.from("orders").update({ payment_status }).in("id", ids);
      if (error) throw error;
      ids.forEach((id) => fireWebhook(id, "order.payment_changed"));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setSelectedIds(new Set());
      setBulkAction("");
      toast({ title: `Bulk payment updated for ${selectedIds.size} orders` });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("orders").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setSelectedIds(new Set());
      setBulkAction("");
      toast({ title: `Deleted ${selectedIds.size} orders` });
    },
  });

  const filtered = orders.filter((o: any) => {
    const matchSearch =
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((o: any) => o.id)));
    }
  };

  const handleBulkApply = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (bulkAction.startsWith("status:")) {
      bulkUpdateStatusMutation.mutate({ ids, status: bulkAction.replace("status:", "") });
    } else if (bulkAction.startsWith("payment:")) {
      bulkUpdatePaymentMutation.mutate({ ids, payment_status: bulkAction.replace("payment:", "") });
    } else if (bulkAction === "delete") {
      if (confirm(`Delete ${ids.length} orders permanently?`)) {
        bulkDeleteMutation.mutate(ids);
      }
    }
  };

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filtered.length;

  if (selectedOrder) {
    return (
      <AdminLayout>
        <OrderDetail
          order={selectedOrder}
          currencySymbol={currencySymbol}
          onBack={() => setSelectedOrder(null)}
          onDelete={(id) => deleteOrderMutation.mutate(id)}
          onUpdateStatus={(id, status) => {
            updateStatusMutation.mutate({ id, status });
            setSelectedOrder({ ...selectedOrder, status });
          }}
          onUpdatePayment={(id, payment_status) => {
            updatePaymentMutation.mutate({ id, payment_status });
            setSelectedOrder({ ...selectedOrder, payment_status });
          }}
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-bold">Orders</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage customer orders</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, name, email..."
            className="h-10 w-full rounded-[4px] border border-border bg-background pl-10 pr-4 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-[4px] border border-border bg-background px-3 text-sm"
        >
          <option value="all">All Status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-[4px] border border-primary/20 bg-primary/5">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="h-9 rounded-[4px] border border-border bg-background px-3 text-sm"
          >
            <option value="">Choose action...</option>
            <optgroup label="Set Status">
              {statuses.map((s) => (
                <option key={s} value={`status:${s}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </optgroup>
            <optgroup label="Set Payment">
              {paymentStatuses.map((s) => (
                <option key={s} value={`payment:${s}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </optgroup>
            <optgroup label="Danger">
              <option value="delete">Delete Selected</option>
            </optgroup>
          </select>
          <Button
            size="sm"
            disabled={!bulkAction}
            onClick={handleBulkApply}
            variant={bulkAction === "delete" ? "destructive" : "default"}
          >
            Apply
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setSelectedIds(new Set()); setBulkAction(""); }}>
            Clear
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-muted-foreground">Loading orders...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No orders found</p>
        </div>
      ) : (
        <div className="rounded-[4px] border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-3 w-10">
                  <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground">
                    {allSelected ? <CheckSquare className="h-4 w-4" /> : someSelected ? <MinusSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  </button>
                </th>
                <th className="text-left p-3 font-medium">Order #</th>
                <th className="text-left p-3 font-medium">Customer</th>
                <th className="text-left p-3 font-medium">Total</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Payment</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((o: any) => (
                <tr key={o.id} className={`transition-colors ${selectedIds.has(o.id) ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                  <td className="p-3">
                    <button onClick={() => toggleSelect(o.id)} className="text-muted-foreground hover:text-foreground">
                      {selectedIds.has(o.id) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="p-3 font-mono text-xs">{o.order_number}</td>
                  <td className="p-3">
                    <div className="font-medium">{o.customer_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{o.customer_email}</div>
                  </td>
                  <td className="p-3 font-medium">{currencySymbol}{Number(o.total).toFixed(2)}</td>
                  <td className="p-3">
                    <select
                      value={o.status}
                      onChange={(e) => updateStatusMutation.mutate({ id: o.id, status: e.target.value })}
                      className={`h-7 rounded-full border px-2 text-xs font-medium cursor-pointer appearance-none text-center ${statusColors[o.status] || "bg-muted"}`}
                      style={{ minWidth: 100 }}
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      value={o.payment_status}
                      onChange={(e) => updatePaymentMutation.mutate({ id: o.id, payment_status: e.target.value })}
                      className={`h-7 rounded-full border px-2 text-xs font-medium cursor-pointer appearance-none text-center ${paymentColors[o.payment_status] || "bg-muted"}`}
                      style={{ minWidth: 80 }}
                    >
                      {paymentStatuses.map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">{format(new Date(o.created_at), "PP")}</td>
                  <td className="p-3 text-right flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(o)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("Delete this order?")) deleteOrderMutation.mutate(o.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
