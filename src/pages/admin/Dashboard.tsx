import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Package, ShoppingCart, Users, DollarSign, Tag, MessageSquare } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";

export default function AdminDashboard() {
  const { data: settings } = useSiteSettings();
  const currencySymbol = settings?.currency_symbol || "$";

  const { data: productCount } = useQuery({
    queryKey: ["admin-product-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: orderCount } = useQuery({
    queryKey: ["admin-order-count"],
    queryFn: async () => {
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: customerCount } = useQuery({
    queryKey: ["admin-customer-count"],
    queryFn: async () => {
      const { count } = await supabase.from("customers").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: revenue } = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("total, payment_status");
      if (error) throw error;
      return (data || []).filter((o: any) => o.payment_status === "paid").reduce((s: number, o: any) => s + Number(o.total), 0);
    },
  });

  const { data: pendingReviews } = useQuery({
    queryKey: ["admin-pending-reviews"],
    queryFn: async () => {
      const { count } = await supabase.from("reviews").select("*", { count: "exact", head: true }).eq("approved", false);
      return count ?? 0;
    },
  });

  const { data: activeCoupons } = useQuery({
    queryKey: ["admin-active-coupons"],
    queryFn: async () => {
      const { count } = await supabase.from("coupons").select("*", { count: "exact", head: true }).eq("active", true);
      return count ?? 0;
    },
  });

  const stats = [
    { label: "Revenue", value: `${currencySymbol}${(revenue ?? 0).toFixed(2)}`, icon: DollarSign },
    { label: "Orders", value: orderCount ?? 0, icon: ShoppingCart },
    { label: "Customers", value: customerCount ?? 0, icon: Users },
    { label: "Products", value: productCount ?? 0, icon: Package },
    { label: "Pending Reviews", value: pendingReviews ?? 0, icon: MessageSquare },
    { label: "Active Coupons", value: activeCoupons ?? 0, icon: Tag },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-display font-bold">Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">Welcome to your admin dashboard.</p>
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
