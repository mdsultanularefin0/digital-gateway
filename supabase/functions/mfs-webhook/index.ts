import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../_shared/logger.ts";

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

Deno.serve(withLogging("mfs-webhook", async (req) => {
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

    // FIX #4 (mandatory secret): require x-webhook-secret header and verify it matches stored value
    const incomingSecret = req.headers.get("x-webhook-secret");
    const { data: secretSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "mfs_webhook_secret")
      .maybeSingle();

    const expectedSecret = secretSetting?.value?.trim();
    if (!expectedSecret) {
      console.error("mfs-webhook: mfs_webhook_secret site setting is not configured");
      return json({ error: "Webhook not configured" }, 503);
    }
    if (!incomingSecret || incomingSecret !== expectedSecret) {
      return json({ error: "Unauthorized" }, 401);
    }

    const raw = await req.json();
    // Support both flat payload and wrapped { event, data } format
    const body = raw.data && raw.event ? raw.data : raw;
    const { trx_id, sender_number, amount, provider } = body;

    if (!trx_id || !provider) {
      return json({ error: "Missing required fields: trx_id, provider" }, 400);
    }

    if (!["bkash", "nagad"].includes(provider)) {
      return json({ error: "Invalid provider. Must be 'bkash' or 'nagad'" }, 400);
    }

    const cleanTrx = String(trx_id).trim();
    const internalProvider = provider === "bkash" ? "bkash_send" : "nagad_send";

    // Look up matching pending transaction by trx_id + provider
    const { data: txn, error: txnErr } = await supabase
      .from("transactions")
      .select("id, order_id, order_number, trx_id, status")
      .eq("trx_id", cleanTrx)
      .eq("provider", provider === "bkash" ? "bKash" : "Nagad")
      .eq("status", "pending")
      .maybeSingle();

    const verificationRow: Record<string, unknown> = {
      trx_id: cleanTrx,
      sender_number: sender_number || "",
      amount: amount || 0,
      provider,
      verified: true,
      raw_data: body,
    };
    if (txn) {
      verificationRow.matched_order_id = txn.order_id;
    }

    const { error: insertErr } = await supabase
      .from("send_money_verifications")
      .upsert(verificationRow, { onConflict: "trx_id" });

    if (insertErr) {
      console.error("Insert verification error:", insertErr);
      return json({ error: "Failed to store verification" }, 500);
    }

    if (txnErr) {
      console.error("Transaction lookup error:", txnErr);
      return json({ success: true, matched: false, message: "Verification stored but transaction lookup failed" });
    }

    if (!txn) {
      return json({ success: true, matched: false, message: "Verification stored. No matching pending transaction found yet." });
    }

    // FIX #3 (atomic claim): only mark paid if still unpaid
    const orderId = txn.order_id;
    const { data: claimedOrder, error: claimErr } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: "completed",
        notes: `${internalProvider}_trxID:${cleanTrx} | verified:webhook`,
        bkash_response: { trx_id: cleanTrx, sender_number, provider, verified: true, verified_at: new Date().toISOString(), source: "webhook" },
      })
      .eq("id", orderId)
      .eq("payment_status", "unpaid")
      .select("id")
      .maybeSingle();

    if (claimErr || !claimedOrder) {
      return json({
        success: true,
        matched: true,
        already_processed: true,
        order_id: orderId,
        message: "Order was already processed",
      });
    }

    // Update transaction status (skip if already completed by another path)
    await supabase
      .from("transactions")
      .update({
        status: "completed",
        verified_at: new Date().toISOString(),
        raw_response: { ...body, verified: true, source: "webhook" },
      })
      .eq("id", txn.id)
      .eq("status", "pending");

    // Generate download tokens for digital products
    await supabase.rpc("generate_download_tokens", { _order_id: orderId });

    // Send confirmation email (non-blocking)
    fetch(`${supabaseUrl}/functions/v1/send-order-confirmation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
      body: JSON.stringify({ order_id: orderId, type: "payment_verified" }),
    }).catch(() => {});

    // Fire outbound payment webhook (non-blocking)
    fetch(`${supabaseUrl}/functions/v1/order-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
      body: JSON.stringify({ order_id: orderId, event: "order.payment_changed" }),
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
}));
