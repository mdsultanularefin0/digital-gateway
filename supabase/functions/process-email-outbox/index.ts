import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withLogging("process-email-outbox", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  // Pull due rows
  const { data: due, error } = await sb
    .from("email_outbox")
    .select("id, order_id, template_id, attempts")
    .eq("status", "pending")
    .lte("send_at", new Date().toISOString())
    .order("send_at", { ascending: true })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  let sent = 0;
  let failed = 0;

  for (const row of due || []) {
    try {
      // Look up template category so the existing sender resolves the right type
      const { data: tpl } = await sb
        .from("product_email_templates")
        .select("category")
        .eq("id", row.template_id)
        .maybeSingle();

      const resp = await fetch(`${supabaseUrl}/functions/v1/send-order-confirmation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          order_id: row.order_id,
          type: tpl?.category || "post_purchase",
          template_id: row.template_id,
          from_outbox: true,
        }),
      });

      const ok = resp.ok;
      const text = await resp.text();

      if (ok) {
        await sb.from("email_outbox").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          attempts: (row.attempts || 0) + 1,
        }).eq("id", row.id);
        sent++;
      } else {
        const attempts = (row.attempts || 0) + 1;
        await sb.from("email_outbox").update({
          status: attempts >= 5 ? "failed" : "pending",
          attempts,
          last_error: text.slice(0, 500),
          send_at: attempts >= 5 ? new Date().toISOString() : new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }).eq("id", row.id);
        failed++;
      }
    } catch (e) {
      const attempts = (row.attempts || 0) + 1;
      await sb.from("email_outbox").update({
        status: attempts >= 5 ? "failed" : "pending",
        attempts,
        last_error: String((e as Error).message).slice(0, 500),
        send_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }).eq("id", row.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ checked: (due || []).length, sent, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}));
