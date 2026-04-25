import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowUp, ArrowDown, Globe, Package, Send, Loader2 } from "lucide-react";

interface PlanRow {
  id: string;
  product_id: string | null;
  category: string;
  template_id: string;
  step_order: number;
  delay_minutes: number;
  enabled: boolean;
}

interface Template {
  id: string;
  name: string;
  category: string;
  is_global: boolean;
  product_id: string | null;
}

interface Product {
  id: string;
  name: string;
}

const CATEGORIES = [
  { value: "order_confirmation", label: "Order Confirmation" },
  { value: "payment_verified", label: "Payment Verified" },
  { value: "payment_reminder", label: "Payment Reminder" },
  { value: "post_purchase", label: "Post-Purchase / Delivery" },
  { value: "account_created", label: "Account Created" },
  { value: "shipping_update", label: "Shipping Update" },
];

export function EmailSendPlanEditor() {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<"global" | "product">("global");
  const [productId, setProductId] = useState<string>("");
  const [testEmail, setTestEmail] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ["plan-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_email_templates")
        .select("id, name, category, is_global, product_id")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as Template[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["plan-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const filterProductId = scope === "global" ? null : productId || null;

  const { data: planRows = [], isLoading } = useQuery({
    queryKey: ["email-send-plan", filterProductId],
    queryFn: async () => {
      let q = supabase
        .from("email_send_plan")
        .select("*")
        .order("step_order");
      if (filterProductId === null) q = q.is("product_id", null);
      else q = q.eq("product_id", filterProductId);
      const { data, error } = await q;
      if (error) throw error;
      return data as PlanRow[];
    },
    enabled: scope === "global" || !!productId,
  });

  const addRow = useMutation({
    mutationFn: async () => {
      const firstTemplate = templates[0];
      if (!firstTemplate) throw new Error("Create a template first");
      const nextOrder = planRows.length;
      const { error } = await supabase.from("email_send_plan").insert({
        product_id: filterProductId,
        category: firstTemplate.category || "post_purchase",
        template_id: firstTemplate.id,
        step_order: nextOrder,
        delay_minutes: 0,
        enabled: true,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-send-plan", filterProductId] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateRow = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PlanRow> }) => {
      const { error } = await supabase.from("email_send_plan").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-send-plan", filterProductId] }),
  });

  const deleteRow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_send_plan").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-send-plan", filterProductId] }),
  });

  const move = async (id: string, direction: -1 | 1) => {
    const idx = planRows.findIndex((r) => r.id === id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= planRows.length) return;
    const a = planRows[idx];
    const b = planRows[swapIdx];
    await Promise.all([
      supabase.from("email_send_plan").update({ step_order: b.step_order }).eq("id", a.id),
      supabase.from("email_send_plan").update({ step_order: a.step_order }).eq("id", b.id),
    ]);
    queryClient.invalidateQueries({ queryKey: ["email-send-plan", filterProductId] });
  };

  const handleTest = async (templateId: string) => {
    if (!testEmail.trim()) {
      toast({ title: "Enter a test recipient email first", variant: "destructive" });
      return;
    }
    setTestingId(templateId);
    try {
      const { data, error } = await supabase.functions.invoke("send-order-confirmation", {
        body: {
          test_send: true,
          override_recipient: testEmail.trim(),
          template_id: templateId,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Test email sent", description: `to ${testEmail}` });
    } catch (e: any) {
      toast({ title: "Test send failed", description: e.message, variant: "destructive" });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setScope("global")}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              scope === "global" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="h-3 w-3" /> Global default plan
          </button>
          <button
            type="button"
            onClick={() => setScope("product")}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              scope === "product" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="h-3 w-3" /> Per-product plan
          </button>
        </div>

        {scope === "product" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Product</Label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">— Select a product —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {!productId && (
              <p className="text-xs text-muted-foreground">Pick a product to view or build its plan. If a product has no plan, the global default is used.</p>
            )}
          </div>
        )}

        <div className="border-t border-border pt-4 grid gap-2 sm:grid-cols-[1fr_auto] items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">Test recipient</Label>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-9 text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground">Use the <Send className="h-3 w-3 inline" /> icon on any row below to send that template to this address using a recent order's data.</p>
        </div>
      </div>

      {(scope === "global" || productId) && (
        <div className="rounded-xl border border-border">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold">
                {scope === "global" ? "Global default sequence" : `Plan for ${products.find((p) => p.id === productId)?.name || ""}`}
              </h3>
              <p className="text-xs text-muted-foreground">Emails fire top-to-bottom. 0 minutes = send immediately.</p>
            </div>
            <Button size="sm" onClick={() => addRow.mutate()} disabled={addRow.isPending} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add step
            </Button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : planRows.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">No steps yet.</p>
              <Button size="sm" variant="outline" onClick={() => addRow.mutate()}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add first step
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {planRows.map((row, idx) => {
                const tpl = templates.find((t) => t.id === row.template_id);
                return (
                  <div key={row.id} className="p-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6 text-center">{idx + 1}</span>
                    <div className="flex flex-col gap-0.5">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(row.id, -1)} disabled={idx === 0}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(row.id, 1)} disabled={idx === planRows.length - 1}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>

                    <select
                      value={row.template_id}
                      onChange={(e) => {
                        const t = templates.find((t) => t.id === e.target.value);
                        updateRow.mutate({ id: row.id, patch: { template_id: e.target.value, category: t?.category || row.category } });
                      }}
                      className="h-9 flex-1 min-w-[180px] rounded-lg border border-border bg-background px-2 text-sm"
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({CATEGORIES.find((c) => c.value === t.category)?.label || t.category})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        value={row.delay_minutes}
                        onChange={(e) => updateRow.mutate({ id: row.id, patch: { delay_minutes: parseInt(e.target.value || "0") } })}
                        className="h-9 w-20 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">min delay</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={row.enabled}
                        onCheckedChange={(v) => updateRow.mutate({ id: row.id, patch: { enabled: v } })}
                      />
                      <span className="text-xs text-muted-foreground">{row.enabled ? "On" : "Off"}</span>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleTest(row.template_id)}
                      disabled={testingId === row.template_id}
                      title="Test send this template"
                    >
                      {testingId === row.template_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => {
                        if (confirm("Remove this step?")) deleteRow.mutate(row.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
