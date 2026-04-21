import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function replaceVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

function findTemplate(
  templates: any[],
  category: string,
  productIds: string[]
): any | null {
  const catTemplates = templates.filter((t: any) => (t.category || "post_purchase") === category);
  const productTemplate = catTemplates.find(
    (t: any) => !t.is_global && productIds.includes(t.product_id)
  );
  if (productTemplate) return productTemplate;
  return catTemplates.find((t: any) => t.is_global) || null;
}

function generatePassword(length = 12): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$";
  let pw = "";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) {
    pw += chars[arr[i] % chars.length];
  }
  return pw;
}

async function sendEmail(
  conn: Deno.Conn,
  mailCfg: Record<string, string>,
  siteName: string,
  toEmail: string,
  subject: string,
  htmlBody: string,
  fromOverride?: string
) {
  const read = async () => {
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    return new TextDecoder().decode(buf.subarray(0, n || 0));
  };
  const write = async (cmd: string) => {
    await conn.write(new TextEncoder().encode(cmd + "\r\n"));
    return await read();
  };

  await read();
  await write("EHLO localhost");
  const useSSL = mailCfg.smtp_encryption === "ssl";
  if (!useSSL && mailCfg.smtp_encryption === "tls") {
    await write("STARTTLS");
    await write("EHLO localhost");
  }

  const credentials = btoa(`\0${mailCfg.smtp_username}\0${mailCfg.smtp_password}`);
  await write(`AUTH PLAIN ${credentials}`);

  const fromAddr = fromOverride || mailCfg.from_orders || mailCfg.smtp_from || mailCfg.smtp_username;
  await write(`MAIL FROM:<${fromAddr}>`);
  await write(`RCPT TO:<${toEmail}>`);
  await write("DATA");

  const emailData = [
    `From: ${siteName} <${fromAddr}>`,
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    htmlBody,
    `.`,
  ].join("\r\n");

  await write(emailData);
  await write("QUIT");
}

