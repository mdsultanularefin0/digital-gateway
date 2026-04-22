import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Eye, RefreshCw } from "lucide-react";

interface EmailTemplatePreviewProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subject: string;
  bodyHtml: string;
  category: string;
}

const SAMPLE_VARS: Record<string, string> = {
  customer_name: "Jamil Ahmed",
  customer_email: "jamil@example.com",
  order_number: "ORD-20260422-AB12CD34",
  order_total: "৳1,250.00",
  payment_method: "bKash",
  transaction_id: "BKS9X2K7QM",
  product_name: "Gopal Bhar YouTube Secret Course",
  product_links: "Course PDF: https://example.com/download/abc\nBonus Video: https://example.com/download/xyz\n",
  order_link: "https://example.com/orders/sample",
  password: "Tmp9aQ4eLx",
  login_url: "https://example.com/login",
  product_content: `
    <div style="margin-top:20px;padding:16px;background:#f0fdf4;border-radius:8px;border:1px solid #d1fae5;">
      <h4 style="margin:0 0 10px;font-size:14px;color:#166534;">🎁 Your delivery:</h4>
      <ul style="margin:0;padding:0 0 0 20px;font-size:14px;color:#166534;line-height:1.7;">
        <li style="margin-bottom:6px;"><strong>Course PDF</strong> — <a href="#" style="color:#2563eb;text-decoration:underline;">Download</a></li>
        <li style="margin-bottom:6px;"><strong>Bonus Video</strong> — <a href="#" style="color:#2563eb;text-decoration:underline;">Download</a></li>
        <li><strong>Premium Account</strong> — Username: <code>user_demo</code> · Password: <code>Pass1234!</code></li>
      </ul>
    </div>`,
};

function replaceVars(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  payment_status: string;
  created_at: string;
}

