import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Undo2, Loader2, Mail } from "lucide-react";
import { format } from "date-fns";
import FulfillmentPanel from "./FulfillmentPanel";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const EMAIL_TYPES = [
  { value: "order_confirmation", label: "Order Confirmation" },
  { value: "payment_verified", label: "Payment Verified" },
  { value: "post_purchase", label: "Post-Purchase Delivery" },
  { value: "shipping_update", label: "Shipping Update" },
  { value: "account_created", label: "Account Created" },
];

interface OrderDetailProps {
  order: any;
  currencySymbol: string;
  onBack: () => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onUpdatePayment: (id: string, payment_status: string) => void;
}

export default function OrderDetail({ order: o, currencySymbol, onBack, onDelete, onUpdateStatus, onUpdatePayment }: OrderDetailProps) {
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmt, setRefundAmt] = useState<string>(String(o.total));
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [emailType, setEmailType] = useState<string>("order_confirmation");
  const [sendingEmail, setSendingEmail] = useState(false);

  const isBkash = o.payment_method === "bkash" && o.payment_status === "paid";

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-order-confirmation", {
        body: { order_id: o.id, type: emailType },
      });
      if (error) throw error;
      if ((data as any)?.success === false) {
        toast({ title: "Email not sent", description: (data as any)?.reason || "Unknown reason", variant: "destructive" });
      } else {
        toast({ title: "Email sent", description: `${EMAIL_TYPES.find(t => t.value === emailType)?.label} → ${o.customer_email}` });
      }
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message || String(e), variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleRefund = async () => {
    setRefunding(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/bkash-payment?action=refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        body: JSON.stringify({ orderId: o.id, amount: Number(refundAmt), reason: refundReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({ title: "Refund failed", description: JSON.stringify(data.error || data), variant: "destructive" });
      } else {
        toast({ title: "Refund processed", description: `bKash refundTrxID: ${data.refund?.refundTrxID || "—"}` });
        setRefundOpen(false);
        // trigger parent re-fetch by re-marking payment status
        if (Math.abs(Number(refundAmt) - Number(o.total)) < 0.01) onUpdatePayment(o.id, "refunded");
      }
    } catch (e: any) {
      toast({ title: "Refund error", description: e.message, variant: "destructive" });
    } finally {
      setRefunding(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back to Orders</Button>
      </div>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold">{o.order_number}</h2>
            <p className="text-sm text-muted-foreground">{format(new Date(o.created_at), "PPP p")}</p>
          </div>
          <div className="flex gap-2">
            {isBkash && (
              <Button variant="outline" size="sm" onClick={() => setRefundOpen((v) => !v)}>
                <Undo2 className="h-4 w-4 mr-1" /> Refund
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={() => { if (confirm("Delete this order?")) onDelete(o.id); }}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        </div>

        {refundOpen && isBkash && (
          <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/30">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">bKash Refund</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Amount ({currencySymbol})</label>
                <input
                  type="number" step="0.01" min="0" max={o.total}
                  value={refundAmt}
                  onChange={(e) => setRefundAmt(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">Order total: {currencySymbol}{Number(o.total).toFixed(2)} — partial refunds supported.</p>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Reason</label>
                <input
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer request"
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleRefund} disabled={refunding || !refundAmt || Number(refundAmt) <= 0}>
                {refunding && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Process Refund
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRefundOpen(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Customer</h3>
            <p className="font-medium">{o.customer_name}</p>
            <p className="text-sm text-muted-foreground">{o.customer_email}</p>
            <p className="text-sm text-muted-foreground">{o.customer_phone}</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Shipping</h3>
            <p className="text-sm">{o.shipping_address}</p>
            <p className="text-sm">{[o.shipping_city, o.shipping_state, o.shipping_zip].filter(Boolean).join(", ")}</p>
            <p className="text-sm">{o.shipping_country}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold mb-2 uppercase tracking-wider text-muted-foreground">Order Status</h3>
            <select
              value={o.status}
              onChange={(e) => onUpdateStatus(o.id, e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              {["pending", "confirmed", "processing", "completed", "cancelled", "refunded"].map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold mb-2 uppercase tracking-wider text-muted-foreground">Payment Status</h3>
            <select
              value={o.payment_status}
              onChange={(e) => onUpdatePayment(o.id, e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              {["unpaid", "paid", "refunded"].map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-border">
          <h3 className="text-sm font-semibold p-4 border-b border-border uppercase tracking-wider text-muted-foreground">Items</h3>
          <div className="divide-y divide-border">
            {(o.order_items || []).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-sm">{item.product_name}</p>
                  {item.tier_label && <p className="text-xs text-muted-foreground">{item.tier_label}</p>}
                </div>
                <div className="text-right text-sm">
                  <p>{item.quantity} × {currencySymbol}{Number(item.unit_price).toFixed(2)}</p>
                  <p className="font-medium">{currencySymbol}{Number(item.total).toFixed(2)}</p>
                </div>
              </div>
            ))}
            {(o.order_items || []).length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No items</div>
            )}
          </div>
          <div className="border-t border-border p-4 space-y-1">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>{currencySymbol}{Number(o.subtotal).toFixed(2)}</span></div>
            {Number(o.discount) > 0 && <div className="flex justify-between text-sm text-green-500"><span>Discount</span><span>-{currencySymbol}{Number(o.discount).toFixed(2)}</span></div>}
            {Number(o.shipping_cost) > 0 && <div className="flex justify-between text-sm"><span>Shipping</span><span>{currencySymbol}{Number(o.shipping_cost).toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold pt-1 border-t border-border"><span>Total</span><span>{currencySymbol}{Number(o.total).toFixed(2)}</span></div>
          </div>
        </div>

        <FulfillmentPanel orderId={o.id} paymentStatus={o.payment_status} />

        {o.notes && (
          <div className="rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold mb-2 uppercase tracking-wider text-muted-foreground">Notes</h3>
            <p className="text-sm">{o.notes}</p>
          </div>
        )}

        {o.bkash_response && (
          <div className="rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold mb-2 uppercase tracking-wider text-muted-foreground">bKash Payment Details</h3>
            <pre className="text-xs bg-muted rounded-xl p-3 overflow-auto max-h-64 whitespace-pre-wrap">
              {JSON.stringify(o.bkash_response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}
