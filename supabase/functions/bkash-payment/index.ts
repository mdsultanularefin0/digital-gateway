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

// ── bKash helpers ──────────────────────────────────────────────

async function getBaseUrl(supabase: any): Promise<string> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "bkash_sandbox")
    .maybeSingle();
  const isSandbox = !data || data.value !== "false";
  return isSandbox
    ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
    : "https://tokenized.pay.bka.sh/v1.2.0-beta";
}

async function grantToken(baseUrl: string) {
  const appKey = Deno.env.get("BKASH_APP_KEY");
  const appSecret = Deno.env.get("BKASH_APP_SECRET");
  const username = Deno.env.get("BKASH_USERNAME");
  const password = Deno.env.get("BKASH_PASSWORD");

  if (!appKey || !appSecret || !username || !password) {
    throw new Error("bKash credentials are not configured");
  }

  const res = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username,
      password,
    },
    body: JSON.stringify({ app_key: appKey, app_secret: appSecret }),
  });

  const data = await res.json();
  if (!res.ok || data.statusCode === "0000" === false) {
    throw new Error(`bKash grant token failed: ${JSON.stringify(data)}`);
  }
  return { idToken: data.id_token, refreshToken: data.refresh_token };
}

async function createPayment(
  baseUrl: string,
  idToken: string,
  amount: string,
  invoiceNumber: string,
  callbackURL: string,
  payerReference: string
) {
  const appKey = Deno.env.get("BKASH_APP_KEY")!;

  const res = await fetch(`${baseUrl}/tokenized/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      authorization: idToken,
      "x-app-key": appKey,
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference,
      callbackURL,
      amount,
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: invoiceNumber,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.bkashURL) {
    throw new Error(`bKash create payment failed: ${JSON.stringify(data)}`);
  }
  return data;
}

async function executePayment(baseUrl: string, idToken: string, paymentID: string) {
  const appKey = Deno.env.get("BKASH_APP_KEY")!;

  const res = await fetch(`${baseUrl}/tokenized/checkout/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      authorization: idToken,
      "x-app-key": appKey,
    },
    body: JSON.stringify({ paymentID }),
  });

  const data = await res.json();
  return data;
}

