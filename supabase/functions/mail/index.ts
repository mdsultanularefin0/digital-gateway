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
  const { data, error } = await supabase
    .from("mail_config")
    .select("key, value");
  if (error) throw new Error("Failed to load mail config: " + error.message);
  const cfg: Record<string, string> = {};
  (data ?? []).forEach((r: { key: string; value: string }) => {
    cfg[r.key] = r.value;
  });
  return cfg;
}

function normalizeEmail(input: string): string {
  const trimmed = input.trim();
  const angleMatch = trimmed.match(/<([^>]+)>/);
  return (angleMatch?.[1] ?? trimmed).replace(/^mailto:/i, "").trim().toLowerCase();
}

function validateOutboundEmail(to: string, subject: string, body: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new Error("Invalid recipient email");
  }

  if (subject.length < 4) {
    throw new Error("Subject is too short; please use at least 4 characters");
  }

  if (body.length < 20) {
    throw new Error("Message is too short; please provide more details");
  }

  const lettersOnly = body.replace(/[^a-z]/gi, "");
  if (lettersOnly.length >= 20) {
    const vowels = (lettersOnly.match(/[aeiou]/gi) || []).length;
    const ratio = vowels / lettersOnly.length;
    if (ratio < 0.22) {
      throw new Error("Message looks spam-like; please write a clearer sentence");
    }
  }
}

function dotStuff(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

// Minimal SMTP client over raw TCP (Deno)
async function smtpSend(cfg: Record<string, string>, to: string, subject: string, body: string) {
  const host = cfg.smtp_host || "";
  const port = parseInt(cfg.smtp_port || "587", 10);
  const user = cfg.smtp_username || "";
  const pass = cfg.smtp_password || "";
  const encryption = cfg.smtp_encryption || "tls";
  const from = cfg.smtp_from || user;

  if (!host || !user || !pass) throw new Error("SMTP not configured");

  const normalizedTo = normalizeEmail(to);
  const normalizedFrom = normalizeEmail(from);
  const safeSubject = subject.replace(/[\r\n]+/g, " ").trim();
  const safeBody = body.replace(/\r?\n/g, "\n").trim();
  validateOutboundEmail(normalizedTo, safeSubject, safeBody);

  const useTls = encryption === "ssl" || port === 465;
  let conn: Deno.Conn;

  if (useTls) {
    conn = await Deno.connectTls({ hostname: host, port });
  } else {
    conn = await Deno.connect({ hostname: host, port });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    let result = "";
    const buf = new Uint8Array(8192);
    while (true) {
      const n = await conn.read(buf);
      if (!n) break;
      result += decoder.decode(buf.subarray(0, n));
      const lines = result.trim().split("\n");
      const lastLine = lines[lines.length - 1].trim();
      if (/^\d{3} /.test(lastLine) || /^\d{3}$/.test(lastLine)) break;
      if (result.length > 4096) break;
    }
    return result;
  }

  async function send(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + "\r\n"));
    return await readResponse();
  }

  try {
    await readResponse();
    await send("EHLO localhost");

    if (!useTls && encryption === "tls") {
      await send("STARTTLS");
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: host });
      await send("EHLO localhost");
    }

    const authPlain = btoa(`\0${user}\0${pass}`);
    const authResp = await send(`AUTH PLAIN ${authPlain}`);
    if (!authResp.includes("235")) {
      await send("AUTH LOGIN");
      await send(btoa(user));
      const loginResp = await send(btoa(pass));
      if (!loginResp.includes("235")) throw new Error("SMTP auth failed: " + loginResp.trim());
    }

    const mailFromResp = await send(`MAIL FROM:<${normalizedFrom}>`);
    if (!mailFromResp.includes("250")) throw new Error("MAIL FROM failed: " + mailFromResp.trim());

    const rcptResp = await send(`RCPT TO:<${normalizedTo}>`);
    if (!rcptResp.includes("250")) throw new Error("RCPT TO failed: " + rcptResp.trim());

    await send("DATA");

    const now = new Date();
    const messageId = `<${crypto.randomUUID()}@${host}>`;
    const plainBody = dotStuff(`${safeBody}\r\n\r\n—\r\nGiftCardVibe Support`);
    const msg = [
      `Date: ${now.toUTCString()}`,
      `From: GiftCardVibe Support <${normalizedFrom}>`,
      `Reply-To: ${normalizedFrom}`,
      `To: ${normalizedTo}`,
      `Subject: ${safeSubject}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: 8bit`,
      `X-Mailer: GiftCardVibe Support`,
      "",
      plainBody,
      ".",
    ].join("\r\n");

    const dataResp = await send(msg);
    await send("QUIT");

    return dataResp;
  } finally {
    try { conn.close(); } catch { /* ignore */ }
  }
}

