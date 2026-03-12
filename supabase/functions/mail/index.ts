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

async function getMailConfig(supabase: any) {
  const { data, error } = await supabase.from("mail_config").select("key, value");
  if (error) throw new Error("Failed to load mail config: " + error.message);
  const cfg: Record<string, string> = {};
  (data ?? []).forEach((r: { key: string; value: string }) => { cfg[r.key] = r.value; });
  return cfg;
}

// Resolve the "from" address based on purpose
function resolveFrom(cfg: Record<string, string>, purpose?: string): string {
  const map: Record<string, string> = {
    support: cfg.from_support || "",
    orders: cfg.from_orders || "",
    newsletter: cfg.from_newsletter || "",
    notifications: cfg.from_notifications || "",
  };
  return (purpose && map[purpose]) || cfg.smtp_from || cfg.from_support || cfg.smtp_username || "";
}

function escapeImapString(s: string): string {
  // Use literal string format for IMAP to handle special chars
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// ---------- IMAP ----------

async function imapFetch(cfg: Record<string, string>, action: string, uid?: string) {
  const host = cfg.imap_host || "";
  const port = parseInt(cfg.imap_port || "993", 10);
  const user = cfg.imap_username || cfg.smtp_username || "";
  const pass = cfg.imap_password || cfg.smtp_password || "";

  if (!host || !user || !pass) throw new Error("IMAP not configured");

  console.log(`[IMAP] Connecting to ${host}:${port} as ${user}`);
  const conn = await Deno.connectTls({ hostname: host, port });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  async function read(tag: string): Promise<string> {
    while (true) {
      const buf = new Uint8Array(32768);
      const n = await conn.read(buf);
      if (!n) break;
      buffer += decoder.decode(buf.subarray(0, n));
      if (buffer.includes(`${tag} OK`) || buffer.includes(`${tag} NO`) || buffer.includes(`${tag} BAD`)) break;
      if (buffer.length > 512 * 1024) break;
    }
    const result = buffer;
    buffer = "";
    return result;
  }

  async function cmd(tag: string, command: string): Promise<string> {
    await conn.write(encoder.encode(`${tag} ${command}\r\n`));
    return read(tag);
  }

  try {
    // Greeting
    const greetBuf = new Uint8Array(4096);
    await conn.read(greetBuf);

    // Login with properly escaped credentials
    const loginResp = await cmd("A1", `LOGIN ${escapeImapString(user)} ${escapeImapString(pass)}`);
    console.log("[IMAP] Login response:", loginResp.substring(0, 200));
    if (loginResp.includes("A1 NO") || loginResp.includes("A1 BAD")) {
      throw new Error("IMAP login failed");
    }

    await cmd("A2", "SELECT INBOX");

    if (action === "list") {
      const searchResp = await cmd("A3", "SEARCH ALL");
      const match = searchResp.match(/\* SEARCH ([\d\s]+)/);
      const allIds = match ? match[1].trim().split(/\s+/) : [];
      const ids = allIds.slice(-200).reverse();

      if (!ids.length) { await cmd("A9", "LOGOUT"); return []; }

      const messages: any[] = [];
      let tagNum = 4;
      for (let i = 0; i < ids.length; i += 50) {
        const range = ids.slice(i, i + 50).join(",");
        const tag = `A${tagNum++}`;
        const resp = await cmd(tag, `FETCH ${range} (UID FLAGS BODY[HEADER.FIELDS (FROM SUBJECT DATE)])`);
        for (const part of resp.split(/\* \d+ FETCH/)) {
          if (!part.trim()) continue;
          const u = part.match(/UID (\d+)/);
          if (u) {
            messages.push({
              uid: u[1],
              from: part.match(/From:\s*(.+)/i)?.[1]?.trim() || "Unknown",
              subject: part.match(/Subject:\s*(.+)/i)?.[1]?.trim() || "(No Subject)",
              date: part.match(/Date:\s*(.+)/i)?.[1]?.trim() || "",
              read: part.includes("\\Seen"),
            });
          }
        }
      }
      await cmd("A9", "LOGOUT");
      return messages;
    }

    if (action === "read" && uid) {
      const resp = await cmd("A5", `UID FETCH ${uid} (BODY[TEXT] BODY[HEADER])`);
      await cmd("A6", `UID STORE ${uid} +FLAGS (\\Seen)`);
      await cmd("A9", "LOGOUT");
      const hdr = resp.match(/BODY\[HEADER\] \{(\d+)\}\r\n([\s\S]*?)(?=BODY\[TEXT\]|\)$)/);
      const bod = resp.match(/BODY\[TEXT\] \{(\d+)\}\r\n([\s\S]*?)(?=\)$|\r\nA)/);
      return { uid, headers: hdr?.[2]?.trim() || "", body: bod?.[2]?.trim() || resp };
    }

    await cmd("A9", "LOGOUT");
    return null;
  } finally {
    try { conn.close(); } catch { /* */ }
  }
}

// ---------- SMTP ----------

