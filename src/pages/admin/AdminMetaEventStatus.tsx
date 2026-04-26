import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

type MetaEventName = "PageView" | "InitiateCheckout" | "Purchase";

type EventTrackingLog = {
  id: string;
  event_name: string;
  event_id: string;
  status: string;
  http_status: number | null;
  events_received: number | null;
  error: string;
  created_at: string;
};

const trackedEvents: MetaEventName[] = ["PageView", "InitiateCheckout", "Purchase"];

const eventLabels: Record<MetaEventName, string> = {
  PageView: "PageView",
  InitiateCheckout: "Initiate Checkout",
  Purchase: "Purchase",
};

function formatLastSeen(date?: string) {
  if (!date) return "Never";
  return `${formatDistanceToNow(new Date(date), { addSuffix: true })}`;
}

export default function AdminMetaEventStatus() {
  const { data = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-meta-event-status"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("event_tracking_logs")
        .select("id,event_name,event_id,status,http_status,events_received,error,created_at")
        .in("event_name", trackedEvents)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data || []) as EventTrackingLog[];
    },
  });

  const summaries = useMemo(
    () =>
      trackedEvents.map((eventName) => {
        const logs = data.filter((log) => log.event_name === eventName);
        const sent = logs.filter((log) => log.status === "sent").length;
        const failed = logs.filter((log) => log.status === "failed").length;
        const coverage = logs.length ? Math.round((sent / logs.length) * 100) : 0;
        const lastSent = logs.find((log) => log.status === "sent");
        const lastError = logs.find((log) => log.status === "failed" && log.error);

        return {
          eventName,
          total: logs.length,
          sent,
          failed,
          coverage,
          lastSentAt: lastSent?.created_at,
          lastError: lastError?.error || "",
          lastHttpStatus: lastError?.http_status,
        };
      }),
    [data]
  );

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">Meta Event Status</h2>
            <p className="text-sm text-muted-foreground">Pixel/CAPI health for core conversion events.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {summaries.map((summary) => {
              const healthy = summary.coverage >= 75 && !summary.lastError;
              const warning = summary.coverage > 0 && summary.coverage < 75;
              const StatusIcon = healthy ? CheckCircle2 : warning ? AlertTriangle : Activity;

              return (
                <section key={summary.eventName} className="rounded-xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold">{eventLabels[summary.eventName]}</h3>
                      <p className="text-xs text-muted-foreground">Last 300 tracked CAPI logs</p>
                    </div>
                    <Badge variant="outline" className={healthy ? "border-success/30 text-success bg-success/10" : warning ? "border-warning/30 text-warning bg-warning/10" : "border-muted-foreground/30 text-muted-foreground"}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {healthy ? "Healthy" : warning ? "Low coverage" : "No data"}
                    </Badge>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">CAPI coverage</span>
                        <span className="font-semibold">{summary.coverage}%</span>
                      </div>
                      <Progress value={summary.coverage} className="h-2" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-lg font-bold">{summary.total}</p>
                        <p className="text-[11px] text-muted-foreground">Total</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-lg font-bold text-success">{summary.sent}</p>
                        <p className="text-[11px] text-muted-foreground">Sent</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-lg font-bold text-destructive">{summary.failed}</p>
                        <p className="text-[11px] text-muted-foreground">Errors</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Last sent: </span>
                        <span className="font-medium text-foreground">{formatLastSeen(summary.lastSentAt)}</span>
                      </div>
                      {summary.lastError ? (
                        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                          <div className="font-semibold">Latest error {summary.lastHttpStatus ? `(HTTP ${summary.lastHttpStatus})` : ""}</div>
                          <div className="mt-1 line-clamp-4 break-words">{summary.lastError}</div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">No recent errors logged.</div>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}