// Minimal IMAP fetch (list recent messages)
async function imapFetch(cfg: Record<string, string>, action: string, uid?: string) {
  const host = cfg.imap_host || "";
  const port = parseInt(cfg.imap_port || "993", 10);
  const user = cfg.imap_username || cfg.smtp_username || "";
  const pass = cfg.imap_password || cfg.smtp_password || "";

  if (!host || !user || !pass) throw new Error("IMAP not configured");

  const conn = await Deno.connectTls({ hostname: host, port });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let buffer = "";

  async function readResponse(tag: string): Promise<string> {
    const maxBytes = 512 * 1024; // 512KB max
    while (true) {
      const buf = new Uint8Array(32768);
      const n = await conn.read(buf);
      if (!n) break;
      buffer += decoder.decode(buf.subarray(0, n));
      if (buffer.includes(tag + " OK") || buffer.includes(tag + " NO") || buffer.includes(tag + " BAD")) break;
      if (buffer.length > maxBytes) break;
    }
    const result = buffer;
    buffer = "";
    return result;
  }

  async function send(tag: string, cmd: string): Promise<string> {
    await conn.write(encoder.encode(`${tag} ${cmd}\r\n`));
    return await readResponse(tag);
  }

  try {
    // Read greeting
    const buf = new Uint8Array(4096);
    await conn.read(buf);

    // Login
    const loginResp = await send("A1", `LOGIN "${user}" "${pass}"`);
    if (loginResp.includes("A1 NO") || loginResp.includes("A1 BAD")) {
      throw new Error("IMAP login failed");
    }

    // Select INBOX
    await send("A2", "SELECT INBOX");

    if (action === "list") {
      // Search recent messages
      const searchResp = await send("A3", "SEARCH ALL");
      const match = searchResp.match(/\* SEARCH ([\d\s]+)/);
      const ids = match ? match[1].trim().split(/\s+/).slice(-50).reverse() : [];

      if (ids.length === 0) {
        await send("A9", "LOGOUT");
        return [];
      }

      const range = ids.join(",");
      const fetchResp = await send("A4", `FETCH ${range} (UID FLAGS BODY[HEADER.FIELDS (FROM SUBJECT DATE)])`);

      // Parse fetch response into message list
      const messages: any[] = [];
      const parts = fetchResp.split(/\* \d+ FETCH/);
      for (const part of parts) {
        if (!part.trim()) continue;
        const uidMatch = part.match(/UID (\d+)/);
        const fromMatch = part.match(/From:\s*(.+)/i);
        const subjectMatch = part.match(/Subject:\s*(.+)/i);
        const dateMatch = part.match(/Date:\s*(.+)/i);
        const seenMatch = part.includes("\\Seen");
        if (uidMatch) {
          messages.push({
            uid: uidMatch[1],
            from: fromMatch?.[1]?.trim() || "Unknown",
            subject: subjectMatch?.[1]?.trim() || "(No Subject)",
            date: dateMatch?.[1]?.trim() || "",
            read: seenMatch,
          });
        }
      }

      await send("A9", "LOGOUT");
      return messages;
    }

    if (action === "read" && uid) {
      const fetchResp = await send("A5", `UID FETCH ${uid} (BODY[TEXT] BODY[HEADER])`);
      // Mark as seen
      await send("A6", `UID STORE ${uid} +FLAGS (\\Seen)`);
      await send("A9", "LOGOUT");

      // Extract body text
      const headerMatch = fetchResp.match(/BODY\[HEADER\] \{(\d+)\}\r\n([\s\S]*?)(?=BODY\[TEXT\]|\)$)/);
      const bodyMatch = fetchResp.match(/BODY\[TEXT\] \{(\d+)\}\r\n([\s\S]*?)(?=\)$|\r\nA)/);

      return {
        uid,
        headers: headerMatch?.[2]?.trim() || "",
        body: bodyMatch?.[2]?.trim() || fetchResp,
      };
    }

    await send("A9", "LOGOUT");
    return null;
  } finally {
    try { conn.close(); } catch { /* ignore */ }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    // Check admin role
    const userId = claimsData.claims.sub as string;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) return json({ error: "Forbidden" }, 403);

    const { action, ...params } = await req.json();
    const cfg = await getMailConfig(serviceClient);

    switch (action) {
      case "test-smtp": {
        const host = cfg.smtp_host || "";
        const port = parseInt(cfg.smtp_port || "587", 10);
        const encryption = cfg.smtp_encryption || "tls";
        const useTls = encryption === "ssl" || port === 465;

        let conn: Deno.Conn;
        if (useTls) {
          conn = await Deno.connectTls({ hostname: host, port });
        } else {
          conn = await Deno.connect({ hostname: host, port });
        }

        const buf = new Uint8Array(1024);
        const n = await conn.read(buf);
        const greeting = n ? new TextDecoder().decode(buf.subarray(0, n)) : "";
        conn.close();

        return json({ success: true, greeting: greeting.trim() });
      }

      case "test-imap": {
        const host = cfg.imap_host || "";
        const port = parseInt(cfg.imap_port || "993", 10);
        const conn = await Deno.connectTls({ hostname: host, port });
        const buf = new Uint8Array(1024);
        const n = await conn.read(buf);
        const greeting = n ? new TextDecoder().decode(buf.subarray(0, n)) : "";
        conn.close();

        return json({ success: true, greeting: greeting.trim() });
      }

      case "fetch-inbox": {
        const messages = await imapFetch(cfg, "list");
        return json({ success: true, messages });
      }

      case "read-email": {
        const email = await imapFetch(cfg, "read", params.uid);
        return json({ success: true, email });
      }

      case "send-email": {
        const to = String(params.to || "").trim();
        const subject = String(params.subject || "").trim();
        const body = String(params.body || "").trim();
        if (!to || !subject) return json({ error: "Missing to/subject" }, 400);
        const result = await smtpSend(cfg, to, subject, body);
        return json({ success: true, result });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err: any) {
    return json({ error: err.message || "Internal error" }, 500);
  }
});
