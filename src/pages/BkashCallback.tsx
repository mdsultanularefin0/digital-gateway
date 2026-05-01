import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { callEdge } from "@/lib/edge";
import { supabase } from "@/integrations/supabase/client";
import { trackPurchase } from "@/lib/meta-pixel";
import { DownloadLinks } from "@/components/DownloadLinks";
import { OrderSuccessInstructions } from "@/components/OrderSuccessInstructions";

export default function BkashCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [trxID, setTrxID] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const paymentID = searchParams.get("paymentID");
    const bkashStatus = searchParams.get("status");
    const orderId = localStorage.getItem("bkash_order_id");
    const storedOrderNumber = localStorage.getItem("bkash_order_number");

    if (storedOrderNumber) setOrderNumber(storedOrderNumber);

    if (bkashStatus !== "success" || !paymentID || !orderId) {
      setStatus("failed");
      setErrorMsg(bkashStatus === "cancel" ? "Payment was cancelled." : "Payment failed or was incomplete.");
      return;
    }

    // Execute the payment
    (async () => {
      try {
        const data = await callEdge<{ success?: boolean; trxID?: string; message?: string; error?: string }>(
          "bkash-payment",
          { paymentID, orderId },
          { query: "action=execute" }
        );
        if (import.meta.env.DEV) console.log("bKash execute result:", data);
        if (data.success) {
          setTrxID(data.trxID);
          setPlacedOrderId(orderId);
          setStatus("success");
          
          // Fetch order details for conversion tracking
          const { data: order } = await supabase
            .from("orders")
            .select("*, order_items(*)")
            .eq("id", orderId)
            .single();
            
          if (order) {
            trackPurchase({
              content_ids: (order.order_items || []).map((i: any) => i.product_id),
              content_type: "product",
              num_items: (order.order_items || []).reduce((s: number, i: any) => s + i.quantity, 0),
              value: order.total,
              currency: "BDT", // bKash is always BDT
            }, {
              email: order.customer_email,
              phone: order.customer_phone,
              name: order.customer_name,
              externalId: order.order_number,
            });
          }

          // Clear stored bKash data and cart
          localStorage.removeItem("bkash_order_id");
          localStorage.removeItem("bkash_order_number");
          localStorage.removeItem("digistack-cart");
        } else {
          setStatus("failed");
          setErrorMsg(data.message || data.error || "Payment execution failed.");
        }
      } catch (err: any) {
        setStatus("failed");
        setErrorMsg(err.message || "Network error");
      }
    })();
  }, [searchParams]);

  return (
    <Layout>
      <SEOHead title="Verifying Payment" description="Confirming your bKash payment." noIndex disableHreflang />
      <section className="py-20 md:py-32">
        <div className={`container ${status === "success" ? "max-w-2xl" : "max-w-lg"} text-center`}>
          {status === "loading" && (
            <>
              <Loader2 className="h-16 w-16 text-primary mx-auto mb-6 animate-spin" />
              <h1 className="text-2xl font-display font-bold mb-3">Verifying Payment...</h1>
              <p className="text-muted-foreground">Please wait while we confirm your bKash payment.</p>
            </>
          )}

          {status === "success" && (
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
                <h1 className="text-3xl font-display font-bold mb-2">Payment Successful!</h1>
                <p className="text-muted-foreground mb-5">Your bKash payment has been confirmed.</p>
                {orderNumber && (
                  <div className="rounded-xl bg-muted/50 border border-border p-4 mb-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Order Number</p>
                    <p className="text-lg font-mono font-bold text-primary">{orderNumber}</p>
                  </div>
                )}
                {trxID && (
                  <p className="text-xs text-muted-foreground mb-4">Transaction ID: <span className="font-mono">{trxID}</span></p>
                )}
                {placedOrderId && <DownloadLinks orderId={placedOrderId} />}
                <OrderSuccessInstructions orderId={placedOrderId || undefined} />
                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                  <Button variant="gradient" asChild><Link to="/products">Continue Shopping</Link></Button>
                  <Button variant="outline" asChild><Link to="/account">View My Orders</Link></Button>
                </div>
                <p className="text-xs text-muted-foreground mt-6">A confirmation email has been sent to your inbox.</p>
              </div>
            </motion.div>
          )}

          {status === "failed" && (
            <>
              <XCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
              <h1 className="text-2xl font-display font-bold mb-3">Payment Failed</h1>
              <p className="text-muted-foreground mb-6">{errorMsg}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="gradient" asChild>
                  <Link to="/checkout">Try Again</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/products">Browse Products</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}
