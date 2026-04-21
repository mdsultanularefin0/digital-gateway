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

    // Map provider name for verification table (bkash_send -> bkash, nagad_send -> nagad)
    const verificationProvider = provider === "bkash_send" ? "bkash" : "nagad";

    // Check send_money_verifications table for a matching record
    const { data: verification } = await supabase
      .from("send_money_verifications")
      .select("*")
      .eq("trx_id", trxId)
      .eq("sender_number", senderNumber)
      .eq("provider", verificationProvider)
      .eq("verified", true)
      .maybeSingle();

    const sendMoneyData = {
      provider,
      sender_number: senderNumber,
      trx_id: trxId,
      submitted_at: new Date().toISOString(),
    };

    // Check if verification matches (amount must be >= order total and <= 102% of order total)
    const isAmountValid = verification
      ? Number(verification.amount) >= Number(order.total) &&
        Number(verification.amount) <= Number(order.total) * 1.02
      : false;

    const isVerified = !!verification && isAmountValid;

    if (isVerified) {
      // Auto-complete the order
      await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          status: "completed",
          notes: `${provider}_trxID:${trxId} | sender:${senderNumber} | verified:auto`,
          bkash_response: { ...sendMoneyData, verified: true, verified_at: new Date().toISOString() },
        })
        .eq("id", orderId);

      // Insert completed transaction
      await supabase.from("transactions").insert({
        order_id: orderId,
        order_number: order.order_number,
        payment_method: provider,
        provider: provider === "bkash_send" ? "bKash" : "Nagad",
        sender_number: senderNumber,
        trx_id: trxId,
        amount: order.total,
        currency: "BDT",
        status: "completed",
        verified_at: new Date().toISOString(),
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        raw_response: { ...sendMoneyData, verified: true, source: "auto_match" },
      });

      // Update verification record with matched order
      await supabase
        .from("send_money_verifications")
        .update({ matched_order_id: orderId })
        .eq("id", verification.id);

      // Generate download tokens for digital products
      await supabase.rpc("generate_download_tokens", { _order_id: orderId });

      // Send confirmation email (non-blocking)
      fetch(`${supabaseUrl}/functions/v1/send-order-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
        body: JSON.stringify({ 
          order_id: orderId, 
          type: "payment_verified",
          origin: req.headers.get("origin") || new URL(req.url).origin
        }),
      }).catch(() => {});

      return json({
        success: true,
        verified: true,
        message: "Payment verified and order completed.",
      });
    }

    // Not verified — store as pending
    await supabase
      .from("orders")
      .update({
        notes: `${provider}_trxID:${trxId} | sender:${senderNumber}`,
        bkash_response: sendMoneyData,
      })
      .eq("id", orderId);

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

    return json({
      success: true,
      verified: false,
      message: verification
        ? "Transaction found but amount mismatch. Awaiting manual verification."
        : "Payment details submitted. Awaiting verification.",
    });
  } catch (err: unknown) {
    console.error("verify-send-money error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
}));
