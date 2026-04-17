import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SmsType = "transactional" | "marketing";

interface SmsPayload {
  recipient?: string;     // single recipient, E.164
  recipients?: string[];  // batch
  content: string;
  type?: SmsType;
  tag?: string;
  // optional override of stored sender id
  sender?: string;
}

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[\s\-()]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (!s.startsWith("+")) {
    // Default to BD if 11-digit local starting with 01
    if (/^01\d{9}$/.test(s)) s = "+88" + s;
    else if (/^\d{10,15}$/.test(s)) s = "+" + s;
    else return null;
  }
  return /^\+\d{8,15}$/.test(s) ? s : null;
}

function replaceVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

async function sendBrevoSms(opts: {
  apiKey: string;
  sender: string;
  recipient: string;
  content: string;
  type: SmsType;
  tag?: string;
}) {
  const res = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
    method: "POST",
    headers: {
      "api-key": opts.apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      sender: opts.sender,
      recipient: opts.recipient,
      content: opts.content,
      type: opts.type,
      tag: opts.tag,
    }),
  });
  const text = await res.text();
  let parsed: any;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  return { ok: res.ok, status: res.status, body: parsed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as SmsPayload & {
      order_id?: string;
      template?: "order_confirmation" | "payment_verified" | "custom";
      vars?: Record<string, string>;
    };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settingsRows } = await supabase.from("site_settings").select("key, value");
    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => { settings[r.key] = r.value; });

    const provider = (settings.sms_provider || "brevo").toLowerCase();
    if (provider !== "brevo") {
      return new Response(JSON.stringify({ success: false, error: `SMS provider '${provider}' not implemented in this function. Set sms_provider=brevo.` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = settings.brevo_api_key || settings.sms_api_key || "";
    const sender = body.sender || settings.brevo_sender_id || settings.sms_sender_id || "";

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: "Brevo API key not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!sender) {
      return new Response(JSON.stringify({ success: false, error: "Brevo sender ID not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build content + recipients (resolve from order if requested)
    let content = body.content || "";
    const recipientsRaw: string[] = [];
    let smsType: SmsType = body.type || "transactional";
    let tag = body.tag;

    if (body.order_id) {
      const { data: order } = await supabase.from("orders").select("*").eq("id", body.order_id).single();
      if (!order) {
        return new Response(JSON.stringify({ success: false, error: "Order not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const tpl = body.template || "order_confirmation";
      const siteName = settings.site_name || "Store";
      const currencySymbol = settings.currency_symbol || "৳";

      const vars: Record<string, string> = {
        site_name: siteName,
        customer_name: (order.customer_name || "").split(" ")[0] || "there",
        order_number: order.order_number || "",
        order_total: `${currencySymbol}${Number(order.total).toFixed(2)}`,
        ...(body.vars || {}),
      };

      if (!content) {
        if (tpl === "payment_verified") {
          content = settings.sms_template_payment_verified
            || `Hi {{customer_name}}, payment for order {{order_number}} ({{order_total}}) confirmed. Thank you for shopping with {{site_name}}!`;
        } else {
          content = settings.sms_template_order_confirmation
            || `Hi {{customer_name}}, your order {{order_number}} ({{order_total}}) is confirmed at {{site_name}}. Thank you!`;
        }
      }
      content = replaceVars(content, vars);
      tag = tag || `order:${order.order_number}`;

      if (order.customer_phone) recipientsRaw.push(order.customer_phone);
    }

    if (body.recipient) recipientsRaw.push(body.recipient);
    if (Array.isArray(body.recipients)) recipientsRaw.push(...body.recipients);

    const recipients = Array.from(new Set(
      recipientsRaw.map(normalizePhone).filter((x): x is string => !!x)
    ));

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "No valid recipients" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!content.trim()) {
      return new Response(JSON.stringify({ success: false, error: "SMS content is empty" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const triggeredBy = body.order_id ? "order" : (smsType === "marketing" ? "broadcast" : "manual");
    const results: any[] = [];
    for (const recipient of recipients) {
      const r = await sendBrevoSms({ apiKey, sender, recipient, content, type: smsType, tag });
      results.push({ recipient, ...r });

      // Log every send (best-effort, never blocks)
      try {
        await supabase.from("sms_logs").insert({
          recipient,
          content,
          type: smsType,
          tag: tag || "",
          provider: "brevo",
          status: r.ok ? "sent" : "failed",
          message_id: r.body?.messageId || "",
          error: r.ok ? "" : (r.body?.message || r.body?.code || `HTTP ${r.status}`),
          remaining_credits: r.body?.remainingCredits ?? null,
          raw_response: r.body,
          triggered_by: triggeredBy,
          order_id: body.order_id || null,
        });
      } catch (logErr) {
        console.error("sms_logs insert failed:", logErr);
      }
    }

    const allOk = results.every((r) => r.ok);
    return new Response(JSON.stringify({ success: allOk, count: recipients.length, results }), {
      status: allOk ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-sms error:", err);
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
