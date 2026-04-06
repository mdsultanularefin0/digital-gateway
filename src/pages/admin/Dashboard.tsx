import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Package, ShoppingCart, Users, Wallet, Tag, MessageSquare } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { DateRangeFilter, filterByDateRange, type DateRange } from "@/components/admin/DateRangeFilter";

export default function AdminDashboard() {
  const { data: settings } = useSiteSettings();
  const currencySymbol = settings?.currency_symbol || "৳";
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  const { data: products } = useQuery({
    queryKey: ["admin-products-dash"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["admin-orders-dash"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id, total, payment_status, created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["admin-customers-dash"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id, created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["admin-reviews-dash"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("id, approved, created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: coupons } = useQuery({
    queryKey: ["admin-coupons-dash"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("id, active, created_at");
      if (error) throw error;
      return data;
    },
  });

  const filteredOrders = filterByDateRange(orders || [], dateRange, (o) => o.created_at);
  const filteredCustomers = filterByDateRange(customers || [], dateRange, (c) => c.created_at);
  const filteredProducts = filterByDateRange(products || [], dateRange, (p) => p.created_at);
  const filteredReviews = filterByDateRange(reviews || [], dateRange, (r) => r.created_at);
  const filteredCoupons = filterByDateRange(coupons || [], dateRange, (c) => c.created_at);

  const revenue = filteredOrders
    .filter((o) => o.payment_status === "paid")
    .reduce((s, o) => s + Number(o.total), 0);

  const pendingReviews = filteredReviews.filter((r) => !r.approved).length;
  const activeCoupons = filteredCoupons.filter((c) => c.active).length;

  const stats = [
    { label: "Revenue", value: `${currencySymbol}${revenue.toFixed(2)}`, icon: DollarSign },
    { label: "Orders", value: filteredOrders.length, icon: ShoppingCart },
    { label: "Customers", value: filteredCustomers.length, icon: Users },
    { label: "Products", value: filteredProducts.length, icon: Package },
    { label: "Pending Reviews", value: pendingReviews, icon: MessageSquare },
    { label: "Active Coupons", value: activeCoupons, icon: Tag },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-display font-bold">Overview</h2>
          <p className="text-sm text-muted-foreground mt-1">Welcome to your admin dashboard.</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
            <div className="text-3xl font-display font-bold">{s.value}</div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
