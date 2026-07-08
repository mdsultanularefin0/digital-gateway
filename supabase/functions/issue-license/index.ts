import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * issue-license
 *
 * Body: { order_id: string }
 *
 * For each order item, POSTs plan details to the configured `product_webhook_url`
 * (Integrations → Product Webhook). The remote endpoint (n8n) is expected to
 * respond with `{ license_key, expires_at? }`. The result is stored in
 * `order_deliveries` (delivery_type = 'license').
 *
 * Idempotent: skips items that already have a delivered license row.
 */
Deno.serve(withLogging("issue-license", async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { order_id } = await req.json().catch(() => ({}));
    if (!order_id) return json({ error: "order_id is required" }, 400);

    const { data: settingsRows } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["product_webhook_url", "product_webhook_secret"]);
    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => (settings[r.key] = r.value));

    const webhookUrl = settings["product_webhook_url"];
    if (!webhookUrl) return json({ skipped: true, reason: "product_webhook_url not configured" });

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_email, payment_status, order_items(*)")
      .eq("id", order_id)
      .maybeSingle();
    if (orderErr || !order) return json({ error: "Order not found" }, 404);
    if (order.payment_status !== "paid") {
      return json({ skipped: true, reason: `payment_status=${order.payment_status}` });
    }

    const results: Array<Record<string, unknown>> = [];

    for (const item of (order.order_items || []) as any[]) {
      // Skip if a delivery already exists for this item
      const { data: existing } = await supabase
        .from("order_deliveries")
        .select("id, status")
        .eq("order_id", order.id)
        .eq("order_item_id", item.id)
        .maybeSingle();
      if (existing && existing.status === "delivered") {
        results.push({ order_item_id: item.id, skipped: "already delivered" });
        continue;
      }

      const payload = {
        event: "license.issue",
        order_number: order.order_number,
        customer_email: order.customer_email,
        customer_name: order.customer_name,
        product_name: item.product_name,
        plan_name: item.tier_label || item.product_name,
        quantity: item.quantity,
        amount: item.total,
        ...(settings["product_webhook_secret"] ? { secret: settings["product_webhook_secret"] } : {}),
      };

      let licenseKey: string | null = null;
      let expiresAt: string | null = null;
      let status = "pending";
      let errorMsg: string | null = null;
      let httpStatus = 0;
      let responseBody = "";

      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(settings["product_webhook_secret"]
              ? { "X-Webhook-Secret": settings["product_webhook_secret"] }
              : {}),
          },
          body: JSON.stringify(payload),
        });
        httpStatus = res.status;
        responseBody = await res.text();
        if (res.ok) {
          let parsed: any = {};
          try { parsed = JSON.parse(responseBody); } catch { /* ignore */ }
          licenseKey = parsed?.license_key || parsed?.licenseKey || null;
          expiresAt = parsed?.expires_at || parsed?.expiresAt || null;
          if (licenseKey) status = "delivered";
          else errorMsg = "Response missing license_key";
        } else {
          errorMsg = `Webhook returned ${res.status}`;
        }
      } catch (e: any) {
        errorMsg = e?.message || "Webhook request failed";
      }

      const deliveryPayload = {
        product_name: item.product_name,
        plan_name: item.tier_label || item.product_name,
        code: licenseKey,
        expires_at: expiresAt,
        webhook_status: httpStatus,
        webhook_response: responseBody.substring(0, 500),
        error: errorMsg,
      };

      if (existing) {
        await supabase
          .from("order_deliveries")
          .update({
            status,
            payload: deliveryPayload,
            delivered_at: status === "delivered" ? new Date().toISOString() : null,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("order_deliveries").insert({
          order_id: order.id,
          order_item_id: item.id,
          product_id: item.product_id,
          delivery_type: "license",
          status,
          delivered_at: status === "delivered" ? new Date().toISOString() : null,
          payload: deliveryPayload,
        });
      }

      results.push({ order_item_id: item.id, status, license_key: licenseKey ? "issued" : null, error: errorMsg });
    }

    return json({ success: true, order_number: order.order_number, results });
  } catch (err) {
    console.error("issue-license error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
}));
