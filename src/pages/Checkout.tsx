import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { trackInitiateCheckout, trackPurchase } from "@/lib/meta-pixel";

interface CheckoutForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  couponCode: string;
  notes: string;
  paymentMethod: string;
}

const emptyForm: CheckoutForm = {
  name: "", email: "", phone: "", address: "", couponCode: "", notes: "", paymentMethod: "",
};

const ALL_PAYMENT_METHODS = [
  { value: "cod", label: "Cash on Delivery" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "bank", label: "Bank Transfer" },
  { value: "stripe", label: "Credit/Debit Card" },
];

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { data: settings } = useSiteSettings();
  const sym = settings?.currency_symbol || "$";
  const navigate = useNavigate();

  const [form, setForm] = useState<CheckoutForm>(emptyForm);
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const shippingCost = 0;
  const currency = settings?.currency || "USD";

  // Track InitiateCheckout on mount
  useEffect(() => {
    if (items.length > 0) {
      trackInitiateCheckout({
        content_ids: items.map((i) => i.productId),
        num_items: items.reduce((s, i) => s + i.quantity, 0),
        value: subtotal,
        currency,
      });
    }
  }, []);

  // Parse enabled payment methods from settings
  const enabledMethods = (() => {
    try {
      const raw = settings?.payment_methods as string | undefined;
      if (raw) return JSON.parse(raw) as string[];
    } catch {}
    return ["cod"]; // default fallback
  })();
  const paymentMethods = ALL_PAYMENT_METHODS.filter((m) => enabledMethods.includes(m.value));

  // Auto-select first available payment method
  useEffect(() => {
    if (paymentMethods.length > 0 && !form.paymentMethod) {
      setForm((p) => ({ ...p, paymentMethod: paymentMethods[0].value }));
    }
  }, [enabledMethods.join(",")]);
  const total = subtotal - discount + shippingCost;

  const update = (key: keyof CheckoutForm, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const applyCoupon = async () => {
    if (!form.couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase
        .from("coupons_public")
        .select("*")
        .eq("code", form.couponCode.trim().toUpperCase())
        .eq("is_valid", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({ title: "Invalid coupon", description: "This coupon code is not valid or has expired.", variant: "destructive" });
        return;
      }

      // Check min order
      if (subtotal < Number(data.min_order_amount)) {
        toast({ title: "Minimum order not met", description: `Min order: ${sym}${Number(data.min_order_amount).toFixed(2)}`, variant: "destructive" });
        return;
      }

      const discountAmount = data.discount_type === "percentage"
        ? subtotal * (Number(data.discount_value) / 100)
        : Number(data.discount_value);

      setDiscount(Math.min(discountAmount, subtotal));
      setCouponApplied(data.code!);
      toast({ title: `Coupon applied: ${data.discount_type === "percentage" ? `${data.discount_value}% off` : `${sym}${Number(data.discount_value).toFixed(2)} off`}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setDiscount(0);
    setCouponApplied(null);
    setForm((p) => ({ ...p, couponCode: "" }));
  };

  const placeOrder = async () => {
    if (!form.name || !form.email || !form.phone) {
      toast({ title: "Please fill in your name, email, and phone", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create or find customer via secure server-side function
      const { data: customerId, error: custErr } = await supabase.rpc(
        "upsert_checkout_customer",
        {
          _email: form.email.trim(),
          _name: form.name,
          _phone: form.phone,
          _address: form.address,
        }
      );
      if (custErr) throw custErr;

      // 2. Create order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          customer_name: form.name,
          customer_email: form.email.trim(),
          customer_phone: form.phone,
          shipping_address: form.address,
          subtotal,
          discount,
          shipping_cost: shippingCost,
          total,
          payment_method: form.paymentMethod,
          coupon_code: couponApplied,
          notes: form.notes,
          status: "pending",
          payment_status: "unpaid",
        })
        .select("id, order_number")
        .single();
      if (orderErr) throw orderErr;

      // 3. Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        tier_label: item.tierLabel,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.price * item.quantity,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      // Fire outbound webhook (non-blocking)
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      fetch(`https://${projectId}.supabase.co/functions/v1/order-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, event: "order.created" }),
      }).catch(() => {});

      // Send order confirmation email (non-blocking)
      fetch(`https://${projectId}.supabase.co/functions/v1/send-order-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id }),
      }).catch(() => {});

      // 4. Handle bKash payment
      if (form.paymentMethod === "bkash") {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const callbackURL = `${window.location.origin}/bkash/callback`;

        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/bkash-payment?action=create`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: order.id,
              callbackURL,
              payerReference: form.phone,
            }),
          }
        );

        const bkashData = await res.json();
        if (bkashData.bkashURL) {
          // Store order info for callback page
          localStorage.setItem("bkash_order_id", order.id);
          localStorage.setItem("bkash_order_number", order.order_number);
          // Redirect to bKash
          window.location.href = bkashData.bkashURL;
          return;
        } else {
          throw new Error(bkashData.error || "Failed to initiate bKash payment");
        }
      }

      // 5. Non-bKash: complete normally
      trackPurchase({
        content_ids: items.map((i) => i.productId),
        content_type: "product",
        num_items: items.reduce((s, i) => s + i.quantity, 0),
        value: total,
        currency,
      });
      clearCart();
      setPlacedOrderId(order.id);
      setOrderPlaced(order.order_number);
    } catch (err: any) {
      toast({ title: "Failed to place order", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (orderPlaced) {
    return (
      <Layout>
        <section className="py-20 md:py-32">
          <div className="container max-w-lg text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-display font-bold mb-3">Order Placed!</h1>
            <p className="text-muted-foreground mb-2">Thank you for your order.</p>
            <p className="text-sm font-mono bg-muted rounded-xl inline-block px-4 py-2 mb-8">{orderPlaced}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="gradient" asChild>
                <Link to="/products">Continue Shopping</Link>
              </Button>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (items.length === 0) {
    return (
      <Layout>
        <section className="py-20 md:py-32">
          <div className="container max-w-lg text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-6" />
            <h1 className="text-2xl font-display font-bold mb-3">Your cart is empty</h1>
            <Button variant="gradient" asChild>
              <Link to="/products">Browse Products</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  const inputClass = "h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container px-5 md:px-8 max-w-5xl">
          <h1 className="text-3xl font-display font-bold mb-8">Checkout</h1>

          <div className="grid gap-8 lg:grid-cols-5">
            {/* Form */}
            <div className="lg:col-span-3 space-y-6">
              <div className="rounded-xl border border-border">
                <div className="p-4 border-b border-border">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contact Information</h2>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Full Name *</label>
                      <input value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Email *</label>
                      <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} placeholder="john@example.com" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Phone *</label>
                    <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} placeholder="+880 1234 567890" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border">
                <div className="p-4 border-b border-border">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Address</h2>
                </div>
                <div className="p-4">
                  <label className="text-xs font-medium mb-1 block">Full Address</label>
                  <textarea value={form.address} onChange={(e) => update("address", e.target.value)} className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]" placeholder="House/Apt, Street, Area, City, Country..." />
                </div>
              </div>

              <div className="rounded-xl border border-border">
                <div className="p-4 border-b border-border">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment Method</h2>
                </div>
                <div className="p-4 space-y-2">
                  {paymentMethods.length === 0 && (
                    <p className="text-sm text-muted-foreground">No payment methods available.</p>
                  )}
                  {paymentMethods.map((m) => (
                    <label key={m.value} className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${form.paymentMethod === m.value ? "border-primary bg-primary/5" : "border-border hover:border-foreground/20"}`}>
                      <input
                        type="radio"
                        name="payment"
                        value={m.value}
                        checked={form.paymentMethod === m.value}
                        onChange={(e) => update("paymentMethod", e.target.value)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm font-medium">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Order Notes (optional)</label>
                <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]" placeholder="Special instructions..." />
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border sticky top-24">
                <div className="p-4 border-b border-border">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Order Summary</h2>
                </div>
                <div className="divide-y divide-border">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.tierId}`} className="flex justify-between gap-2 p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.productName}</p>
                        {item.tierLabel && <p className="text-xs text-muted-foreground">{item.tierLabel}</p>}
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium shrink-0">{sym}{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-border space-y-2">
                  {/* Coupon */}
                  {couponApplied ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-500">Coupon: {couponApplied}</span>
                      <button onClick={removeCoupon} className="text-xs text-destructive underline">Remove</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={form.couponCode}
                        onChange={(e) => update("couponCode", e.target.value)}
                        placeholder="Coupon code"
                        className="h-9 flex-1 rounded-xl border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <Button variant="outline" size="sm" onClick={applyCoupon} disabled={couponLoading}>
                        {couponLoading ? "..." : "Apply"}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-border space-y-1.5">
                  <div className="flex justify-between text-sm"><span>Subtotal</span><span>{sym}{subtotal.toFixed(2)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-sm text-green-500"><span>Discount</span><span>-{sym}{discount.toFixed(2)}</span></div>}
                  {shippingCost > 0 && <div className="flex justify-between text-sm"><span>Shipping</span><span>{sym}{shippingCost.toFixed(2)}</span></div>}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                    <span>Total</span>
                    <span>{sym}{total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-4 border-t border-border">
                  <Button variant="gradient" size="lg" className="w-full" onClick={placeOrder} disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {submitting ? "Placing Order..." : "Place Order"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
