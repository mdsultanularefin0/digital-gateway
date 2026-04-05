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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { orderId, senderNumber, trxId, provider } = await req.json();

    if (!orderId || !senderNumber || !trxId || !provider) {
      return json({ error: "Missing required fields: orderId, senderNumber, trxId, provider" }, 400);
    }

    if (!["bkash_send", "nagad_send"].includes(provider)) {
      return json({ error: "Invalid provider" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, order_number, total, payment_method, payment_status, customer_email")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return json({ error: "Order not found" }, 404);
    }

    if (order.payment_status === "paid") {
      return json({ error: "Order already paid" }, 400);
    }

    if (order.payment_method !== provider) {
      return json({ error: "Payment method mismatch" }, 400);
    }

    // Store send money details on the order
    const sendMoneyData = {
      provider,
      sender_number: senderNumber,
      trx_id: trxId,
      submitted_at: new Date().toISOString(),
    };

    await supabase
      .from("orders")
      .update({
        notes: `${provider}_trxID:${trxId} | sender:${senderNumber}`,
        bkash_response: sendMoneyData,
      })
      .eq("id", orderId);

    // Check if a verification webhook URL is configured
    const webhookKey = provider === "bkash_send" ? "bkash_send_webhook" : "nagad_send_webhook";
    const { data: webhookSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", webhookKey)
      .maybeSingle();

    const webhookUrl = webhookSetting?.value;

    if (webhookUrl) {
      try {
        const webhookPayload = {
          order_id: orderId,
          order_number: order.order_number,
          amount: order.total,
          sender_number: senderNumber,
          trx_id: trxId,
          provider,
          customer_email: order.customer_email,
        };

        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        });

        const result = await res.json();

        if (result.verified === true) {
          // Auto-confirm payment
          await supabase
            .from("orders")
            .update({
              payment_status: "paid",
              notes: `${provider}_trxID:${trxId} | sender:${senderNumber} | verified:auto`,
              bkash_response: { ...sendMoneyData, verified: true, verified_at: new Date().toISOString() },
            })
            .eq("id", orderId);

          // Generate download tokens for digital products
          await supabase.rpc("generate_download_tokens", { _order_id: orderId });

          // Send payment verified email (non-blocking)
          const supabaseUrl2 = Deno.env.get("SUPABASE_URL")!;
          fetch(`${supabaseUrl2}/functions/v1/send-order-confirmation`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
            body: JSON.stringify({ order_id: orderId, type: "payment_verified" }),
          }).catch(() => {});

          return json({ success: true, verified: true, message: "Payment verified automatically" });
        }
      } catch (webhookErr) {
        console.error("Webhook verification failed:", webhookErr);
        // Fall through to pending state
      }
    }

    // No webhook or verification failed — order stays pending
    return json({
      success: true,
      verified: false,
      message: "Payment details submitted. Awaiting manual verification.",
    });
  } catch (err: unknown) {
    console.error("verify-send-money error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
