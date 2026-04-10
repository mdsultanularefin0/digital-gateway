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
      .select("id, order_number, total, payment_method, payment_status, customer_name, customer_email, customer_phone")
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

    // Insert transaction record
    await supabase.from("transactions").insert({
      order_id: orderId,
      order_number: order.order_number,
      payment_method: provider,
      provider: provider === "bkash_send" ? "bKash" : "Nagad",
      sender_number: senderNumber,
      trx_id: trxId,
      amount: order.total,
      currency: "BDT",
      status: "pending",
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      raw_response: sendMoneyData,
    });

    // No webhook verification — n8n will push verification via mfs-webhook
    return json({
      success: true,
      verified: false,
      message: "Payment details submitted. Awaiting verification.",
    });
  } catch (err: unknown) {
    console.error("verify-send-money error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
