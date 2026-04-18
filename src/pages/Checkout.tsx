import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, ShoppingBag, Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { DownloadLinks } from "@/components/DownloadLinks";
import { OrderSuccessInstructions } from "@/components/OrderSuccessInstructions";
import { useCheckout } from "@/hooks/use-checkout";
import paymentBkash from "@/assets/payment-bkash.png";
import paymentNagad from "@/assets/payment-nagad.png";
import paymentCod from "@/assets/payment-cod.png";
import paymentBank from "@/assets/payment-bank.png";
import paymentStripe from "@/assets/payment-stripe.png";

const ALL_PAYMENT_METHODS = [
  { value: "cod", label: "Cash on Delivery", logo: paymentCod },
  { value: "bkash", label: "bKash (PGW)", logo: paymentBkash },
  { value: "bkash_send", label: "bKash Send Money", logo: paymentBkash },
  { value: "nagad_send", label: "Nagad Send Money", logo: paymentNagad },
  { value: "bank", label: "Bank Transfer", logo: paymentBank },
  { value: "stripe", label: "Credit/Debit Card", logo: paymentStripe },
];

function SendMoneyPanel({
  provider, amount, currencySymbol, senderNumber, trxId, onSenderChange, onTrxIdChange, settings,
}: {
  provider: string; amount: number; currencySymbol: string;
  senderNumber: string; trxId: string;
  onSenderChange: (v: string) => void; onTrxIdChange: (v: string) => void;
  settings: any;
}) {
  const [copied, setCopied] = useState(false);
  const isBkash = provider === "bkash_send";
  const merchantNumber = isBkash ? settings?.bkash_send_number || "" : settings?.nagad_send_number || "";
  const instructions = isBkash
    ? settings?.bkash_send_instructions || "1. Open bKash app\n2. Tap Send Money\n3. Enter the number shown\n4. Enter the exact amount\n5. Submit your sender number and TrxID below"
    : settings?.nagad_send_instructions || "1. Open Nagad app\n2. Tap Send Money\n3. Enter the number shown\n4. Enter the exact amount\n5. Submit your sender number and TrxID below";

  const copyNumber = () => {
    navigator.clipboard.writeText(merchantNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClass = "h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="border-t border-border p-3 sm:p-4 space-y-3 sm:space-y-4">
      <div className={`rounded-xl p-3 sm:p-4 ${isBkash ? "bg-pink-500/5 border border-pink-500/20" : "bg-orange-500/5 border border-orange-500/20"}`}>
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Send {currencySymbol}{amount.toFixed(2)} to
        </p>
        {merchantNumber ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg sm:text-2xl font-mono font-bold tracking-wider sm:tracking-widest break-all">{merchantNumber}</span>
            <button type="button" onClick={copyNumber} className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0" title="Copy number">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
        ) : (
          <p className="text-sm text-destructive">Merchant number not configured. Please contact support.</p>
        )}
      </div>
      <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted/50 rounded-xl p-3">{instructions}</div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block">Your {isBkash ? "bKash" : "Nagad"} Number *</label>
          <input value={senderNumber} onChange={(e) => onSenderChange(e.target.value)} className={inputClass} placeholder="01XXXXXXXXX" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Transaction ID (TrxID) *</label>
          <input value={trxId} onChange={(e) => onTrxIdChange(e.target.value)} className={inputClass} placeholder="e.g. BIxxxxxxxx" />
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const co = useCheckout();
  const {
    items, subtotal, settings, sym,
    form, update,
    discount, couponApplied, couponLoading, applyCoupon, removeCoupon,
    submitting, placeOrder,
    orderPlaced, placedOrderId,
    shippingCost, total,
  } = co;

  // Parse enabled payment methods
  const enabledMethods = (() => {
    try {
      const raw = settings?.payment_methods as string | undefined;
      if (raw) return JSON.parse(raw) as string[];
    } catch {}
    return ["cod"];
  })();
  const paymentMethods = ALL_PAYMENT_METHODS.filter((m) => enabledMethods.includes(m.value));

  // Auto-select first method
  useEffect(() => {
    if (paymentMethods.length > 0 && !form.paymentMethod) {
      update("paymentMethod", paymentMethods[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledMethods.join(",")]);

  // Show sticky mobile place-order bar after user scrolls past hero
  const [showStickyBar, setShowStickyBar] = useState(false);
  useEffect(() => {
    const handler = () => setShowStickyBar(window.scrollY > 200);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  if (orderPlaced) {
    return (
      <Layout>
        <SEOHead title="Order Confirmed" description="Your order has been received." noIndex disableHreflang />
        <section className="py-20 md:py-32">
          <div className="container max-w-lg mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-8 md:p-12 text-center shadow-xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
              <div className="relative">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }} className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  <h1 className="text-3xl font-display font-bold mb-2">Order Confirmed!</h1>
                  <p className="text-muted-foreground mb-5">Thank you for your purchase. Your order has been received.</p>
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="rounded-xl bg-muted/50 border border-border p-4 mb-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Order Number</p>
                  <p className="text-lg font-mono font-bold text-primary">{orderPlaced}</p>
                </motion.div>
                {placedOrderId && <DownloadLinks orderId={placedOrderId} />}
                <OrderSuccessInstructions />
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                  <Button variant="gradient" asChild><Link to="/products">Continue Shopping</Link></Button>
                  <Button variant="outline" asChild><Link to="/account">View My Orders</Link></Button>
                </motion.div>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-xs text-muted-foreground mt-6">
                  A confirmation email has been sent to your inbox.
                </motion.p>
              </div>
            </motion.div>
          </div>
        </section>
      </Layout>
    );
  }

  if (items.length === 0) {
    return (
      <Layout>
        <SEOHead title="Cart" description="Your cart is empty." noIndex disableHreflang />
        <section className="py-20 md:py-32">
          <div className="container max-w-lg text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-6" />
            <h1 className="text-2xl font-display font-bold mb-3">Your cart is empty</h1>
            <Button variant="gradient" asChild><Link to="/products">Browse Products</Link></Button>
          </div>
        </section>
      </Layout>
    );
  }

  const inputClass = "h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <Layout>
      <SEOHead title="Checkout" description="Complete your purchase securely." noIndex disableHreflang />
      <section className="py-6 sm:py-12 md:py-20">
        <div className="container px-3 sm:px-5 md:px-8 max-w-5xl">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold mb-4 sm:mb-6 md:mb-8">Checkout</h1>

          <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3 space-y-4 sm:space-y-6">
              <div className="rounded-xl border border-border">
                <div className="p-3 sm:p-4 border-b border-border">
                  <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contact Information</h2>
                </div>
                <div className="p-3 sm:p-4 space-y-3">
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
                <div className="p-3 sm:p-4 border-b border-border">
                  <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">Address</h2>
                </div>
                <div className="p-3 sm:p-4">
                  <label className="text-xs font-medium mb-1 block">Full Address</label>
                  <textarea value={form.address} onChange={(e) => update("address", e.target.value)} className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[72px] sm:min-h-[80px]" placeholder="House/Apt, Street, Area, City, Country..." />
                </div>
              </div>

              <div className="rounded-xl border border-border">
                <div className="p-3 sm:p-4 border-b border-border">
                  <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment Method</h2>
                </div>
                <div className="p-3 sm:p-4 space-y-2">
                  {paymentMethods.length === 0 && <p className="text-sm text-muted-foreground">No payment methods available.</p>}
                  {paymentMethods.map((m) => (
                    <label key={m.value} className={`flex items-center gap-2.5 sm:gap-3 rounded-xl border p-2.5 sm:p-3 cursor-pointer transition-colors ${form.paymentMethod === m.value ? "border-primary bg-primary/5" : "border-border hover:border-foreground/20"}`}>
                      <input type="radio" name="payment" value={m.value} checked={form.paymentMethod === m.value} onChange={(e) => update("paymentMethod", e.target.value)} className="h-4 w-4 accent-primary shrink-0" />
                      <img src={m.logo} alt={m.label} className="h-6 w-6 sm:h-7 sm:w-7 object-contain rounded shrink-0" loading="lazy" width={28} height={28} />
                      <span className="text-xs sm:text-sm font-medium truncate">{m.label}</span>
                    </label>
                  ))}
                </div>

                {(form.paymentMethod === "bkash_send" || form.paymentMethod === "nagad_send") && (
                  <SendMoneyPanel
                    provider={form.paymentMethod}
                    amount={total}
                    currencySymbol={sym}
                    senderNumber={form.senderNumber}
                    trxId={form.trxId}
                    onSenderChange={(v) => update("senderNumber", v)}
                    onTrxIdChange={(v) => update("trxId", v)}
                    settings={settings}
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Order Notes (optional)</label>
                <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[72px] sm:min-h-[80px]" placeholder="Special instructions..." />
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border lg:sticky lg:top-24">
                <div className="p-3 sm:p-4 border-b border-border">
                  <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">Order Summary</h2>
                </div>
                <div className="divide-y divide-border">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.tierId}`} className="flex justify-between gap-2 p-3 sm:p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.productName}</p>
                        {item.tierLabel && <p className="text-xs text-muted-foreground truncate">{item.tierLabel}</p>}
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium shrink-0">{sym}{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <div className="p-3 sm:p-4 border-t border-border space-y-2">
                  {couponApplied ? (
                    <div className="flex items-center justify-between text-sm gap-2">
                      <span className="text-green-500 truncate">Coupon: {couponApplied}</span>
                      <button onClick={removeCoupon} className="text-xs text-destructive underline shrink-0">Remove</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input value={form.couponCode} onChange={(e) => update("couponCode", e.target.value)} placeholder="Coupon code" className="h-9 flex-1 min-w-0 rounded-xl border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
                      <Button variant="outline" size="sm" onClick={applyCoupon} disabled={couponLoading} className="shrink-0">
                        {couponLoading ? "..." : "Apply"}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="p-3 sm:p-4 border-t border-border space-y-1.5">
                  <div className="flex justify-between text-sm"><span>Subtotal</span><span>{sym}{subtotal.toFixed(2)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-sm text-green-500"><span>Discount</span><span>-{sym}{discount.toFixed(2)}</span></div>}
                  {shippingCost > 0 && <div className="flex justify-between text-sm"><span>Shipping</span><span>{sym}{shippingCost.toFixed(2)}</span></div>}
                  <div className="flex justify-between font-bold text-base sm:text-lg pt-2 border-t border-border">
                    <span>Total</span>
                    <span>{sym}{total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-3 sm:p-4 border-t border-border">
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

      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border bg-background/95 backdrop-blur-md shadow-[0_-4px_20px_-4px_hsl(var(--foreground)/0.1)]"
          >
            <div className="flex items-center gap-3 px-3 py-3 safe-area-pb">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                <p className="text-lg font-bold leading-tight truncate">{sym}{total.toFixed(2)}</p>
              </div>
              <Button variant="gradient" size="lg" onClick={placeOrder} disabled={submitting} className="shrink-0">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {submitting ? "Placing..." : "Place Order"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
