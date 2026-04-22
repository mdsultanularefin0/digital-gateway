// Shared SMTP sender. Supports STARTTLS, AUTH PLAIN→LOGIN fallback,
// response-code checks, dot-stuffing, and HTML or text bodies.

import type { MailConfig } from "./mail-config.ts";

export interface SendOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;       // overrides cfg.smtp_from
  fromName?: string;   // display name for From header
  replyTo?: string;
}

function normalizeAddr(s: string): string {
  const m = s.trim().match(/<([^>]+)>/);
  return (m?.[1] ?? s).replace(/^mailto:/i, "").trim().toLowerCase();
}

export async function smtpSend(cfg: MailConfig, opts: SendOptions): Promise<string> {
  const host = cfg.smtp_host || "";
  const port = parseInt(cfg.smtp_port || "587", 10);
  const user = cfg.smtp_username || "";
  const pass = cfg.smtp_password || "";
  const from = opts.from || cfg.smtp_from || user;
  const encryption = cfg.smtp_encryption || "tls";

  if (!host || !user || !pass) throw new Error("SMTP not configured");

  const toAddr = normalizeAddr(opts.to);
  const fromAddr = normalizeAddr(from);
  const subj = opts.subject.replace(/[\r\n]+/g, " ").trim();
  const bodyRaw = (opts.html ?? opts.text ?? "").replace(/\r?\n/g, "\n").trim();
  const isHtml = !!opts.html;

  if (!toAddr) throw new Error("Recipient is required");
  if (!subj) throw new Error("Subject is required");
  if (!bodyRaw) throw new Error("Message is required");

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
    if (!rcptResp.includes("250") && !rcptResp.includes("251")) {
      throw new Error("RCPT TO rejected: " + rcptResp.trim());
    }

    const dataResp = await send("DATA");
    if (!dataResp.includes("354")) throw new Error("DATA rejected: " + dataResp.trim());

    const dotStuffed = bodyRaw.split(/\r?\n/).map(l => l.startsWith(".") ? `.${l}` : l).join("\r\n");
    const fromHeader = opts.fromName ? `${opts.fromName} <${fromAddr}>` : `<${fromAddr}>`;
    const headers = [
      `Date: ${new Date().toUTCString()}`,
      `From: ${fromHeader}`,
      `Reply-To: ${opts.replyTo || fromAddr}`,
      `To: ${toAddr}`,
      `Subject: ${subj}`,
      `Message-ID: <${crypto.randomUUID()}@${host}>`,
      `MIME-Version: 1.0`,
      `Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset=utf-8`,
      `Content-Transfer-Encoding: 8bit`,
    ].join("\r\n");

    const emailBody = headers + "\r\n\r\n" + dotStuffed;

    // Send body + terminating dot as raw bytes
    await conn.write(enc.encode(emailBody + "\r\n.\r\n"));
    const result = await readResp();

    await send("QUIT");
    return result;
  } finally {
    try { conn.close(); } catch { /* */ }
  }
}
