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

    // FIX #2 (matched-row guard): surface a hard conflict when this sender+TrxID has already been matched elsewhere.
    const { data: verificationRow } = await supabase
      .from("send_money_verifications")
      .select("id, amount, verified, matched_order_id")
      .eq("trx_id", cleanTrx)
      .eq("sender_number", cleanSender)
      .eq("provider", verificationProvider)
      .maybeSingle();

    if (verificationRow?.matched_order_id && verificationRow.matched_order_id !== orderId) {
      return json({ error: "This transaction has already been matched to another order. Please enter an unmatched Transaction ID." }, 409);
    }

    if (verificationRow?.matched_order_id === orderId) {
      return json({ error: "This Transaction ID is already matched to this order." }, 409);
    }

    const verification = verificationRow?.verified ? verificationRow : null;

    const sendMoneyData = {
      provider,
      sender_number: cleanSender,
      trx_id: cleanTrx,
      submitted_at: new Date().toISOString(),
    };

    // Amount must be >= order total and <= 102% of order total
    const isAmountValid = verification
      ? Number(verification.amount) >= Number(order.total) &&
        Number(verification.amount) <= Number(order.total) * 1.02
      : false;

    const isVerified = !!verification && isAmountValid;

    if (isVerified) {
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
        // Lost the race or update blocked — bail safely without inserting a duplicate transaction
        return json({ error: "Order could not be marked paid (already processed)." }, 409);
      }

      // Claim verification row atomically
      const { data: claimedVerification, error: vClaimErr } = await supabase
        .from("send_money_verifications")
        .update({ matched_order_id: orderId })
        .eq("id", verification.id)
        .is("matched_order_id", null)
        .select("id")
        .maybeSingle();

      if (vClaimErr || !claimedVerification) {
        // Another order grabbed it first — revert order
        await supabase
          .from("orders")
          .update({ payment_status: "unpaid", status: "pending" })
          .eq("id", orderId);
        return json({ error: "Verification already claimed by another order." }, 409);
      }

      // Insert completed transaction (unique index on trx_id+provider acts as final guard)
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
        raw_response: { ...sendMoneyData, verified: true, source: "auto_match" },
      });

      if (insertTxnErr) {
        console.error("Transaction insert blocked:", insertTxnErr);
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
          origin: req.headers.get("origin") || new URL(req.url).origin
        }),
      }).catch(() => {});

      return json({
        success: true,
        verified: true,
        message: "Payment verified and order completed.",
      });
    }

    // Not verified — store as pending. Insert may be blocked by unique index if trxId already pending elsewhere.
    await supabase
      .from("orders")
      .update({
        payment_method: provider,
        notes: `${provider}_trxID:${cleanTrx} | sender:${cleanSender}`,
        bkash_response: sendMoneyData,
      })
      .eq("id", orderId);

    const { error: pendingInsertErr } = await supabase.from("transactions").insert({
      order_id: orderId,
      order_number: order.order_number,
      payment_method: provider,
        provider: transactionProvider,
      sender_number: cleanSender,
      trx_id: cleanTrx,
      amount: order.total,
      currency: "BDT",
      status: "pending",
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      raw_response: sendMoneyData,
    });

    if (pendingInsertErr) {
      console.error("Pending transaction insert blocked:", pendingInsertErr);
      return json({ error: "This Transaction ID has already been submitted." }, 409);
    }

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
