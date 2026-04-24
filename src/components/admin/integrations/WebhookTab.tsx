import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Webhook, Send, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WebhookTabProps {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
}

export function WebhookTab({ settings, update }: WebhookTabProps) {
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  const toggleVisibility = (key: string) => {
    setVisibleFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const testWebhook = async () => {
    const url = settings["webhook_url"];
    if (!url) {
      toast({ title: "No webhook URL configured", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("order-webhook", {
        body: { event: "test" },
      });
      
      if (error) throw error;
      
      toast({ 
        title: data.success ? "Webhook test sent successfully" : "Webhook test failed",
        description: data.webhook_response 
          ? `Server said: ${data.webhook_response}`
          : (data.webhook_status ? `External server responded with ${data.webhook_status}` : data.reason)
      });
    } catch (err: any) {
      toast({ title: "Webhook test failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/50">
            <Webhook className="h-4 w-4 text-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Order Webhook</h3>
            <p className="text-xs text-muted-foreground">Automatically send order updates to an external URL when orders change</p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Webhook URL
            </label>
            <input
              type="url"
              value={settings["webhook_url"] || ""}
              onChange={(e) => update("webhook_url", e.target.value)}
              placeholder="https://your-service.com/api/webhook"
              className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Order data will be POSTed to this URL whenever an order is created or updated.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Webhook Secret (optional)
            </label>
            <div className="relative">
              <input
                type={visibleFields["webhook_secret"] ? "text" : "password"}
                value={settings["webhook_secret"] || ""}
                onChange={(e) => update("webhook_secret", e.target.value)}
                placeholder="Shared secret included in payload for verification"
                className="h-9 w-full rounded-xl border border-border bg-background px-3 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => toggleVisibility("webhook_secret")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {visibleFields["webhook_secret"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Events to Send
            </label>
            <div className="space-y-2">
              {[
                { key: "webhook_on_create", label: "New order created" },
                { key: "webhook_on_status", label: "Order status changed" },
                { key: "webhook_on_payment", label: "Payment status changed" },
              ].map((evt) => (
                <label key={evt.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings[evt.key] !== "false"}
                    onChange={(e) => update(evt.key, e.target.checked ? "true" : "false")}
                    className="rounded border-border"
                  />
                  {evt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={testWebhook} className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> Send Test
            </Button>
            <span className="text-xs text-muted-foreground">Sends a test payload to verify your endpoint</span>
          </div>

          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Payload Format</h4>
            <pre className="text-xs bg-muted rounded-xl p-3 overflow-auto font-mono whitespace-pre-wrap">
              {`{
  "event": "order.updated",
  "order_id": "uuid",
  "order_number": "ORD-20260308-abc123",
  "status": "shipped",
  "payment_status": "paid",
  "customer_name": "John Doe",
  "customer_phone": "+880...",
  "total": 1500.00,
  "items": [...],
  "timestamp": "2026-03-08T12:00:00Z",
  "secret": "your-webhook-secret"
}`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
