import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, Search, AlertCircle, CheckCircle2, Clock, Mail, MessageSquare,
  CreditCard, Zap, ChevronDown, ChevronRight,
} from "lucide-react";
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
  metadata?: unknown;
  raw?: Record<string, unknown>;
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
      .select("id, created_at, function_name, status_code, message, error, execution_time_ms, metadata, method")
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
      label: `${r.method || "POST"} ${r.function_name}`,
      message: r.message || "",
      error: r.error || "",
      duration_ms: r.execution_time_ms,
      metadata: r.metadata,
      raw: r as unknown as Record<string, unknown>,
    }));
  }

  if (tab === "email") {
    const { data, error } = await supabase
      .from("email_logs")
      .select("id, created_at, recipient, subject, status, error, purpose, sender, triggered_by")
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
      raw: r as unknown as Record<string, unknown>,
    }));
  }

  if (tab === "sms") {
    const { data, error } = await supabase
      .from("sms_logs")
      .select("id, created_at, recipient, content, status, error, tag, provider, message_id, raw_response")
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
      raw: r as unknown as Record<string, unknown>,
    }));
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("id, created_at, order_number, payment_method, status, amount, customer_email, trx_id, raw_response")
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
    raw: r as unknown as Record<string, unknown>,
  }));
}

function statusClass(status: string) {
  if (status === "error") return "bg-destructive/15 text-destructive";
  if (status === "pending") return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400";
  return "bg-green-500/15 text-green-700 dark:text-green-400";
}

function LogCard({ row }: { row: LogRow }) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!(row.error || row.message || row.metadata || row.raw);

  return (
    <div className="rounded-xl border border-border bg-background/50">
      <button
        onClick={() => hasDetail && setOpen(!open)}
        className="w-full text-left p-3 flex items-start gap-3"
      >
        <div className="mt-0.5">
          {hasDetail ? (
            open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : <span className="inline-block w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusClass(row.status)}`}>
              {row.status_code ?? row.status}
            </span>
            <span className="font-mono text-xs truncate">{row.source}</span>
            {row.duration_ms !== undefined && (
              <span className="text-[10px] text-muted-foreground">{row.duration_ms}ms</span>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
              {row.timestamp ? format(new Date(row.timestamp), "MMM d, HH:mm:ss") : "—"}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground truncate">{row.label}</div>
          <div className="mt-1 text-xs truncate">
            {row.error ? <span className="text-destructive">{row.error}</span> : <span>{row.message}</span>}
          </div>
        </div>
      </button>
      {open && hasDetail && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-3">
          {row.error && (
            <DetailBlock title="Error" content={row.error} tone="destructive" />
          )}
          {row.message && (
            <DetailBlock title="Message" content={row.message} />
          )}
          {(() => {
            const meta = row.metadata as Record<string, unknown> | null | undefined;
            if (!meta || typeof meta !== "object") return null;
            const { request_body, response_body, request, stack, ...rest } = meta as Record<string, unknown>;
            return (
              <>
                {request_body !== undefined && request_body !== "" && (
                  <DetailBlock title="Request body" content={safeStringify(request_body)} mono />
                )}
                {response_body !== undefined && response_body !== "" && (
                  <DetailBlock title="Response body" content={safeStringify(response_body)} mono />
                )}
                {request !== undefined && (
                  <DetailBlock title="Request meta" content={safeStringify(request)} mono collapsed />
                )}
                {stack !== undefined && (
                  <DetailBlock title="Stack trace" content={safeStringify(stack)} mono tone="destructive" collapsed />
                )}
                {Object.keys(rest).length > 0 && (
                  <DetailBlock title="Metadata" content={safeStringify(rest)} mono collapsed />
                )}
              </>
            );
          })()}
          {row.raw && (
            <DetailBlock title="Full record" content={safeStringify(row.raw)} mono collapsed />
          )}
        </div>
      )}
    </div>
  );
}

function DetailBlock({
  title, content, mono, tone, collapsed,
}: { title: string; content: string; mono?: boolean; tone?: "destructive"; collapsed?: boolean }) {
  const [show, setShow] = useState(!collapsed);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</div>
        {collapsed && (
          <button onClick={() => setShow(!show)} className="text-[10px] text-primary hover:underline">
            {show ? "hide" : "show"}
          </button>
        )}
      </div>
      {show && (
        <pre className={`text-xs whitespace-pre-wrap break-words rounded-md p-2 max-h-64 overflow-auto ${
          tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-muted/50"
        } ${mono ? "font-mono" : ""}`}>
          {content}
        </pre>
      )}
    </div>
  );
}

function safeStringify(v: unknown): string {
  try {
    if (typeof v === "string") return v;
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
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
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-display font-bold">Activity Logs</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Recent activity from edge functions, emails, SMS, and transactions (last 24h)
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="self-start">
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
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <StatCard label="Total" value={filtered.length} icon={Clock} />
          <StatCard label="Success" value={successCount} icon={CheckCircle2} accent="text-green-600" />
          <StatCard label="Errors" value={errorCount} icon={AlertCircle} accent="text-destructive" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter…"
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

        {/* List — expandable cards (works on mobile + desktop) */}
        {isLoading ? (
          <div className="rounded-xl border border-border p-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border p-12 text-center text-sm text-muted-foreground">
            {tab === "edge"
              ? "No edge function activity in the last 24 hours."
              : "No matching activity in the last 24 hours."}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((row) => <LogCard key={row.id} row={row} />)}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({
  label, value, icon: Icon, accent,
}: { label: string; value: number; icon: React.ElementType; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${accent || ""}`} />
        {label}
      </div>
      <div className={`text-xl sm:text-2xl font-bold mt-1 sm:mt-2 ${accent || ""}`}>{value}</div>
    </div>
  );
}
