import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, Download, RefreshCw, Search, XCircle } from "lucide-react";
import { format } from "date-fns";
import { AdminLayout } from "@/components/AdminLayout";
import { DateRangeFilter, filterByDateRange, type DateRange } from "@/components/admin/DateRangeFilter";
import { PaginationBar } from "@/components/admin/PaginationBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/admin-utils";
import { usePagination } from "@/hooks/use-pagination";

type EventTrackingLog = {
  id: string;
  event_name: string;
  event_id: string;
  source: string;
  status: string;
  http_status: number | null;
  events_received: number | null;
  match_quality: number | null;
  order_number: string;
  event_source_url: string;
  user_data_keys: string[];
  error: string;
  created_at: string;
};

const statusStyles: Record<string, string> = {
  sent: "text-success border-success/30 bg-success/10",
  failed: "text-destructive border-destructive/30 bg-destructive/10",
  pending: "text-warning border-warning/30 bg-warning/10",
};

export default function AdminEventTracking() {
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-event-tracking"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("event_tracking_logs")
        .select("id,event_name,event_id,source,status,http_status,events_received,match_quality,order_number,event_source_url,user_data_keys,error,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as EventTrackingLog[];
    },
  });

  const dateFiltered = filterByDateRange(data, dateRange, (event) => event.created_at);
  const eventNames = useMemo(() => Array.from(new Set(data.map((event) => event.event_name).filter(Boolean))).sort(), [data]);
  const filtered = dateFiltered.filter((event) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      event.event_name.toLowerCase().includes(q) ||
      event.event_id.toLowerCase().includes(q) ||
      event.order_number.toLowerCase().includes(q) ||
      event.event_source_url.toLowerCase().includes(q) ||
      event.error.toLowerCase().includes(q);
    const matchesEvent = eventFilter === "all" || event.event_name === eventFilter;
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    return matchesSearch && matchesEvent && matchesStatus;
  });
  const pagination = usePagination(filtered, 25);

  const totalEvents = dateFiltered.length;
  const sentEvents = dateFiltered.filter((event) => event.status === "sent").length;
  const failedEvents = dateFiltered.filter((event) => event.status === "failed").length;
  const purchases = dateFiltered.filter((event) => event.event_name === "Purchase").length;

  const handleExport = () => {
    exportToCSV(
      filtered.map((event) => ({
        event_name: event.event_name,
        event_id: event.event_id,
        source: event.source,
        status: event.status,
        http_status: event.http_status || "",
        events_received: event.events_received || 0,
        order_number: event.order_number,
        user_data_keys: event.user_data_keys.join("|"),
        event_source_url: event.event_source_url,
        error: event.error,
        created_at: event.created_at,
      })),
      `event-tracking-${new Date().toISOString().slice(0, 10)}`
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Total Events</p>
            <p className="text-2xl font-display font-bold">{totalEvents}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Sent</p>
            <p className="text-2xl font-display font-bold text-success">{sentEvents}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Failed</p>
            <p className="text-2xl font-display font-bold text-destructive">{failedEvents}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Purchases</p>
            <p className="text-2xl font-display font-bold">{purchases}</p>
          </div>
        </div>

        <DateRangeFilter value={dateRange} onChange={setDateRange} />

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search event, ID, order, URL, or error..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Event" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {eventNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3"><Activity className="h-12 w-12 mx-auto text-muted-foreground/40" /><p className="text-muted-foreground">No event logs found</p></div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Event</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="text-left font-medium px-4 py-3">Event ID / Order</th>
                    <th className="text-left font-medium px-4 py-3">Signals</th>
                    <th className="text-left font-medium px-4 py-3">URL</th>
                    <th className="text-left font-medium px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.paged.map((event) => {
                    const StatusIcon = event.status === "failed" ? XCircle : CheckCircle2;
                    return (
                      <tr key={event.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3"><div className="font-medium">{event.event_name}</div><div className="text-xs text-muted-foreground uppercase">{event.source}</div></td>
                        <td className="px-4 py-3"><Badge variant="outline" className={`gap-1 ${statusStyles[event.status] || statusStyles.pending}`}><StatusIcon className="h-3 w-3" />{event.status}</Badge><div className="text-xs text-muted-foreground mt-1">HTTP {event.http_status || "—"} · Received {event.events_received || 0}</div></td>
                        <td className="px-4 py-3"><div className="font-mono text-xs max-w-[220px] truncate">{event.event_id}</div>{event.order_number && <div className="text-xs text-muted-foreground">{event.order_number}</div>}</td>
                        <td className="px-4 py-3"><div className="flex flex-wrap gap-1 max-w-[240px]">{event.user_data_keys.map((key) => <Badge key={key} variant="secondary" className="text-[10px]">{key}</Badge>)}</div></td>
                        <td className="px-4 py-3"><span className="block max-w-[260px] truncate text-xs text-muted-foreground">{event.event_source_url}</span>{event.error && <span className="block max-w-[260px] truncate text-xs text-destructive">{event.error}</span>}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(event.created_at), "MMM d, yyyy h:mm a")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <PaginationBar page={pagination.page} pageCount={pagination.pageCount} total={filtered.length} pageSize={25} onPrev={pagination.prev} onNext={pagination.next} />
      </div>
    </AdminLayout>
  );
}