async function smtpSend(cfg: Record<string, string>, to: string, subject: string, body: string) {
  const host = cfg.smtp_host || "";
  const port = parseInt(cfg.smtp_port || "587", 10);
  const user = cfg.smtp_username || "";
  const pass = cfg.smtp_password || "";
  const from = cfg.smtp_from || user;
  const encryption = cfg.smtp_encryption || "tls";

  if (!host || !user || !pass) throw new Error("SMTP not configured");

  const normalize = (s: string) => {
    const m = s.trim().match(/<([^>]+)>/);
    return (m?.[1] ?? s).replace(/^mailto:/i, "").trim().toLowerCase();
  };

  const toAddr = normalize(to);
  const fromAddr = normalize(from);
  const subj = subject.replace(/[\r\n]+/g, " ").trim();
  const msg = body.replace(/\r?\n/g, "\n").trim();

  if (!toAddr) throw new Error("Recipient is required");
  if (!subj) throw new Error("Subject is required");
  if (!msg) throw new Error("Message is required");

  const useTls = encryption === "ssl" || port === 465;
  let conn: Deno.Conn = useTls
    ? await Deno.connectTls({ hostname: host, port })
    : await Deno.connect({ hostname: host, port });

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  async function readResp(): Promise<string> {
    let r = "";
    const buf = new Uint8Array(8192);
    while (true) {
      const n = await conn.read(buf);
      if (!n) break;
      r += dec.decode(buf.subarray(0, n));
      const last = r.trim().split("\n").pop()?.trim() || "";
      if (/^\d{3}[ ]/.test(last) || /^\d{3}$/.test(last)) break;
      if (r.length > 4096) break;
    }
    return r;
  }

  async function send(c: string): Promise<string> {
    await conn.write(enc.encode(c + "\r\n"));
    return readResp();
  }

  try {
    await readResp();
    await send("EHLO localhost");

    if (!useTls && encryption === "tls") {
      await send("STARTTLS");
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: host });
      await send("EHLO localhost");
    }

    const authResp = await send(`AUTH PLAIN ${btoa(`\0${user}\0${pass}`)}`);
    if (!authResp.includes("235")) {
      await send("AUTH LOGIN");
      await send(btoa(user));
      const lr = await send(btoa(pass));
      if (!lr.includes("235")) throw new Error("SMTP auth failed");
    }

    const mfResp = await send(`MAIL FROM:<${fromAddr}>`);
    if (!mfResp.includes("250")) throw new Error("MAIL FROM rejected: " + mfResp.trim());

    const rcptResp = await send(`RCPT TO:<${toAddr}>`);
    if (!rcptResp.includes("250")) throw new Error("RCPT TO rejected: " + rcptResp.trim());

    const dataResp = await send("DATA");
    if (!dataResp.includes("354")) throw new Error("DATA rejected: " + dataResp.trim());

    const dotStuffed = msg.split(/\r?\n/).map(l => l.startsWith(".") ? `.${l}` : l).join("\r\n");
    const emailBody = [
      `Date: ${new Date().toUTCString()}`,
      `From: GiftCardVibe Support <${fromAddr}>`,
      `Reply-To: ${fromAddr}`,
      `To: ${toAddr}`,
      `Subject: ${subj}`,
      `Message-ID: <${crypto.randomUUID()}@${host}>`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: 8bit`,
      "",
      dotStuffed,
      "",
      "—",
      "GiftCardVibe Support",
    ].join("\r\n");

    // Send body + terminating dot as raw bytes (not via send() which adds extra \r\n)
    await conn.write(enc.encode(emailBody + "\r\n.\r\n"));
    const result = await readResp();

    await send("QUIT");
    return result;
  } finally {
    try { conn.close(); } catch { /* */ }
  }
}

// ---------- Handler ----------

Deno.serve(async (req) => {
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
    const { action, purpose, ...params } = await req.json();
    const cfg = await getMailConfig(svc);

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

      case "test-imap": {
        const c = await Deno.connectTls({ hostname: cfg.imap_host || "", port: parseInt(cfg.imap_port || "993", 10) });
        const buf = new Uint8Array(1024);
        const n = await c.read(buf);
        c.close();
        return json({ success: true, greeting: n ? new TextDecoder().decode(buf.subarray(0, n)).trim() : "" });
      }

      case "fetch-inbox":
        return json({ success: true, messages: await imapFetch(cfg, "list") });

      case "read-email":
        return json({ success: true, email: await imapFetch(cfg, "read", params.uid) });

      case "send-email": {
        const { to = "", subject = "", body = "" } = params;
        if (!to || !subject) return json({ error: "Missing to/subject" }, 400);
        // Override "from" based on purpose
        const fromOverride = resolveFrom(cfg, purpose);
        const cfgWithFrom = { ...cfg, smtp_from: fromOverride };
        return json({ success: true, result: await smtpSend(cfgWithFrom, to, subject, body) });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err: any) {
    console.error("[mail]", err.message);
    return json({ error: err.message || "Internal error" }, 500);
  }
});
