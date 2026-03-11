import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { format } from "date-fns";
import { Clock, Search, Package, ShoppingCart, Users, Settings, Tag, MessageSquare } from "lucide-react";

const ENTITY_ICONS: Record<string, typeof Package> = {
  order: ShoppingCart,
  product: Package,
  customer: Users,
  coupon: Tag,
  review: MessageSquare,
  settings: Settings,
};

export default function AdminActivityLog() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-activity-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const filtered = logs.filter((l: any) => {
    const matchSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(search.toLowerCase());
    const matchEntity = entityFilter === "all" || l.entity_type === entityFilter;
    return matchSearch && matchEntity;
  });

  const entityTypes = [...new Set(logs.map((l: any) => l.entity_type))].filter(Boolean);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h2 className="text-xl font-display font-bold">Activity Log</h2>
        <p className="text-sm text-muted-foreground mt-1">Track all admin actions and changes</p>
      </div>

      <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions..."
            className="h-10 w-full rounded-[4px] border border-border bg-background pl-10 pr-4 text-sm"
          />
        </div>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="h-10 rounded-[4px] border border-border bg-background px-3 text-sm"
        >
          <option value="all">All Types</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No activity logged yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((log: any) => {
            const Icon = ENTITY_ICONS[log.entity_type] || Clock;
            return (
              <div key={log.id} className="flex items-start gap-4 rounded-[4px] border border-border p-4 hover:bg-muted/30 transition-colors">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{log.action}</p>
                  {log.details && <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {log.entity_type}
                    </span>
                    {log.entity_id && (
                      <span className="text-[10px] font-mono text-muted-foreground">{log.entity_id.slice(0, 8)}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(log.created_at), "MMM d, HH:mm")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
