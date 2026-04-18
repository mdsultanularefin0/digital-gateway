import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw, Search, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

const KNOWN_FUNCTIONS = [
  "ai-generate",
  "bkash-payment",
  "capi-event",
  "generate-caption",
  "mail",
  "mfs-webhook",
  "order-webhook",
  "secure-download",
  "send-order-confirmation",
  "sitemap",
  "social-media-poster",
  "translate",
  "verify-send-money",
];

interface InvocationRow {
  id: string;
  timestamp: string;
  function_name: string;
  status_code: number;
  method: string;
  execution_time_ms: number;
  message: string;
}

async function fetchInvocations(functionName: string): Promise<InvocationRow[]> {
  // Hit edge function that proxies analytics — fall back to client query
  // The Supabase JS client cannot directly query the analytics DB, so we
  // call a small admin RPC. Until that exists, surface a helpful empty state.
  const { data, error } = await supabase.functions.invoke("ef-logs-proxy", {
    body: { function_name: functionName, limit: 100 },
  });
  if (error) throw error;
  return (data?.rows ?? []) as InvocationRow[];
}

export default function AdminEdgeFunctionLogs() {
  const [selectedFn, setSelectedFn] = useState<string>(KNOWN_FUNCTIONS[0]);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["edge-function-logs", selectedFn],
    queryFn: () => fetchInvocations(selectedFn),
    retry: false,
  });

  const filtered = (data ?? []).filter((row) =>
    !search ||
    row.message?.toLowerCase().includes(search.toLowerCase()) ||
    String(row.status_code).includes(search)
  );

  const successCount = filtered.filter((r) => r.status_code < 400).length;
  const errorCount = filtered.filter((r) => r.status_code >= 400).length;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-bold">Edge Function Logs</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Inspect recent invocations and errors for backend functions
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Function picker */}
        <div className="flex flex-wrap gap-2">
          {KNOWN_FUNCTIONS.map((fn) => (
            <button
              key={fn}
              onClick={() => setSelectedFn(fn)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                selectedFn === fn
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-foreground/30"
              }`}
            >
              {fn}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total" value={filtered.length} icon={Clock} />
          <StatCard label="Success" value={successCount} icon={CheckCircle2} accent="text-green-600" />
          <StatCard label="Errors" value={errorCount} icon={AlertCircle} accent="text-destructive" />
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by status or message…"
            className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : isError ? (
            <div className="p-8 text-sm">
              <p className="font-medium text-destructive mb-2">Logs proxy not available yet.</p>
              <p className="text-muted-foreground">
                Deploy an <code className="px-1 py-0.5 rounded bg-muted">ef-logs-proxy</code> edge function (admin-gated) that
                queries Supabase analytics for the <code className="px-1 py-0.5 rounded bg-muted">function_edge_logs</code> table.
                Until then, view logs in the Lovable Cloud backend console.
              </p>
              <p className="text-xs text-muted-foreground mt-3 font-mono break-all">
                {error instanceof Error ? error.message : String(error)}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No invocations recorded for <span className="font-medium">{selectedFn}</span>.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5">When</th>
                  <th className="text-left px-4 py-2.5">Method</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-left px-4 py-2.5">Duration</th>
                  <th className="text-left px-4 py-2.5">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                      {row.timestamp ? format(new Date(row.timestamp), "MMM d, HH:mm:ss") : "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{row.method}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          row.status_code >= 500
                            ? "bg-destructive/15 text-destructive"
                            : row.status_code >= 400
                            ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
                            : "bg-green-500/15 text-green-700 dark:text-green-400"
                        }`}
                      >
                        {row.status_code}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs">{row.execution_time_ms}ms</td>
                    <td className="px-4 py-2.5 text-xs truncate max-w-md">{row.message}</td>
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
