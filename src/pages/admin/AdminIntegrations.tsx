import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Save, Eye, EyeOff, Webhook, CreditCard, Send } from "lucide-react";

interface SettingsMap {
  [key: string]: string;
}

const BKASH_FIELDS = [
  {
    key: "bkash_sandbox", label: "Environment", type: "select", options: [
      { value: "true", label: "Sandbox (Testing)" },
      { value: "false", label: "Production (Live)" },
    ]
  },
];


export default function AdminIntegrations() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [dirty, setDirty] = useState(false);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  const { data: rows, isLoading } = useQuery({
    queryKey: ["site-settings-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("key, value");
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (rows && Array.isArray(rows)) {
      const map: SettingsMap = {};
      rows.forEach((r) => (map[r.key] = r.value));
      setSettings(map);
    }
  }, [rows]);

  const saveMutation = useMutation({
    mutationFn: async (entries: SettingsMap) => {
      for (const [key, value] of Object.entries(entries)) {
        // Skip saving sensitive placeholder values
        if (value === "••••••••") continue;
        const { error } = await supabase
          .from("site_settings")
          .upsert({ key, value }, { onConflict: "key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings-admin"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      setDirty(false);
      toast({ title: "Settings saved" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

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
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "test",
          order_id: "test-123",
          order_number: "ORD-TEST-001",
          status: "pending",
          payment_status: "unpaid",
          timestamp: new Date().toISOString(),
          ...(settings["webhook_secret"] ? { secret: settings["webhook_secret"] } : {}),
        }),
      });
      toast({ title: res.ok ? "Webhook test sent successfully" : `Webhook responded with ${res.status}` });
    } catch (err: any) {
      toast({ title: "Webhook test failed", description: err.message, variant: "destructive" });
    }
  };

  const renderField = (field: any) => {
    const value = settings[field.key] || "";

    if (field.type === "select") {
      return (
        <select
          value={value || field.options[0].value}
          onChange={(e) => update(field.key, e.target.value)}
          className="h-9 w-full rounded-[4px] border border-border bg-background px-3 text-sm"
        >
          {field.options.map((opt: any) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    return (
      <div className="relative">
        <input
          type={field.sensitive && !visibleFields[field.key] ? "password" : "text"}
          value={value}
          onChange={(e) => update(field.key, e.target.value)}
          placeholder={field.placeholder}
          className="h-9 w-full rounded-[4px] border border-border bg-background px-3 pr-10 text-sm"
        />
        {field.sensitive && (
          <button
            type="button"
            onClick={() => toggleVisibility(field.key)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {visibleFields[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold">Integrations</h2>
            <p className="text-sm text-muted-foreground">Manage payment gateways, courier services, and webhooks</p>
          </div>
          <Button
            onClick={() => saveMutation.mutate(settings)}
            disabled={!dirty || saveMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save All"}
          </Button>
        </div>

        {/* bKash Payment Gateway */}
        <section className="rounded-[4px] border border-border">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-pink-500/10">
              <CreditCard className="h-4 w-4 text-pink-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">bKash Payment Gateway</h3>
              <p className="text-xs text-muted-foreground">Tokenized Checkout integration for accepting bKash payments</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {BKASH_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {field.label}
                </label>
                {renderField(field)}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Note: bKash credentials (App Key, App Secret, Username, Password) are stored as backend secrets for security.
              Values shown here are for reference — actual secrets are configured in the backend.
            </p>
          </div>
        </section>




        {/* Outbound Webhook */}
        <section className="rounded-[4px] border border-border">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-accent/50">
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
                className="h-9 w-full rounded-[4px] border border-border bg-background px-3 text-sm"
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
                  className="h-9 w-full rounded-[4px] border border-border bg-background px-3 pr-10 text-sm"
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
              <pre className="text-xs bg-muted rounded-[4px] p-3 overflow-auto font-mono whitespace-pre-wrap">
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
    </AdminLayout>
  );
}
