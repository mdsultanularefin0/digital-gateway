import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { toast } from "@/hooks/use-toast";
import { Loader2, Package, Search, CheckCircle, Clock, Truck, MapPin } from "lucide-react";
import { motion } from "framer-motion";

interface OrderData {
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  total: number;
  created_at: string;
  updated_at: string;
  items: { product_name: string; tier_label: string; quantity: number; unit_price: number; total: number }[];
}

const STATUSES = ["pending", "processing", "shipped", "delivered"];
const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Order Placed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
};

export default function OrderTrackPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [searched, setSearched] = useState(false);
  const { data: settings } = useSiteSettings();
  const sym = settings?.currency_symbol || "$";

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) {
      toast({ title: "Please enter both order number and email", variant: "destructive" });
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.rpc("track_order", {
        _order_number: orderNumber.trim(),
        _email: email.trim(),
      });
      if (error) throw error;
      setOrder(data as OrderData | null);
      if (!data) {
        toast({ title: "Order not found", description: "Please check your order number and email.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const currentIdx = order ? STATUSES.indexOf(order.status) : -1;

  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container px-5 md:px-8 max-w-2xl">
          <div className="text-center mb-10">
            <MapPin className="h-10 w-10 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-display font-bold">Track Your Order</h1>
            <p className="mt-2 text-muted-foreground">Enter your order number and email to check order status.</p>
          </div>

          <form onSubmit={handleTrack} className="rounded-[4px] border border-border p-6 space-y-4 mb-8">
            <div>
              <label className="text-sm font-medium mb-1 block">Order Number</label>
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ORD-20260311-abc12345"
                className="h-10 w-full rounded-[4px] border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="h-10 w-full rounded-[4px] border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button variant="gradient" size="lg" className="w-full" type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Track Order
            </Button>
          </form>

          {order && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Timeline */}
              <div className="rounded-[4px] border border-border p-6">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-6">Order Status</h2>
                <div className="flex items-center justify-between relative">
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
                  <div
                    className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
                    style={{ width: `${Math.max(0, currentIdx) / (STATUSES.length - 1) * 100}%` }}
                  />
                  {STATUSES.map((s, i) => {
                    const Icon = STATUS_ICONS[s];
                    const isActive = i <= currentIdx;
                    return (
                      <div key={s} className="relative flex flex-col items-center z-10">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                          isActive ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className={`mt-2 text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                          {STATUS_LABELS[s]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Details */}
              <div className="rounded-[4px] border border-border">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Order Details</h2>
                  <span className="text-xs font-mono text-muted-foreground">{order.order_number}</span>
                </div>
                <div className="divide-y divide-border">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between gap-2 p-4">
                      <div>
                        <p className="text-sm font-medium">{item.product_name}</p>
                        {item.tier_label && <p className="text-xs text-muted-foreground">{item.tier_label}</p>}
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium shrink-0">{sym}{Number(item.total).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-border space-y-1">
                  <div className="flex justify-between text-sm"><span>Subtotal</span><span>{sym}{Number(order.subtotal).toFixed(2)}</span></div>
                  {Number(order.discount) > 0 && <div className="flex justify-between text-sm text-success"><span>Discount</span><span>-{sym}{Number(order.discount).toFixed(2)}</span></div>}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                    <span>Total</span><span>{sym}{Number(order.total).toFixed(2)}</span>
                  </div>
                </div>
                <div className="p-4 border-t border-border flex gap-4 text-xs text-muted-foreground">
                  <span>Payment: {order.payment_method}</span>
                  <span>Status: {order.payment_status}</span>
                  <span>Placed: {new Date(order.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </motion.div>
          )}

          {searched && !order && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No order found. Please double-check your order number and email address.</p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
