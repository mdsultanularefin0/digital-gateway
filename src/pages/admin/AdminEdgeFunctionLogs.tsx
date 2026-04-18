import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw, Search, AlertCircle, CheckCircle2, Clock, Mail, MessageSquare, CreditCard, Zap } from "lucide-react";
import { format } from "date-fns";

type SourceTab = "edge" | "email" | "sms" | "transactions";

interface LogRow {
  id: string;
  timestamp: string;
  source: string;
  status: string;
  status_code?: number;
  label: string;
  message: string;
  error: string;
  duration_ms?: number;
}

const TABS: { key: SourceTab; label: string; icon: React.ElementType }[] = [
  { key: "edge", label: "Edge Functions", icon: Zap },
  { key: "email", label: "Email", icon: Mail },
  { key: "sms", label: "SMS", icon: MessageSquare },
  { key: "transactions", label: "Transactions", icon: CreditCard },
];

async function fetchLogs(tab: SourceTab): Promise<LogRow[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  if (tab === "edge") {
    const { data, error } = await supabase
      .from("edge_function_logs")
      .select("id, created_at, function_name, status_code, message, error, execution_time_ms")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data || []).map((r) => ({
      id: r.id,
      timestamp: r.created_at,
      source: r.function_name,
      status: (r.status_code ?? 200) < 400 ? "success" : "error",
      status_code: r.status_code,
      label: r.function_name,
      message: r.message || "",
      error: r.error || "",
      duration_ms: r.execution_time_ms,
    }));
  }

  if (tab === "email") {
    const { data, error } = await supabase
      .from("email_logs")
      .select("id, created_at, recipient, subject, status, error, purpose")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data || []).map((r) => ({
      id: r.id,
      timestamp: r.created_at,
      source: r.purpose || "email",
      status: r.status === "sent" ? "success" : "error",
      label: r.recipient,
      message: r.subject || "",
      error: r.error || "",
    }));
  }

  if (tab === "sms") {
    const { data, error } = await supabase
      .from("sms_logs")
      .select("id, created_at, recipient, content, status, error, tag")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data || []).map((r) => ({
      id: r.id,
      timestamp: r.created_at,
      source: r.tag || "sms",
      status: r.status === "sent" ? "success" : "error",
      label: r.recipient,
      message: r.content || "",
      error: r.error || "",
    }));
  }

  // transactions
  const { data, error } = await supabase
    .from("transactions")
    .select("id, created_at, order_number, payment_method, status, amount, customer_email")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    timestamp: r.created_at,
    source: r.payment_method || "transaction",
    status: r.status === "verified" || r.status === "completed" ? "success" : r.status === "pending" ? "pending" : "error",
    label: r.order_number || r.customer_email,
    message: `${r.payment_method} • ${r.amount}`,
    error: "",
  }));
}

export default function AdminEdgeFunctionLogs() {
  const [tab, setTab] = useState<SourceTab>("edge");
  const [search, setSearch] = useState("");
  const [errorsOnly, setErrorsOnly] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-logs", tab],
    queryFn: () => fetchLogs(tab),
  });

  const filtered = (data ?? []).filter((row) => {
    if (errorsOnly && row.status !== "error") return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      row.source?.toLowerCase().includes(q) ||
      row.label?.toLowerCase().includes(q) ||
      row.message?.toLowerCase().includes(q) ||
      row.error?.toLowerCase().includes(q)
    );
  });

  const successCount = filtered.filter((r) => r.status === "success").length;
  const errorCount = filtered.filter((r) => r.status === "error").length;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-bold">Activity Logs</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Recent activity from edge functions, emails, SMS, and transactions (last 24h)
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Source tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-full border transition-colors ${
                tab === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-foreground/30"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total" value={filtered.length} icon={Clock} />
          <StatCard label="Success" value={successCount} icon={CheckCircle2} accent="text-green-600" />
          <StatCard label="Errors" value={errorCount} icon={AlertCircle} accent="text-destructive" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by source, recipient, or message…"
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={errorsOnly}
              onChange={(e) => setErrorsOnly(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Errors only
          </label>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              {tab === "edge"
                ? "No edge function activity in the last 24 hours. Functions need to log to the edge_function_logs table for entries to appear here."
                : "No matching activity in the last 24 hours."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5">When</th>
                  <th className="text-left px-4 py-2.5">Source</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-left px-4 py-2.5">Target</th>
                  <th className="text-left px-4 py-2.5">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                      {row.timestamp ? format(new Date(row.timestamp), "MMM d, HH:mm:ss") : "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{row.source}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          row.status === "error"
                            ? "bg-destructive/15 text-destructive"
                            : row.status === "pending"
                            ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
                            : "bg-green-500/15 text-green-700 dark:text-green-400"
                        }`}
                      >
                        {row.status_code ?? row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs truncate max-w-[180px]">{row.label}</td>
                    <td className="px-4 py-2.5 text-xs truncate max-w-md">
                      {row.error ? (
                        <span className="text-destructive">{row.error}</span>
                      ) : (
                        row.message
                      )}
                      {row.duration_ms !== undefined && (
                        <span className="ml-2 text-muted-foreground">({row.duration_ms}ms)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/50 backdrop-blur-sm p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${accent || ""}`} />
        {label}
      </div>
      <div className={`text-2xl font-bold mt-2 ${accent || ""}`}>{value}</div>
    </div>
  );
}
