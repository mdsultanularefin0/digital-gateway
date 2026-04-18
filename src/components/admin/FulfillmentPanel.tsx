import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, AlertTriangle, Loader2, Mail, Send } from "lucide-react";
import { format } from "date-fns";

interface FulfillmentPanelProps {
  orderId: string;
  paymentStatus: string;
}

interface Delivery {
  id: string;
  order_item_id: string | null;
  product_id: string | null;
  delivery_type: string;
  payload: any;
  status: string;
  admin_note: string;
  delivered_at: string | null;
  created_at: string;
}

export default function FulfillmentPanel({ orderId, paymentStatus }: FulfillmentPanelProps) {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { code: string; extra: string; note: string }>>({});

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["order-deliveries", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_deliveries")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Delivery[];
    },
  });

  const fulfillMutation = useMutation({
    mutationFn: async ({ id, code, extra, note }: { id: string; code: string; extra: string; note: string }) => {
      const delivery = deliveries.find((d) => d.id === id);
      if (!delivery) throw new Error("Delivery not found");
      const newPayload = {
        ...delivery.payload,
        ...(code && { code }),
        ...(extra && { credential_extra: extra }),
      };
      const { error } = await supabase
        .from("order_deliveries")
        .update({
          payload: newPayload,
          status: "delivered",
          admin_note: note,
          delivered_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order-deliveries", orderId] });
      toast({ title: "Marked as delivered" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const resendEmailMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("send-order-confirmation", {
        body: { order_id: orderId, type: "payment_verified" },
      });
      if (error) throw error;
    },
    onSuccess: () => toast({ title: "Delivery email sent" }),
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const updateDraft = (id: string, field: "code" | "extra" | "note", value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { code: "", extra: "", note: "", ...prev[id], [field]: value },
    }));
  };

  if (paymentStatus !== "paid") {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        <Clock className="h-4 w-4 inline mr-1" />
        Order is not paid yet — fulfillment will activate automatically when payment is verified.
      </div>
    );
  }

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading fulfillment…</div>;

  if (deliveries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        No deliveries created yet for this paid order.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Fulfillment</h3>
        <Button size="sm" variant="outline" onClick={() => resendEmailMutation.mutate()} disabled={resendEmailMutation.isPending}>
          {resendEmailMutation.isPending ? (
            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Sending…</>
          ) : (
            <><Mail className="h-3 w-3 mr-1" /> Resend email</>
          )}
        </Button>
      </div>
      <div className="divide-y divide-border">
        {deliveries.map((d) => {
          const draft = drafts[d.id] || { code: "", extra: "", note: "" };
          const productName = d.payload?.product_name || "Item";
          return (
            <div key={d.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium text-sm">{productName}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {d.delivery_type} delivery
                    {d.delivered_at && ` • Delivered ${format(new Date(d.delivered_at), "PP p")}`}
                  </p>
                </div>
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
                  {d.status}
                </span>
              </div>

              {d.status === "delivered" && d.payload?.code && (
                <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1 font-mono">
                  <div><span className="text-muted-foreground">Code:</span> {d.payload.code}</div>
                  {d.payload.credential_extra && (
                    <div><span className="text-muted-foreground">Password:</span> {d.payload.credential_extra}</div>
                  )}
                </div>
              )}

              {d.status === "pending" && (
                <div className="space-y-2">
                  {d.payload?.reason === "pool_empty" && (
                    <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 px-3 py-2 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Pool was empty when this order arrived. Paste a code below to fulfill manually.
                    </div>
                  )}
                  {(d.delivery_type === "code" || d.delivery_type === "account") && (
                    <>
                      <input
                        value={draft.code}
                        onChange={(e) => updateDraft(d.id, "code", e.target.value)}
                        placeholder={d.delivery_type === "account" ? "Email / username" : "License key / code"}
                        className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm font-mono"
                      />
                      {d.delivery_type === "account" && (
                        <input
                          value={draft.extra}
                          onChange={(e) => updateDraft(d.id, "extra", e.target.value)}
                          placeholder="Password"
                          className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm font-mono"
                        />
                      )}
                    </>
                  )}
                  <input
                    value={draft.note}
                    onChange={(e) => updateDraft(d.id, "note", e.target.value)}
                    placeholder={d.delivery_type === "service" ? "Fulfillment note (e.g. top-up confirmation ID)" : "Internal note (optional)"}
                    className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => fulfillMutation.mutate({ id: d.id, code: draft.code, extra: draft.extra, note: draft.note })}
                    disabled={
                      fulfillMutation.isPending ||
                      ((d.delivery_type === "code" || d.delivery_type === "account") && !draft.code.trim())
                    }
                  >
                    <Send className="h-3 w-3 mr-1" /> Mark delivered
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
