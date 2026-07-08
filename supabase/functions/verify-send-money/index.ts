import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../_shared/logger.ts";

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

Deno.serve(withLogging("verify-send-money", async (req) => {
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

    // Basic shape validation to deter brute-force / garbage submissions
    const cleanTrx = String(trxId).trim();
    const cleanSender = String(senderNumber).trim();
    if (cleanTrx.length < 6 || cleanTrx.length > 40 || !/^[A-Za-z0-9]+$/.test(cleanTrx)) {
      return json({ error: "Invalid transaction ID format" }, 400);
    }
    if (cleanSender.length < 6 || cleanSender.length > 20) {
      return json({ error: "Invalid sender number" }, 400);
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

    // Customers can choose a different available payment method when retrying an unpaid order.

    // Normalize provider labels because transactions and verification rows store different values.
    const verificationProvider = provider === "bkash_send" ? "bkash" : "nagad";
    const transactionProvider = provider === "bkash_send" ? "bKash" : "Nagad";

    // FIX #1 (replay): reject if this trxId+provider was already used on ANY non-rejected transaction.
    const { data: existingTxns, error: existingTxnErr } = await supabase
      .from("transactions")
      .select("id, order_id, status")
      .eq("trx_id", cleanTrx)
      .eq("provider", transactionProvider)
      .neq("status", "rejected")
      .limit(2);

    if (existingTxnErr) {
      console.error("Duplicate transaction lookup failed:", existingTxnErr);
      return json({ error: "Unable to validate this Transaction ID right now. Please try again." }, 500);
    }

    const existingTxn = existingTxns?.[0] ?? null;

    if (existingTxn && existingTxn.order_id !== orderId) {
      return json({ error: "This Transaction ID has already been used for another order." }, 409);
    }
    if (existingTxn && existingTxn.order_id === orderId) {
      return json({ error: "This Transaction ID has already been submitted for this order." }, 409);
    }

    // Auto-verify based on customer-submitted TrxID + sender.
    // No webhook lookup — trust the submission and mark paid.
    const sendMoneyData = {
      provider,
      sender_number: cleanSender,
      trx_id: cleanTrx,
      submitted_at: new Date().toISOString(),
    };

    // FIX #3 (atomic claim): only mark paid if still unpaid — prevents double-fulfillment race
    const { data: claimedOrder, error: claimErr } = await supabase
      .from("orders")
      .update({
        payment_method: provider,
        payment_status: "paid",
        status: "completed",
        notes: `${provider}_trxID:${cleanTrx} | sender:${cleanSender} | verified:auto`,
        bkash_response: { ...sendMoneyData, verified: true, verified_at: new Date().toISOString() },
      })
      .eq("id", orderId)
      .eq("payment_status", "unpaid")
      .select("id")
      .maybeSingle();

    if (claimErr || !claimedOrder) {
      return json({ error: "Order could not be marked paid (already processed)." }, 409);
    }

    // Insert completed transaction (unique index on trx_id+provider is final replay guard)
    const { error: insertTxnErr } = await supabase.from("transactions").insert({
      order_id: orderId,
      order_number: order.order_number,
      payment_method: provider,
      provider: transactionProvider,
      sender_number: cleanSender,
      trx_id: cleanTrx,
      amount: order.total,
      currency: "BDT",
      status: "completed",
      verified_at: new Date().toISOString(),
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      raw_response: { ...sendMoneyData, verified: true, source: "auto_submit" },
    });

    if (insertTxnErr) {
      console.error("Transaction insert blocked:", insertTxnErr);
      // Revert order status since we couldn't record the transaction
      await supabase
        .from("orders")
        .update({ payment_status: "unpaid", status: "pending" })
        .eq("id", orderId);
      return json({ error: "Duplicate transaction blocked." }, 409);
    }

    // Generate download tokens for digital products
    await supabase.rpc("generate_download_tokens", { _order_id: orderId });

    // Send confirmation email (non-blocking)
    fetch(`${supabaseUrl}/functions/v1/send-order-confirmation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
      body: JSON.stringify({
        order_id: orderId,
        type: "payment_verified",
        origin: req.headers.get("origin") || new URL(req.url).origin,
      }),
    }).catch(() => {});

    // Fire outbound payment webhook (non-blocking)
    fetch(`${supabaseUrl}/functions/v1/order-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
      body: JSON.stringify({ order_id: orderId, event: "order.payment_changed" }),
    }).catch(() => {});

    return json({
      success: true,
      verified: true,
      message: "Payment verified and order completed.",
    });
  } catch (err: unknown) {
    console.error("verify-send-money error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
}));