function wrapInEmailLayout(siteName: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="background:hsl(210,100%,45%);padding:24px 32px;">
        <h1 style="color:#fff;margin:0;font-size:22px;">${siteName}</h1>
      </div>
      <div style="padding:32px;">
        ${bodyContent}
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#aaa;margin-top:16px;">© ${new Date().getFullYear()} ${siteName}</p>
  </div>
</body>
</html>`;
}

Deno.serve(withLogging("send-order-confirmation", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const order_id = body.order_id;
    const emailType = body.type || "order_confirmation";

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch order, items, and site settings
    const [{ data: order }, { data: items }, { data: settingsRows }] = await Promise.all([
      supabase.from("orders").select("*").eq("id", order_id).single(),
      supabase.from("order_items").select("*").eq("id", order_id), // wait fix this: select * from order_items where order_id = ...
      supabase.from("site_settings").select("key, value")
    ]);
    
    // Correction for items select
    const { data: realItems } = await supabase.from("order_items").select("*").eq("order_id", order_id);

    if (!order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: corsHeaders });

    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => { settings[r.key] = r.value; });

    const siteName = settings.site_name || "GiftCardVibe";
    const currencySymbol = settings.currency_symbol || "$";

    // Detect Origin for links
    let origin = body.origin || settings.site_url || "";
    if (!origin) {
      const referer = req.headers.get("referer") || req.headers.get("origin");
      if (referer) {
        try { origin = new URL(referer).origin; } catch(e) {}
      }
    }

    // Fetch templates and config
    const productIds = (realItems || []).map((i: any) => i.product_id).filter(Boolean);
    const { data: allTemplates } = await supabase.from("product_email_templates").select("*").eq("active", true);
    const { data: mailRows } = await supabase.from("mail_config").select("key, value");
    const mailCfg: Record<string, string> = {};
    (mailRows || []).forEach((r: any) => { mailCfg[r.key] = r.value; });

    if (!mailCfg.smtp_host || !mailCfg.smtp_username || !mailCfg.smtp_password) {
      return new Response(JSON.stringify({ success: false, reason: "SMTP missing" }), { headers: corsHeaders });
    }

    // Auto-create account logic
    let autoCreatedPassword = "";
    const { data: existing } = await supabase.auth.admin.listUsers();
    const user = existing?.users?.find(u => u.email?.toLowerCase() === order.customer_email.toLowerCase());
    if (!user && order.customer_email) {
      autoCreatedPassword = generatePassword();
      await supabase.auth.admin.createUser({
        email: order.customer_email,
        password: autoCreatedPassword,
        email_confirm: true,
        user_metadata: { display_name: order.customer_name },
      });
    }

    // Skip redundant confirmations for digital
    const hasPostPurchaseTemplate = (allTemplates || []).some(t => t.category === "post_purchase" && productIds.includes(t.product_id));
    if (emailType === "order_confirmation" && hasPostPurchaseTemplate) {
      return new Response(JSON.stringify({ success: true, skipped: true }), { headers: corsHeaders });
    }

    // Fetch deliveries and files
    const [{ data: deliveries }, { data: files }] = await Promise.all([
      supabase.from("order_deliveries").select("*").eq("order_id", order_id),
      supabase.from("product_files").select("*").in("product_id", productIds)
    ]);

    // Build Content Blocks
    let productLinksOnly = "";
    const links = (files || []).map(f => {
      const isExt = f.file_type === "link" || f.file_url.startsWith("http");
      const url = isExt ? f.file_url : `https://${supabaseUrl.split('//')[1].split('.')[0]}.supabase.co/functions/v1/secure-download?token=CHECK_ACCOUNT`; 
      productLinksOnly += `${f.filename}: ${url}\n`;
      return `<li><strong>${f.filename}</strong>: <a href="${url}">${isExt ? 'Open Link' : 'Download'}</a></li>`;
    }).join("");

    const productContentHtml = links ? `
      <div style="margin-top:20px;padding:16px;background:#f0fdf4;border-radius:8px;border:1px solid #d1fae5;">
        <h4 style="margin:0 0 10px;font-size:14px;color:#166534;">🎁 Digital Content:</h4>
        <ul style="margin:0;padding:0 0 0 20px;font-size:14px;color:#166534;line-height:1.6;">${links}</ul>
      </div>` : "";

    let productEmailSections = "";
    const processed = new Set();
    for (const item of realItems || []) {
      if (!item.product_id || processed.has(item.product_id)) continue;
      processed.add(item.product_id);
      const t = findTemplate(allTemplates || [], "post_purchase", [item.product_id]);
      if (t) {
        const v = { customer_name: order.customer_name, product_name: item.product_name, order_number: order.order_number };
        productEmailSections += `<div style="background:#f0f7ff;border-radius:8px;padding:20px;margin-top:20px;border-left:4px solid #1d4ed8;">
          <h3 style="margin:0 0 8px;font-size:16px;color:#1a1a2e;">${replaceVars(t.subject, v)}</h3>
          <div style="font-size:14px;color:#333;line-height:1.6;">${replaceVars(t.body_html, v)}</div>
        </div>`;
      }
    }

    const templateVars: Record<string, string> = {
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      order_number: order.order_number,
      order_total: `${currencySymbol}${Number(order.total).toFixed(2)}`,
      payment_method: order.payment_method,
      transaction_id: order.notes?.match(/trxID:(\S+)/)?.[1] || order.bkash_response?.trxID || "",
      product_name: (realItems || []).map(i => i.product_name).join(", "),
      product_content: productContentHtml,
      product_sections: productEmailSections,
      product_links: productLinksOnly,
      order_link: origin ? `${origin}/orders/${order.id}` : "",
      password: autoCreatedPassword || "",
      login_url: origin ? `${origin}/login` : "",
    };

    const categoryTemplate = findTemplate(allTemplates || [], emailType, productIds);
    let emailSubject: string;
    let emailHtml: string;

    if (categoryTemplate) {
      emailSubject = replaceVars(categoryTemplate.subject, templateVars);
      let body = replaceVars(categoryTemplate.body_html, templateVars);
      if (emailType === "payment_verified" || emailType === "order_confirmation") {
        if (!categoryTemplate.body_html.includes("{{product_sections}}")) body += productEmailSections;
        if (!categoryTemplate.body_html.includes("{{product_content}}") && productContentHtml) body += productContentHtml;
      }
      emailHtml = wrapInEmailLayout(siteName, body);
    } else {
      // Default templates
      const table = `<table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr style="background:#f8f9fa;"><th style="padding:8px;text-align:left;">Item</th><th style="padding:8px;text-align:right;">Total</th></tr>
        ${realItems?.map(i => `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${i.product_name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${currencySymbol}${Number(i.total).toFixed(2)}</td></tr>`).join("")}
      </table>`;

      let body = "";
      if (emailType === "payment_verified") {
        emailSubject = `Payment Confirmed - ${order.order_number}`;
        // If we have sections, hide the giant header to avoid redundancy
        const header = productEmailSections ? 
          `<div style="background:#ecfdf5;padding:8px 16px;border-radius:4px;color:#065f46;font-size:12px;margin-bottom:16px;">Status: Payment Verified ✅</div>` : 
          `<h2 style="margin:0 0 16px;font-size:20px;color:#1a1a2e;">Payment Verified! ✅</h2>`;

        body = `${header}
          <p style="color:#666;font-size:14px;margin-bottom:16px;">Hi ${order.customer_name}, your payment of <strong>${templateVars.order_total}</strong> has been confirmed.</p>
          ${table}${productContentHtml}${productEmailSections}`;
      } else {
        emailSubject = `Order Confirmation - ${order.order_number}`;
        body = `<h2 style="margin:0 0 16px;font-size:20px;color:#1a1a2e;">Order Received!</h2>
          <p style="color:#666;font-size:14px;margin-bottom:16px;">Hi ${order.customer_name}, thanks for your order.</p>
          ${table}${productContentHtml}${productEmailSections}`;
      }
      
      if (templateVars.order_link) body += `<p style="margin-top:20px;"><a href="${templateVars.order_link}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">View Order Details</a></p>`;
      emailHtml = wrapInEmailLayout(siteName, body);
    }

    const conn = useSSL ? await Deno.connectTls({ hostname: mailCfg.smtp_host, port: parseInt(mailCfg.smtp_port) }) : await Deno.connect({ hostname: mailCfg.smtp_host, port: parseInt(mailCfg.smtp_port) });
    await sendEmail(conn, mailCfg, siteName, order.customer_email, emailSubject, emailHtml);
    conn.close();
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
}));
