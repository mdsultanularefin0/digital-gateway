import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, ShoppingCart, MessageSquare, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface ActivityRow {
  id: string;
  kind: "order" | "review" | "customer" | "log";
  label: string;
  href: string;
  created_at: string;
  icon: typeof Activity;
}

export function RecentActivityWidget() {
  const { data: activity = [], isLoading } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async (): Promise<ActivityRow[]> => {
      const [orders, reviews, customers] = await Promise.all([
        supabase.from("orders").select("id, order_number, customer_name, total, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("reviews").select("id, customer_name, rating, approved, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("customers").select("id, name, email, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      const rows: ActivityRow[] = [];
      (orders.data || []).forEach((o) =>
        rows.push({
          id: `o-${o.id}`,
          kind: "order",
          label: `New order ${o.order_number} from ${o.customer_name || "guest"}`,
          href: `/admin/orders`,
          created_at: o.created_at,
          icon: ShoppingCart,
        })
      );
      (reviews.data || []).forEach((r) =>
        rows.push({
          id: `r-${r.id}`,
          kind: "review",
          label: `${r.approved ? "Review" : "Pending review"} (${r.rating}★) from ${r.customer_name || "anon"}`,
          href: `/admin/reviews`,
          created_at: r.created_at,
          icon: MessageSquare,
        })
      );
      (customers.data || []).forEach((c) =>
        rows.push({
          id: `c-${c.id}`,
          kind: "customer",
          label: `New customer ${c.name || c.email}`,
          href: `/admin/customers`,
          created_at: c.created_at,
          icon: UserPlus,
        })
      );

      return rows
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 12);
    },
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="font-display font-semibold text-base">Recent Activity</h3>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent events.</p>
      ) : (
        <ul className="space-y-2">
          {activity.map((row) => (
            <li key={row.id}>
              <Link
                to={row.href}
                className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <row.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{row.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
