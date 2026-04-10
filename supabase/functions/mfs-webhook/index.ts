import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Optional shared secret check
    const incomingSecret = req.headers.get("x-webhook-secret");
    if (incomingSecret) {
      const { data: secretSetting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "mfs_webhook_secret")
        .maybeSingle();

      if (secretSetting?.value && secretSetting.value !== incomingSecret) {
        return json({ error: "Invalid webhook secret" }, 401);
      }
    }

    const raw = await req.json();
    // Support both flat payload and wrapped { event, data } format
    const body = raw.data && raw.event ? raw.data : raw;
    const { trx_id, sender_number, amount, provider, ...extra } = body;

    if (!trx_id || !provider) {
      return json({ error: "Missing required fields: trx_id, provider" }, 400);
    }

    if (!["bkash", "nagad"].includes(provider)) {
      return json({ error: "Invalid provider. Must be 'bkash' or 'nagad'" }, 400);
    }

    // Insert into send_money_verifications
    const { error: insertErr } = await supabase
      .from("send_money_verifications")
      .upsert(
        {
          trx_id,
          sender_number: sender_number || "",
          amount: amount || 0,
          provider,
          verified: true,
          raw_data: body,
        },
        { onConflict: "trx_id" }
      );

    if (insertErr) {
      console.error("Insert verification error:", insertErr);
      return json({ error: "Failed to store verification" }, 500);
    }

    // Look up matching pending transaction by trx_id
    const { data: txn, error: txnErr } = await supabase
      .from("transactions")
      .select("id, order_id, order_number, trx_id, status")
      .eq("trx_id", trx_id)
      .eq("status", "pending")
      .maybeSingle();

    if (txnErr) {
      console.error("Transaction lookup error:", txnErr);
      return json({ success: true, matched: false, message: "Verification stored but transaction lookup failed" });
    }

    if (!txn) {
      return json({ success: true, matched: false, message: "Verification stored. No matching pending transaction found yet." });
    }

    // Auto-complete the order
    const orderId = txn.order_id;

    await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: "completed",
        notes: `${provider}_trxID:${trx_id} | verified:n8n`,
        bkash_response: { trx_id, sender_number, provider, verified: true, verified_at: new Date().toISOString(), source: "n8n" },
      })
      .eq("id", orderId);

    // Update transaction status
    await supabase
      .from("transactions")
      .update({
        status: "completed",
        verified_at: new Date().toISOString(),
        raw_response: { ...body, verified: true, source: "n8n" },
      })
      .eq("id", txn.id);

    // Generate download tokens for digital products
    await supabase.rpc("generate_download_tokens", { _order_id: orderId });

    // Send confirmation email (non-blocking)
    fetch(`${supabaseUrl}/functions/v1/send-order-confirmation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
      body: JSON.stringify({ order_id: orderId, type: "payment_verified" }),
    }).catch(() => {});

    return json({
      success: true,
      matched: true,
      order_id: orderId,
      order_number: txn.order_number,
      message: "Payment verified and order completed",
    });
  } catch (err: unknown) {
    console.error("mfs-webhook error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
