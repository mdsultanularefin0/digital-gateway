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
  return data; // { paymentID, bkashURL, ... }
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

// ── Main handler ───────────────────────────────────────────────

Deno.serve(async (req) => {
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
      const { amount, orderId, callbackURL, payerReference } = await req.json();

      if (!amount || !orderId || !callbackURL) {
        return json({ error: "Missing required fields" }, 400);
      }

      const baseUrl = await getBaseUrl(supabase);
      const { idToken } = await grantToken(baseUrl);

      const result = await createPayment(
        baseUrl,
        idToken,
        String(amount),
        orderId,
        callbackURL,
        payerReference || "guest"
      );

      // Store paymentID and full create response against orderId
      await supabase
        .from("orders")
        .update({
          notes: `bkash_paymentID:${result.paymentID}`,
          payment_method: "bkash",
          bkash_response: { create: result },
        })
        .eq("id", orderId);

      return json({ bkashURL: result.bkashURL, paymentID: result.paymentID });
    }

    // ── EXECUTE: called after bKash redirects back ──
    if (action === "execute" && req.method === "POST") {
      const { paymentID, orderId } = await req.json();

      if (!paymentID || !orderId) {
        return json({ error: "Missing paymentID or orderId" }, 400);
      }

      const baseUrl = await getBaseUrl(supabase);
      const { idToken } = await grantToken(baseUrl);
      const result = await executePayment(baseUrl, idToken, paymentID);
      console.log("bKash execute response:", JSON.stringify(result));

      // Fetch existing bkash_response to merge
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("bkash_response")
        .eq("id", orderId)
        .maybeSingle();

      const mergedResponse = {
        ...(existingOrder?.bkash_response as Record<string, unknown> || {}),
        execute: result,
      };

      // Determine success: trxID present means payment went through
      const isPaid = !!result.trxID;
      const paymentStatus = isPaid ? "paid" : "failed";

      // Always save the full response and auto-update payment status
      await supabase
        .from("orders")
        .update({
          payment_status: paymentStatus,
          bkash_response: mergedResponse,
          notes: isPaid
            ? `bkash_trxID:${result.trxID} | bkash_paymentID:${paymentID}`
            : `bkash_failed | bkash_paymentID:${paymentID} | ${result.statusMessage || result.errorMessage || ""}`,
        })
        .eq("id", orderId);

      if (isPaid) {
        return json({ success: true, trxID: result.trxID });
      }

      return json(
        { success: false, message: result.statusMessage || result.errorMessage || "Payment not completed" },
        400
      );
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    console.error("bKash payment error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
