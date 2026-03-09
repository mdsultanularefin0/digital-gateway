import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { TrendingUp, ShoppingCart, Users, DollarSign, Package } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

export default function AdminSales() {
  const { data: settings } = useSiteSettings();
  const currencySymbol = settings?.currency_symbol || "$";

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders-sales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: customerCount = 0 } = useQuery({
    queryKey: ["admin-customer-count"],
    queryFn: async () => {
      const { count } = await supabase.from("customers").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const totalRevenue = orders.filter((o: any) => o.payment_status === "paid").reduce((sum: number, o: any) => sum + Number(o.total), 0);
  const totalOrders = orders.length;
  const paidOrders = orders.filter((o: any) => o.payment_status === "paid").length;
  const avgOrderValue = paidOrders > 0 ? totalRevenue / paidOrders : 0;

  const today = startOfDay(new Date());
  const todayRevenue = orders
    .filter((o: any) => o.payment_status === "paid" && new Date(o.created_at) >= today)
    .reduce((sum: number, o: any) => sum + Number(o.total), 0);
  const todayOrders = orders.filter((o: any) => new Date(o.created_at) >= today).length;

  // Last 7 days breakdown
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayOrders = orders.filter((o: any) => {
      const d = new Date(o.created_at);
      return d >= dayStart && d < dayEnd && o.payment_status === "paid";
    });
    return {
      label: format(date, "EEE"),
      date: format(date, "MMM d"),
      revenue: dayOrders.reduce((s: number, o: any) => s + Number(o.total), 0),
      orders: dayOrders.length,
    };
  });

  const maxRevenue = Math.max(...last7Days.map((d) => d.revenue), 1);

  // Recent orders
  const recentOrders = orders.slice(0, 10);

  // Status breakdown
  const statusBreakdown = ["pending", "processing", "shipped", "delivered", "cancelled"].map((s) => ({
    status: s,
    count: orders.filter((o: any) => o.status === s).length,
  }));

  return (
    <AdminLayout>
      <div className="mb-8">
        <h2 className="text-xl font-display font-bold">Sales & Analytics</h2>
        <p className="text-sm text-muted-foreground mt-1">Overview of your store performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
          { label: "Total Revenue", value: `${currencySymbol}${totalRevenue.toFixed(2)}`, icon: DollarSign, sub: `${paidOrders} paid orders` },
          { label: "Today's Revenue", value: `${currencySymbol}${todayRevenue.toFixed(2)}`, icon: TrendingUp, sub: `${todayOrders} orders today` },
          { label: "Avg Order Value", value: `${currencySymbol}${avgOrderValue.toFixed(2)}`, icon: ShoppingCart, sub: `${totalOrders} total orders` },
          { label: "Customers", value: customerCount, icon: Users, sub: "Total registered" },
        ].map((s) => (
          <div key={s.label} className="rounded-[4px] border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
            <div className="text-2xl font-display font-bold">{s.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Revenue Chart (Simple Bar) */}
        <div className="lg:col-span-2 rounded-[4px] border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">Last 7 Days Revenue</h3>
          <div className="flex items-end gap-2 h-40">
            {last7Days.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium">{d.revenue > 0 ? `${currencySymbol}${d.revenue.toFixed(0)}` : ""}</span>
                <div
                  className="w-full rounded-t-sm bg-primary/80 transition-all min-h-[2px]"
                  style={{ height: `${(d.revenue / maxRevenue) * 120}px` }}
                />
                <span className="text-[10px] text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="rounded-[4px] border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">Order Status</h3>
          <div className="space-y-3">
            {statusBreakdown.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className="text-sm capitalize">{s.status}</span>
                <span className="text-sm font-medium">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-[4px] border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Orders</h3>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No orders yet</div>
        ) : (
          <div className="divide-y divide-border">
            {recentOrders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between p-4">
                <div>
                  <span className="font-mono text-xs">{o.order_number}</span>
                  <p className="text-sm font-medium">{o.customer_name || "—"}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{currencySymbol}{Number(o.total).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(o.created_at), "PP")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