export function EmailTemplatePreview({ open, onOpenChange, subject, bodyHtml, category }: EmailTemplatePreviewProps) {
  const [useReal, setUseReal] = useState(false);
  const [orderId, setOrderId] = useState<string>("");

  const { data: recentOrders = [] } = useQuery({
    queryKey: ["preview-recent-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_email, payment_status, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as RecentOrder[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (useReal && !orderId && recentOrders.length > 0) {
      setOrderId(recentOrders[0].id);
    }
  }, [useReal, recentOrders, orderId]);

  const { data: realVars, isFetching: realLoading, refetch } = useQuery({
    queryKey: ["preview-real-vars", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      // Fetch order
      const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
      if (!order) return null;
      const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);
      const { data: deliveries } = await supabase.from("order_deliveries").select("*").eq("order_id", orderId);
      const productIds = (items || []).map((i: any) => i.product_id).filter(Boolean);
      const [{ data: files }, { data: tokens }, { data: currencySetting }] = await Promise.all([
        productIds.length
          ? supabase.from("product_files").select("*").in("product_id", productIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("download_tokens").select("*").eq("order_id", orderId),
        supabase.from("site_settings").select("value").eq("key", "currency_symbol").maybeSingle(),
      ]);
      const currencySymbol = (currencySetting?.value as string) || "৳";

      const tokenByFileId: Record<string, string> = {};
      for (const t of tokens || []) {
        if (t.product_file_id && t.token) tokenByFileId[t.product_file_id] = t.token;
      }

      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
      let fileLinksHtml = "";
      let fileLinksPlain = "";
      for (const f of files || []) {
        const isExt =
          f.file_type === "link" ||
          (typeof f.file_url === "string" &&
            f.file_url.startsWith("http") &&
            !["ebook", "video", "pdf", "zip"].includes(f.file_type));
        const tok = tokenByFileId[f.id];
        const url = isExt
          ? f.file_url
          : tok
            ? `${supabaseUrl}/functions/v1/secure-download?token=${tok}`
            : `${supabaseUrl}/functions/v1/secure-download?file=${f.id}`;
        const label = f.filename || (isExt ? "Open link" : "Download file");
        fileLinksPlain += `${label}: ${url}\n`;
        fileLinksHtml += `<li style="margin-bottom:6px;"><strong>${label}</strong> — <a href="${url}" style="color:#2563eb;text-decoration:underline;">${isExt ? "Open Link" : "Download"}</a></li>`;
      }

      let deliveriesHtml = "";
      for (const d of deliveries || []) {
        const payload = (d.payload || {}) as Record<string, any>;
        const pname = payload.product_name || "Item";
        if (d.status !== "delivered") {
          deliveriesHtml += `<li><strong>${pname}</strong>: <em>Awaiting fulfillment — you'll receive an update shortly.</em></li>`;
          continue;
        }
        if (d.delivery_type === "code" && payload.code) {
          deliveriesHtml += `<li><strong>${pname}</strong> — Code: <code>${payload.code}</code>${payload.credential_extra ? ` · Extra: <code>${payload.credential_extra}</code>` : ""}</li>`;
        } else if (d.delivery_type === "account" && payload.code) {
          deliveriesHtml += `<li><strong>${pname}</strong> — Username: <code>${payload.code}</code>${payload.credential_extra ? ` · Password: <code>${payload.credential_extra}</code>` : ""}</li>`;
        } else if (payload.url || payload.link) {
          const url = payload.url || payload.link;
          deliveriesHtml += `<li><strong>${pname}</strong>: <a href="${url}">${url}</a></li>`;
        }
      }

      const productContentHtml =
        fileLinksHtml || deliveriesHtml
          ? `<div style="margin-top:20px;padding:16px;background:#f0fdf4;border-radius:8px;border:1px solid #d1fae5;"><h4 style="margin:0 0 10px;font-size:14px;color:#166534;">🎁 Your delivery:</h4><ul style="margin:0;padding:0 0 0 20px;font-size:14px;color:#166534;line-height:1.7;">${fileLinksHtml}${deliveriesHtml}</ul></div>`
          : "";

      const vars: Record<string, string> = {
        customer_name: order.customer_name || "",
        customer_email: order.customer_email || "",
        order_number: order.order_number || "",
        order_total: `${currencySymbol}${Number(order.total).toFixed(2)}`,
        payment_method: order.payment_method || "",
        transaction_id:
          order.notes?.match?.(/trxID:(\S+)/)?.[1] ||
          (order.bkash_response as any)?.trxID ||
          "",
        product_name: (items || []).map((i: any) => i.product_name).join(", "),
        product_content: productContentHtml,
        product_links: fileLinksPlain,
        order_link: `${window.location.origin}/orders/${order.id}`,
        password: "[hidden — only sent on creation]",
        login_url: `${window.location.origin}/login`,
      };
      return vars;
    },
    enabled: open && useReal && !!orderId,
  });

  const activeVars = useMemo(() => {
    if (useReal && realVars) return realVars;
    return SAMPLE_VARS;
  }, [useReal, realVars]);

  const renderedSubject = replaceVars(subject || "(no subject)", activeVars);
  const renderedBody = replaceVars(bodyHtml || "<p style='color:#999'>(empty body)</p>", activeVars);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" /> Email Preview
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Switch checked={useReal} onCheckedChange={setUseReal} id="real-toggle" />
            <Label htmlFor="real-toggle" className="text-sm">
              Use real order data
            </Label>
          </div>
          {useReal && (
            <div className="flex items-end gap-2 flex-1 min-w-[240px]">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Recent orders</Label>
                <select
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  {recentOrders.length === 0 && <option value="">No orders found</option>}
                  {recentOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} — {o.customer_name || o.customer_email} ({o.payment_status})
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={!orderId} className="gap-1">
                <RefreshCw className={`h-3.5 w-3.5 ${realLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Category: <span className="font-medium text-foreground">{category}</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          <div className="rounded-xl border border-border bg-muted/30 p-4 mb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Subject</p>
            <p className="text-sm font-semibold">{renderedSubject}</p>
          </div>

          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <div className="border-b border-border px-4 py-2 bg-muted/30 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">From: noreply@yoursite.com → {activeVars.customer_email}</p>
              {useReal && realLoading && <span className="text-xs text-muted-foreground">Loading…</span>}
            </div>
            <div
              className="p-6 text-sm text-foreground"
              style={{ background: "#ffffff", color: "#111" }}
              // Sandbox-style render: this is admin-only preview
              dangerouslySetInnerHTML={{ __html: renderedBody }}
            />
          </div>

          {useReal && !realVars && orderId && !realLoading && (
            <p className="text-xs text-destructive mt-3">Couldn't load that order.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
