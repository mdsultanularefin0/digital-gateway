import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";

import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Navigate } from "react-router-dom";
import {
  Package, MapPin, User, Settings, Save, LogOut, Download, Lock, Mail,
} from "lucide-react";
import { DownloadLinks } from "@/components/DownloadLinks";
import { CustomerDeliveries } from "@/components/CustomerDeliveries";

async function resendDownloadEmail(orderId: string) {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(`https://${projectId}.supabase.co/functions/v1/send-order-confirmation`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({ order_id: orderId, type: "order_confirmation", origin: window.location.origin }),
  });
  if (!res.ok) throw new Error(await res.text());
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600",
  confirmed: "bg-sky-500/10 text-sky-600",
  processing: "bg-blue-500/10 text-blue-600",
  completed: "bg-green-500/10 text-green-600",
  cancelled: "bg-destructive/10 text-destructive",
  refunded: "bg-orange-500/10 text-orange-600",
};

const paymentColors: Record<string, string> = {
  unpaid: "bg-destructive/10 text-destructive",
  paid: "bg-green-500/10 text-green-600",
  refunded: "bg-yellow-500/10 text-yellow-600",
};

type Tab = "orders" | "downloads" | "address" | "settings";

export default function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings } = useSiteSettings();
  const currencySymbol = settings?.currency_symbol || "৳";
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

  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (passwordForm.newPass.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
    setChangingPassword(false);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated successfully" });
      setPasswordForm({ current: "", newPass: "", confirm: "" });
    }
  };

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
    { key: "downloads", label: "My Downloads", icon: Download },
    { key: "address", label: "Saved Address", icon: MapPin },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <Layout>
      <section className="py-12 md:py-20">
        <div className="container px-5 md:px-8 max-w-5xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-display font-bold">My Account</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={signOut} className="self-start sm:self-auto">
              <LogOut className="h-4 w-4 mr-1" /> Sign Out
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 border-b border-border overflow-x-auto scrollbar-none -mx-5 px-5 md:mx-0 md:px-0">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-4 w-4 shrink-0" />
                <span>{t.label}</span>
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
                    <div key={o.id} className="rounded-lg border border-border p-3 sm:p-4 hover:border-primary/20 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{o.order_number}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[o.status] || "bg-muted"}`}>
                            {o.status?.charAt(0).toUpperCase() + o.status?.slice(1)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${paymentColors[o.payment_status] || "bg-muted"}`}>
                            {o.payment_status?.charAt(0).toUpperCase() + o.payment_status?.slice(1)}
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {format(new Date(o.created_at), "PP")}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {o.order_items?.map((item: any) => (
                          <div key={item.id} className="flex items-start justify-between gap-2 text-sm">
                            <span className="min-w-0">
                              <span className="block truncate">{item.product_name}</span>
                              {item.tier_label && <span className="text-xs text-muted-foreground">{item.tier_label}</span>}
                              {item.quantity > 1 && <span className="text-xs text-muted-foreground"> ×{item.quantity}</span>}
                            </span>
                            <span className="font-medium shrink-0">{currencySymbol}{Number(item.total).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                        <span className="text-xs sm:text-sm text-muted-foreground truncate mr-2">
                          {o.payment_method && `Via ${o.payment_method}`}
                        </span>
                        <span className="font-display font-bold shrink-0">
                          {currencySymbol}{Number(o.total).toFixed(2)}
                        </span>
                      </div>
                      {o.payment_status === "paid" && <CustomerDeliveries orderId={o.id} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* My Downloads */}
          {tab === "downloads" && (
            <div>
              {ordersLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : orders.filter((o: any) => o.payment_status === "paid").length === 0 ? (
                <div className="text-center py-16">
                  <Download className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No downloads available yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Downloads appear here after your order is paid</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.filter((o: any) => o.payment_status === "paid").map((o: any) => (
                    <div key={o.id}>
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <p className="text-sm text-muted-foreground">
                          Order <span className="font-mono">{o.order_number}</span> — {format(new Date(o.created_at), "PP")}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await resendDownloadEmail(o.id);
                              toast({ title: "Download link re-sent", description: `Check ${user.email}` });
                            } catch (e: any) {
                              toast({ title: "Failed to resend", description: e.message, variant: "destructive" });
                            }
                          }}
                        >
                          <Mail className="h-4 w-4 mr-1" /> Resend link
                        </Button>
                      </div>
                      <DownloadLinks orderId={o.id} />
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

          {/* Account Settings */}
          {tab === "settings" && (
            <div className="max-w-lg space-y-8">
              {/* Change Password */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-display font-bold">Change Password</h3>
                </div>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.newPass}
                      onChange={(e) => setPasswordForm((f) => ({ ...f, newPass: e.target.value }))}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                      placeholder="Min 6 characters"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                      placeholder="Re-enter new password"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={changingPassword}>
                    <Lock className="h-4 w-4 mr-1" />
                    {changingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </div>

              {/* Account Info */}
              <div className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Account Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member Since</span>
                    <span className="font-medium">{user.created_at ? format(new Date(user.created_at), "PP") : "—"}</span>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="rounded-lg border border-destructive/20 p-4">
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-destructive">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-3">Sign out of your account on this device.</p>
                <Button variant="destructive" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-1" /> Sign Out
                </Button>
              </div>
            </div>
          )}

        </div>
      </section>
    </Layout>
  );
}
