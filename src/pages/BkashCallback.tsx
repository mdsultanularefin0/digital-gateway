import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function BkashCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [trxID, setTrxID] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
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
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/bkash-payment?action=execute`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentID, orderId }),
          }
        );

        const data = await res.json();
        if (import.meta.env.DEV) console.log("bKash execute result:", data);
        if (data.success) {
          setTrxID(data.trxID);
          setStatus("success");
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
  }, []);

  return (
    <Layout>
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
                <p className="text-sm font-mono bg-muted rounded-[4px] inline-block px-4 py-2 mb-2">{orderNumber}</p>
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
