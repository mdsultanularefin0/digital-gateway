import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { MessageSquare, Search, Trash2, CheckCircle2, XCircle, Filter, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { toast } from "@/hooks/use-toast";

type SmsLog = {
  id: string;
  recipient: string;
  content: string;
  type: string;
  tag: string;
  provider: string;
  status: string;
  message_id: string;
  error: string;
  remaining_credits: number | null;
  triggered_by: string;
  order_id: string | null;
  created_at: string;
};

export default function AdminSmsLogs() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-sms-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as SmsLog[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sms_logs" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sms-logs"] });
      toast({ title: "Log deleted" });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sms_logs" as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sms-logs"] });
      toast({ title: "All logs cleared" });
    },
  });

  const filtered = logs.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (typeFilter !== "all" && l.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.recipient.toLowerCase().includes(q) ||
        l.content.toLowerCase().includes(q) ||
        (l.tag || "").toLowerCase().includes(q) ||
        (l.error || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stats = {
    total: logs.length,
    sent: logs.filter((l) => l.status === "sent").length,
    failed: logs.filter((l) => l.status === "failed").length,
    marketing: logs.filter((l) => l.type === "marketing").length,
  };

  const handleExport = () => {
    const headers = ["Date", "Recipient", "Type", "Status", "Trigger", "Tag", "Content", "Error", "Message ID"];
    const rows = filtered.map((l) => [
      format(new Date(l.created_at), "yyyy-MM-dd HH:mm:ss"),
      l.recipient,
      l.type,
      l.status,
      l.triggered_by,
      l.tag,
      l.content.replace(/"/g, '""'),
      l.error,
      l.message_id,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sms-logs-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" /> SMS History
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every SMS sent through your store, with delivery status from Brevo
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="h-9 px-3 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
            <button
              onClick={() => {
                if (confirm("Clear ALL SMS logs? This cannot be undone.")) clearAllMutation.mutate();
              }}
              disabled={logs.length === 0}
              className="h-9 px-3 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm font-medium hover:bg-destructive/10 inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Delivered", value: stats.sent, color: "text-green-500" },
            { label: "Failed", value: stats.failed, color: "text-destructive" },
            { label: "Marketing", value: stats.marketing, color: "text-orange-500" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipient, content, tag…"
              className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-xl border border-border bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="sent">Delivered</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-xl border border-border bg-background px-3 text-sm"
          >
            <option value="all">All types</option>
            <option value="transactional">Transactional</option>
            <option value="marketing">Marketing</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Filter className="h-6 w-6 opacity-50" />
              {logs.length === 0 ? "No SMS sent yet. Send one from the SMS tab to see it here." : "No logs match your filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Date</th>
                    <th className="text-left px-4 py-2 font-medium">Recipient</th>
                    <th className="text-left px-4 py-2 font-medium">Type</th>
                    <th className="text-left px-4 py-2 font-medium">Trigger</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Content</th>
                    <th className="text-right px-4 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr key={log.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, HH:mm")}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap font-mono text-xs">{log.recipient}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          log.type === "marketing" ? "bg-orange-500/10 text-orange-600" : "bg-blue-500/10 text-blue-600"
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground capitalize">{log.triggered_by}</td>
                      <td className="px-4 py-2">
                        {log.status === "sent" ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Delivered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium" title={log.error}>
                            <XCircle className="h-3 w-3" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 max-w-md">
                        <p className="truncate text-xs" title={log.content}>{log.content}</p>
                        {log.error && <p className="text-[10px] text-destructive truncate" title={log.error}>{log.error}</p>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => deleteMutation.mutate(log.id)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Delete log"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