async function refundPayment(
  baseUrl: string,
  idToken: string,
  paymentID: string,
  trxID: string,
  amount: string,
  reason: string,
) {
  const appKey = Deno.env.get("BKASH_APP_KEY")!;
  const res = await fetch(`${baseUrl}/tokenized/checkout/payment/refund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      authorization: idToken,
      "x-app-key": appKey,
    },
    body: JSON.stringify({
      paymentID,
      trxID,
      amount,
      sku: "refund",
      reason: (reason || "Customer refund").slice(0, 255),
    }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

// ── Main handler ───────────────────────────────────────────────

Deno.serve(withLogging("bkash-payment", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ── CREATE: called from checkout page ──
    if (action === "create" && req.method === "POST") {
      const { orderId, callbackURL, payerReference } = await req.json();

      if (!orderId || !callbackURL) {
        return json({ error: "Missing required fields" }, 400);
      }

      // Server-authoritative: recalculate total from order_items (never trust client-set total)
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("id, order_number, shipping_cost, discount, customer_name, customer_email, customer_phone")
        .eq("id", orderId)
        .single();

      if (orderErr || !order) {
        return json({ error: "Order not found" }, 404);
      }

      const { data: items, error: itemsErr } = await supabase
        .from("order_items")
        .select("quantity, unit_price")
        .eq("order_id", orderId);

      if (itemsErr || !items || items.length === 0) {
        return json({ error: "Order has no items" }, 400);
      }

      const subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
      const calculatedTotal = Math.max(0, subtotal - Number(order.discount || 0) + Number(order.shipping_cost || 0));
      const amount = calculatedTotal.toFixed(2);

      const baseUrl = await getBaseUrl(supabase);
      const { idToken } = await grantToken(baseUrl);

      const result = await createPayment(
        baseUrl,
        idToken,
        amount,
        order.order_number,
        callbackURL,
        payerReference || "guest"
      );

      // Store paymentID against orderId for later verification
      await supabase
        .from("orders")
        .update({
          notes: `bkash_paymentID:${result.paymentID}`,
          payment_method: "bkash",
          bkash_response: { create: result },
        })
        .eq("id", orderId);

      // Insert transaction record (initiated)
      await supabase.from("transactions").insert({
        order_id: orderId,
        order_number: order.order_number,
        payment_method: "bkash",
        provider: "bKash PGW",
        payment_id: result.paymentID,
        amount: calculatedTotal,
        currency: "BDT",
        status: "initiated",
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        raw_response: { create: result },
      });

      return json({ bkashURL: result.bkashURL, paymentID: result.paymentID });
    }

    // ── EXECUTE: called after bKash redirects back ──
    if (action === "execute" && req.method === "POST") {
      const { paymentID, orderId } = await req.json();

      if (!paymentID || !orderId) {
        return json({ error: "Missing paymentID or orderId" }, 400);
      }

      // Verify that the paymentID matches what was stored during create
      const { data: existingOrder, error: fetchErr } = await supabase
        .from("orders")
        .select("notes, bkash_response, order_number, customer_name, customer_email, customer_phone")
        .eq("id", orderId)
        .single();

      if (fetchErr || !existingOrder) {
        return json({ error: "Order not found" }, 404);
      }

      // Extract stored paymentID and verify it matches the request
      const storedPaymentID = existingOrder.notes?.match(/bkash_paymentID:(\S+)/)?.[1];
      if (!storedPaymentID || storedPaymentID !== paymentID) {
        return json({ error: "Payment ID mismatch — potential tampering detected" }, 400);
      }

      const baseUrl = await getBaseUrl(supabase);
      const { idToken } = await grantToken(baseUrl);
      const result = await executePayment(baseUrl, idToken, paymentID);
      console.log("bKash execute response:", JSON.stringify(result));

      const mergedResponse = {
        ...(existingOrder?.bkash_response as Record<string, unknown> || {}),
        execute: result,
      };

      // Verify paid amount matches expected total
      const isPaid = !!result.trxID;
      if (isPaid && result.amount) {
        // Recalculate expected total
        const { data: verifyItems } = await supabase
          .from("order_items")
          .select("quantity, unit_price")
          .eq("order_id", orderId);
        const { data: verifyOrder } = await supabase
          .from("orders")
          .select("shipping_cost, discount")
          .eq("id", orderId)
          .single();
        if (verifyItems && verifyOrder) {
          const expectedSubtotal = verifyItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
          const expectedTotal = Math.max(0, expectedSubtotal - Number(verifyOrder.discount || 0) + Number(verifyOrder.shipping_cost || 0));
          if (Math.abs(Number(result.amount) - expectedTotal) > 0.01) {
            console.error(`Amount mismatch: paid=${result.amount}, expected=${expectedTotal}`);
            // Update transaction as failed
            await supabase
              .from("transactions")
              .update({ status: "failed", raw_response: mergedResponse })
              .eq("order_id", orderId)
              .eq("payment_id", paymentID);
            return json({ success: false, message: "Payment amount does not match order total" }, 400);
          }
        }
      }

      const paymentStatus = isPaid ? "paid" : "failed";

      await supabase
        .from("orders")
        .update({
          payment_status: paymentStatus,
          status: isPaid ? "completed" : undefined,
          bkash_response: mergedResponse,
          notes: isPaid
            ? `bkash_trxID:${result.trxID} | bkash_paymentID:${paymentID}`
            : `bkash_failed | bkash_paymentID:${paymentID} | ${result.statusMessage || result.errorMessage || ""}`,
        })
        .eq("id", orderId);

      // Update transaction record
      await supabase
        .from("transactions")
        .update({
          status: isPaid ? "completed" : "failed",
          trx_id: result.trxID || "",
          verified_at: isPaid ? new Date().toISOString() : null,
          raw_response: mergedResponse,
        })
        .eq("order_id", orderId)
        .eq("payment_id", paymentID);

      if (isPaid) {
        // Send confirmation/fulfillment email (non-blocking)
        fetch(`${supabaseUrl}/functions/v1/send-order-confirmation`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
          body: JSON.stringify({ 
            order_id: orderId, 
            type: "payment_verified", 
            origin: req.headers.get("origin") || origin
          }),
        }).catch(() => {});

        // Fire outbound payment webhook (non-blocking)
        fetch(`${supabaseUrl}/functions/v1/order-webhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
          body: JSON.stringify({ order_id: orderId, event: "order.payment_changed" }),
        }).catch(() => {});

        return json({ success: true, trxID: result.trxID });
      }

      return json(
        { success: false, message: result.statusMessage || result.errorMessage || "Payment not completed" },
        400
      );
    }

    // ── REFUND: admin-triggered refund (full or partial) ──
    if (action === "refund" && req.method === "POST") {
      const { orderId, amount, reason } = await req.json();
      if (!orderId) return json({ error: "Missing orderId" }, 400);

      const { data: order, error: ordErr } = await supabase
        .from("orders")
        .select("id, order_number, total, notes, bkash_response, payment_status")
        .eq("id", orderId)
        .single();
      if (ordErr || !order) return json({ error: "Order not found" }, 404);
      if (order.payment_status !== "paid") return json({ error: "Order is not paid" }, 400);

      const paymentID = order.notes?.match(/bkash_paymentID:(\S+)/)?.[1];
      const trxID = order.notes?.match(/bkash_trxID:(\S+)/)?.[1];
      if (!paymentID || !trxID) return json({ error: "No bKash transaction on file" }, 400);

      const refundAmt = amount ? Number(amount).toFixed(2) : Number(order.total).toFixed(2);
      const baseUrl = await getBaseUrl(supabase);
      const { idToken } = await grantToken(baseUrl);
      const { ok, data: refundData } = await refundPayment(baseUrl, idToken, paymentID, trxID, refundAmt, reason || "");

      const merged = {
        ...(order.bkash_response as Record<string, unknown> || {}),
        refund: refundData,
      };

      const isFullRefund = Math.abs(Number(refundAmt) - Number(order.total)) < 0.01;
      await supabase
        .from("orders")
        .update({
          bkash_response: merged,
          payment_status: ok && isFullRefund ? "refunded" : order.payment_status,
          status: ok && isFullRefund ? "refunded" : undefined,
        })
        .eq("id", orderId);

      await supabase.from("transactions").insert({
        order_id: orderId,
        order_number: order.order_number,
        payment_method: "bkash",
        provider: "bKash PGW",
        payment_id: paymentID,
        trx_id: refundData?.refundTrxID || "",
        amount: -Number(refundAmt),
        currency: "BDT",
        status: ok ? "refunded" : "failed",
        raw_response: refundData,
      });

      if (!ok) return json({ success: false, error: refundData }, 400);
      return json({ success: true, refund: refundData });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    console.error("bKash payment error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
}));
