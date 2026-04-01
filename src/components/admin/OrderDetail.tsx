import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";

interface OrderDetailProps {
  order: any;
  currencySymbol: string;
  onBack: () => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onUpdatePayment: (id: string, payment_status: string) => void;
}

export default function OrderDetail({ order: o, currencySymbol, onBack, onDelete, onUpdateStatus, onUpdatePayment }: OrderDetailProps) {
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
          <Button variant="destructive" size="sm" onClick={() => { if (confirm("Delete this order?")) onDelete(o.id); }}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>

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
              {["pending", "processing", "shipped", "delivered", "cancelled"].map((s) => (
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
