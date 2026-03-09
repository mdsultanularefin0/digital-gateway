import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Outbound Order Webhook
 *
 * Call this function after creating/updating an order.
 * It reads the webhook_url from site_settings and POSTs the order data to it.
 *
 * Body: { order_id: string, event: "order.created" | "order.updated" }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { order_id, event } = await req.json();

    if (!order_id) {
      return json({ error: "order_id is required" }, 400);
    }

    // Check if webhook is configured
    const { data: settingsRows } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["webhook_url", "webhook_secret", "webhook_on_create", "webhook_on_status", "webhook_on_payment"]);

    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => (settings[r.key] = r.value));

    const webhookUrl = settings["webhook_url"];
    if (!webhookUrl) {
      return json({ skipped: true, reason: "No webhook URL configured" });
    }

    // Check if this event type is enabled
    const eventType = event || "order.updated";
    if (eventType === "order.created" && settings["webhook_on_create"] === "false") {
      return json({ skipped: true, reason: "order.created webhook disabled" });
    }
    if (eventType === "order.status_changed" && settings["webhook_on_status"] === "false") {
      return json({ skipped: true, reason: "order.status_changed webhook disabled" });
    }
    if (eventType === "order.payment_changed" && settings["webhook_on_payment"] === "false") {
      return json({ skipped: true, reason: "order.payment_changed webhook disabled" });
    }

    // Fetch full order with items
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) {
      return json({ error: "Order not found" }, 404);
    }

    // Build webhook payload
    const payload: Record<string, unknown> = {
      event: eventType,
      order_id: order.id,
      order_number: order.order_number,
      status: order.status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      shipping_address: order.shipping_address,
      shipping_city: order.shipping_city,
      shipping_state: order.shipping_state,
      shipping_zip: order.shipping_zip,
      shipping_country: order.shipping_country,
      subtotal: order.subtotal,
      discount: order.discount,
      shipping_cost: order.shipping_cost,
      total: order.total,
      notes: order.notes,
      items: (order.order_items || []).map((item: any) => ({
        product_name: item.product_name,
        tier_label: item.tier_label,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      })),
      timestamp: new Date().toISOString(),
    };

    // Include secret if configured
    if (settings["webhook_secret"]) {
      payload.secret = settings["webhook_secret"];
    }

    // Send to external webhook URL
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    console.log(`Webhook sent to ${webhookUrl}: ${res.status}`, responseText.substring(0, 200));

    return json({
      success: true,
      webhook_status: res.status,
      event: eventType,
      order_number: order.order_number,
    });
  } catch (err: unknown) {
    console.error("Webhook error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
