import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { TrendingUp, ShoppingCart, Users, Wallet, Download } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { exportToCSV } from "@/lib/admin-utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { DateRangeFilter, filterByDateRange, type DateRange } from "@/components/admin/DateRangeFilter";
import type { Tables } from "@/integrations/supabase/types";

type OrderRow = Tables<"orders">;
type OrderItemRow = Tables<"order_items">;

const PIE_COLORS = [
  "hsl(210, 100%, 45%)",
  "hsl(195, 80%, 45%)",
  "hsl(160, 60%, 45%)",
  "hsl(45, 90%, 50%)",
  "hsl(0, 62%, 50%)",
];

export default function AdminSales() {
  const { data: settings } = useSiteSettings();
  const currencySymbol = settings?.currency_symbol || "৳";
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  const { data: allOrders = [] } = useQuery({
    queryKey: ["admin-orders-sales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allOrderItems = [] } = useQuery({
    queryKey: ["admin-order-items-sales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("order_items").select("*");
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

  // Apply date range filter
  const orders = filterByDateRange(allOrders as OrderRow[], dateRange, (o: OrderRow) => o.created_at);
  const orderIds = new Set(orders.map((o: OrderRow) => o.id));
  const orderItems = (allOrderItems as OrderItemRow[]).filter((item: OrderItemRow) => orderIds.has(item.order_id));

  const paidOrders = orders.filter((o: OrderRow) => o.payment_status === "paid");
  const totalRevenue = paidOrders.reduce((sum: number, o: OrderRow) => sum + Number(o.total), 0);
  const totalOrders = orders.length;
  const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  const today = startOfDay(new Date());
  const todayRevenue = paidOrders
    .filter((o: OrderRow) => new Date(o.created_at) >= today)
    .reduce((sum: number, o: OrderRow) => sum + Number(o.total), 0);
  const todayOrders = orders.filter((o: OrderRow) => new Date(o.created_at) >= today).length;

  // Last 30 days revenue
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayOrders = paidOrders.filter((o: OrderRow) => {
      const d = new Date(o.created_at);
      return d >= dayStart && d < dayEnd;
    });
    return {
      date: format(date, "MMM d"),
      revenue: dayOrders.reduce((s: number, o: OrderRow) => s + Number(o.total), 0),
      orders: dayOrders.length,
    };
  });

  const last7Days = last30Days.slice(-7);

  // Top products by revenue
  const productRevenue: Record<string, { name: string; revenue: number; quantity: number }> = {};
  orderItems.forEach((item: OrderItemRow) => {
    const key = item.product_name || "Unknown";
    if (!productRevenue[key]) productRevenue[key] = { name: key, revenue: 0, quantity: 0 };
    productRevenue[key].revenue += Number(item.total);
    productRevenue[key].quantity += item.quantity;
  });
  const topProducts = Object.values(productRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Order status breakdown
  const statusBreakdown = ["pending", "confirmed", "processing", "completed", "cancelled", "refunded"].map((s) => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: orders.filter((o: OrderRow) => o.status === s).length,
  })).filter((s) => s.value > 0);

  // Payment method breakdown
  const paymentMethods: Record<string, number> = {};
  orders.forEach((o: OrderRow) => {
    const method = o.payment_method || "unknown";
    paymentMethods[method] = (paymentMethods[method] || 0) + 1;
  });
  const paymentData = Object.entries(paymentMethods).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const conversionRate = totalOrders > 0 ? ((paidOrders.length / totalOrders) * 100).toFixed(1) : "0";

  const handleExportSales = () => {
    exportToCSV(
      orders.map((o: OrderRow) => ({
        order_number: o.order_number,
        customer: o.customer_name,
        email: o.customer_email,
        total: o.total,
        status: o.status,
        payment_status: o.payment_status,
        payment_method: o.payment_method,
        date: format(new Date(o.created_at), "yyyy-MM-dd HH:mm"),
      })),
      `sales-export-${format(new Date(), "yyyy-MM-dd")}`
    );
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold">Sales & Analytics</h2>
            <p className="text-sm text-muted-foreground mt-1">Comprehensive store performance overview</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportSales}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
        {[
          { label: "Total Revenue", value: `${currencySymbol}${totalRevenue.toFixed(2)}`, icon: Wallet, sub: `${paidOrders.length} paid orders` },
          { label: "Today", value: `${currencySymbol}${todayRevenue.toFixed(2)}`, icon: TrendingUp, sub: `${todayOrders} orders today` },
          { label: "Avg Order", value: `${currencySymbol}${avgOrderValue.toFixed(2)}`, icon: ShoppingCart, sub: `${totalOrders} total orders` },
          { label: "Customers", value: customerCount, icon: Users, sub: "Total registered" },
          { label: "Conversion", value: `${conversionRate}%`, icon: TrendingUp, sub: "Paid / Total orders" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <div className="text-2xl font-display font-bold">{s.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue Trend (30 days) */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">Revenue Trend (30 Days)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={last30Days}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${currencySymbol}${v}`} />
              <Tooltip
                formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, "Revenue"]}
                contentStyle={{ fontSize: 12, borderRadius: 4, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
              />
              <Line type="monotone" dataKey="revenue" stroke="hsl(210, 100%, 45%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Weekly Bar Chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">Last 7 Days</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} hide />
                <Tooltip
                  formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, "Revenue"]}
                  contentStyle={{ fontSize: 12, borderRadius: 4, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                />
                <Bar dataKey="revenue" fill="hsl(210, 100%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Pie */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">Order Status</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                  {statusBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Pie */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">Payment Methods</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                  {paymentData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="rounded-xl border border-border bg-card mb-6">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top Products by Revenue</h3>
        </div>
        {topProducts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No product data yet</div>
        ) : (
          <div className="divide-y divide-border">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.quantity} units sold</p>
                  </div>
                </div>
                <span className="font-bold">{currencySymbol}{p.revenue.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Orders</h3>
        </div>
        {orders.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No orders yet</div>
        ) : (
          <div className="divide-y divide-border">
            {orders.slice(0, 10).map((o: OrderRow) => (
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
