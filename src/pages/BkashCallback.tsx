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
        <div className="container max-w-lg text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-16 w-16 text-primary mx-auto mb-6 animate-spin" />
              <h1 className="text-2xl font-display font-bold mb-3">Verifying Payment...</h1>
              <p className="text-muted-foreground">Please wait while we confirm your bKash payment.</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
              <h1 className="text-3xl font-display font-bold mb-3">Payment Successful!</h1>
              <p className="text-muted-foreground mb-2">Your bKash payment has been confirmed.</p>
              {orderNumber && (
                <p className="text-sm font-mono bg-muted rounded-xl inline-block px-4 py-2 mb-2">{orderNumber}</p>
              )}
              {trxID && (
                <p className="text-xs text-muted-foreground mb-8">Transaction ID: {trxID}</p>
              )}
              <Button variant="gradient" asChild>
                <Link to="/products">Continue Shopping</Link>
              </Button>
            </>
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
