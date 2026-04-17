import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Copy, CheckCircle2, Clock, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CustomerDeliveriesProps {
  orderId: string;
}

interface Delivery {
  id: string;
  delivery_type: string;
  payload: any;
  status: string;
  delivered_at: string | null;
}

function CodeReveal({ label, value }: { label: string; value: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground w-20 shrink-0">{label}:</span>
      <code className="font-mono bg-muted/50 rounded px-2 py-1 flex-1 break-all">
        {show ? value : "•".repeat(Math.min(value.length, 16))}
      </code>
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="text-muted-foreground hover:text-foreground"
        aria-label={show ? "Hide" : "Show"}
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast({ title: "Copied to clipboard" });
        }}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Copy"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function CustomerDeliveries({ orderId }: CustomerDeliveriesProps) {
  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["customer-deliveries", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_deliveries")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at");
      if (error) throw error;
      return data as Delivery[];
    },
  });

  if (isLoading || deliveries.length === 0) return null;

  return (
    <div className="rounded-lg border border-border p-3 mt-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your delivery</p>
      {deliveries.map((d) => {
        const productName = d.payload?.product_name || "Item";
        return (
          <div key={d.id} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{productName}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                  d.status === "delivered"
                    ? "bg-success/10 text-success"
                    : d.status === "failed"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500"
                }`}
              >
                {d.status === "delivered" ? <CheckCircle2 className="h-3 w-3" /> :
                 d.status === "failed" ? <AlertTriangle className="h-3 w-3" /> :
                 <Clock className="h-3 w-3" />}
                {d.status === "pending" ? "Awaiting fulfillment" : d.status}
              </span>
            </div>
            {d.status === "delivered" && d.payload?.code && (
              <div className="rounded bg-muted/30 p-2 space-y-1.5">
                <CodeReveal
                  label={d.delivery_type === "account" ? "Username" : "Code"}
                  value={d.payload.code}
                />
                {d.payload.credential_extra && (
                  <CodeReveal label="Password" value={d.payload.credential_extra} />
                )}
              </div>
            )}
            {d.status === "pending" && (
              <p className="text-xs text-muted-foreground">
                We're processing your order — you'll receive an email as soon as it's ready.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
