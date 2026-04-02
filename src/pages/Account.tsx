import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Navigate } from "react-router-dom";
import {
  Package, MapPin, Heart, User, ChevronRight, Save, LogOut,
} from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600",
  processing: "bg-blue-500/10 text-blue-600",
  shipped: "bg-purple-500/10 text-purple-600",
  delivered: "bg-green-500/10 text-green-600",
  cancelled: "bg-destructive/10 text-destructive",
};

const paymentColors: Record<string, string> = {
  unpaid: "bg-destructive/10 text-destructive",
  paid: "bg-green-500/10 text-green-600",
  refunded: "bg-yellow-500/10 text-yellow-600",
};

type Tab = "orders" | "address";

export default function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings } = useSiteSettings();
  const currencySymbol = settings?.currency_symbol || "$";
  const [tab, setTab] = useState<Tab>("orders");

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["my-orders", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("customer_email", user.email.toLowerCase())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
  });

  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ["my-customer", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("email", user.email.toLowerCase())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
  });

  const [addressForm, setAddressForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "",
  });

  const [addressLoaded, setAddressLoaded] = useState(false);
  if (customer && !addressLoaded) {
    setAddressForm({
      name: customer.name || "",
      phone: customer.phone || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      zip_code: customer.zip_code || "",
      country: customer.country || "",
    });
    setAddressLoaded(true);
  }

  const updateAddressMutation = useMutation({
    mutationFn: async () => {
      if (!customer) {
        // Create via RPC
        await supabase.rpc("upsert_checkout_customer", {
          _email: user!.email!,
          _name: addressForm.name,
          _phone: addressForm.phone,
          _address: addressForm.address,
        });
      } else {
        const { error } = await supabase
          .from("customers")
          .update({
            name: addressForm.name,
            phone: addressForm.phone,
            address: addressForm.address,
            city: addressForm.city,
            state: addressForm.state,
            zip_code: addressForm.zip_code,
            country: addressForm.country,
          })
          .eq("id", customer.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-customer"] });
      toast({ title: "Address saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save address", variant: "destructive" });
    },
  });

  // Wishlist
  const { items: wishlistIds } = useWishlist();
  const { data: products = [] } = useProducts();
  const wishlistProducts = products.filter((p) => wishlistIds.includes(p.id));

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const tabs: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: "orders", label: "Order History", icon: Package },
    { key: "address", label: "Saved Address", icon: MapPin },
    { key: "wishlist", label: "Wishlist", icon: Heart },
  ];

  return (
    <Layout>
      <section className="py-12 md:py-20">
        <div className="container px-5 md:px-8 max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold">My Account</h1>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sign Out
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 border-b border-border">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                {t.key === "wishlist" && wishlistIds.length > 0 && (
                  <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {wishlistIds.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Order History */}
          {tab === "orders" && (
            <div>
              {ordersLoading ? (
                <p className="text-muted-foreground">Loading orders...</p>
              ) : orders.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground mb-4">No orders yet</p>
                  <Button variant="gradient" asChild>
                    <a href="/products">Browse Products</a>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((o: any) => (
                    <div key={o.id} className="rounded-lg border border-border p-4 hover:border-primary/20 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-muted-foreground">{o.order_number}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[o.status] || "bg-muted"}`}>
                            {o.status?.charAt(0).toUpperCase() + o.status?.slice(1)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${paymentColors[o.payment_status] || "bg-muted"}`}>
                            {o.payment_status?.charAt(0).toUpperCase() + o.payment_status?.slice(1)}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(o.created_at), "PP")}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {o.order_items?.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span>
                              {item.product_name}
                              {item.tier_label && <span className="text-muted-foreground"> — {item.tier_label}</span>}
                              {item.quantity > 1 && <span className="text-muted-foreground"> ×{item.quantity}</span>}
                            </span>
                            <span className="font-medium">{currencySymbol}{Number(item.total).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                        <span className="text-sm text-muted-foreground">
                          {o.payment_method && `Paid via ${o.payment_method}`}
                        </span>
                        <span className="font-display font-bold">
                          {currencySymbol}{Number(o.total).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Saved Address */}
          {tab === "address" && (
            <div className="max-w-lg">
              {customerLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateAddressMutation.mutate();
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-sm font-medium mb-1 block">Full Name</label>
                    <input
                      value={addressForm.name}
                      onChange={(e) => setAddressForm((f) => ({ ...f, name: e.target.value }))}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Phone</label>
                    <input
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm((f) => ({ ...f, phone: e.target.value }))}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Address</label>
                    <input
                      value={addressForm.address}
                      onChange={(e) => setAddressForm((f) => ({ ...f, address: e.target.value }))}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">City</label>
                      <input
                        value={addressForm.city}
                        onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))}
                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">State</label>
                      <input
                        value={addressForm.state}
                        onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value }))}
                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">ZIP Code</label>
                      <input
                        value={addressForm.zip_code}
                        onChange={(e) => setAddressForm((f) => ({ ...f, zip_code: e.target.value }))}
                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Country</label>
                      <input
                        value={addressForm.country}
                        onChange={(e) => setAddressForm((f) => ({ ...f, country: e.target.value }))}
                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={updateAddressMutation.isPending}>
                    <Save className="h-4 w-4 mr-1" />
                    {updateAddressMutation.isPending ? "Saving..." : "Save Address"}
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* Wishlist */}
          {tab === "wishlist" && (
            <div>
              {wishlistProducts.length === 0 ? (
                <div className="text-center py-16">
                  <Heart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground mb-4">Your wishlist is empty</p>
                  <Button variant="gradient" asChild>
                    <a href="/products">Browse Products</a>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {wishlistProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
