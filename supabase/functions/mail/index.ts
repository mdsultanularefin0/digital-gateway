import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../_shared/logger.ts";
import { getMailConfig, resolveFrom } from "../_shared/mail-config.ts";
import { smtpSend } from "../_shared/smtp.ts";
import { logEmail } from "../_shared/email-logger.ts";

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

Deno.serve(withLogging("mail", async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const svc = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roleData } = await svc.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) return json({ error: "Forbidden" }, 403);

    const { action, purpose, ...params } = await req.json();
    const cfg = await getMailConfig(svc);

    // Resolve site name for From display
    const { data: settingsRows } = await svc.from("site_settings").select("key, value").eq("key", "site_name").maybeSingle();
    const siteName = settingsRows?.value || "Support";

    switch (action) {
      case "test-smtp": {
        const h = cfg.smtp_host || "";
        const p = parseInt(cfg.smtp_port || "587", 10);
        const useTls = (cfg.smtp_encryption || "tls") === "ssl" || p === 465;
        const c = useTls ? await Deno.connectTls({ hostname: h, port: p }) : await Deno.connect({ hostname: h, port: p });
        const buf = new Uint8Array(1024);
        const n = await c.read(buf);
        c.close();
        return json({ success: true, greeting: n ? new TextDecoder().decode(buf.subarray(0, n)).trim() : "" });
      }

      case "send-email": {
        const { to = "", subject = "", body = "" } = params;
        if (!to || !subject) return json({ error: "Missing to/subject" }, 400);
        const fromAddr = resolveFrom(cfg, purpose);
        try {
          const result = await smtpSend(cfg, {
            to, subject, text: body, from: fromAddr, fromName: siteName,
          });
          await logEmail(svc, {
            recipient: to, sender: fromAddr, subject,
            purpose: purpose || "", status: "sent",
            triggered_by: user.email || "admin",
          });
          return json({ success: true, result });
        } catch (sendErr: any) {
          await logEmail(svc, {
            recipient: to, sender: fromAddr, subject,
            purpose: purpose || "", status: "failed",
            error: sendErr.message || String(sendErr),
            triggered_by: user.email || "admin",
          });
          throw sendErr;
        }
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err: any) {
    console.error("[mail]", err.message);
    return json({ error: err.message || "Internal error" }, 500);
  }
}));
