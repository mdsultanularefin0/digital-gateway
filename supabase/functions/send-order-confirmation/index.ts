import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function replaceVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: corsHeaders });
    }

    // Fetch order items with product_id
    const { data: items } = await supabase
      .from("order_items")
      .select("product_name, tier_label, quantity, unit_price, total, product_id")
      .eq("order_id", order_id);

    // Fetch site settings for branding
    const { data: settingsRows } = await supabase.from("site_settings").select("key, value");
    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => { settings[r.key] = r.value; });

    const siteName = settings.site_name || "GiftCardVibe";
    const currencySymbol = settings.currency_symbol || "$";

    // Fetch product-specific and global email templates
    const productIds = (items || []).map((i: any) => i.product_id).filter(Boolean);
    let productTemplates: any[] = [];
    let globalTemplates: any[] = [];

    const { data: allTemplates } = await supabase
      .from("product_email_templates")
      .select("*")
      .eq("active", true);

    if (allTemplates) {
      globalTemplates = allTemplates.filter((t: any) => t.is_global);
      productTemplates = allTemplates.filter((t: any) => !t.is_global && productIds.includes(t.product_id));
    }

    // Template variables
    const templateVars: Record<string, string> = {
      customer_name: order.customer_name,
      order_number: order.order_number,
      product_name: (items || []).map((i: any) => i.product_name).join(", "),
    };

    // Build product-specific email sections
    let productEmailSections = "";
    const processedProducts = new Set<string>();

    for (const item of items || []) {
      if (!item.product_id || processedProducts.has(item.product_id)) continue;
      processedProducts.add(item.product_id);

      // Find template: product-specific first, then global fallback
      const template = productTemplates.find((t: any) => t.product_id === item.product_id)
        || (globalTemplates.length > 0 ? globalTemplates[0] : null);

      if (template) {
        const vars = { ...templateVars, product_name: item.product_name };
        productEmailSections += `
          <div style="background:#f0f7ff;border-radius:8px;padding:20px;margin-top:20px;border-left:4px solid hsl(210,100%,45%);">
            <h3 style="margin:0 0 8px;font-size:16px;color:#1a1a2e;">${replaceVars(template.subject, vars)}</h3>
            <div style="font-size:14px;color:#333;line-height:1.6;">${replaceVars(template.body_html, vars)}</div>
          </div>`;
      }
    }

    // Build HTML email
    const itemsHtml = (items || []).map((item: any) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.product_name}${item.tier_label ? ` (${item.tier_label})` : ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${currencySymbol}${Number(item.total).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <div style="background:hsl(210,100%,45%);padding:24px 32px;">
            <h1 style="color:#fff;margin:0;font-size:22px;">${siteName}</h1>
          </div>
          <div style="padding:32px;">
            <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a2e;">Order Confirmed!</h2>
            <p style="color:#666;margin:0 0 24px;">Thank you for your order, ${order.customer_name}.</p>
            <div style="background:#f8f9fa;border-radius:6px;padding:16px;margin-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#888;">Order Number</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:bold;color:#1a1a2e;">${order.order_number}</p>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <thead>
                <tr style="background:#f8f9fa;">
                  <th style="padding:8px 12px;text-align:left;">Item</th>
                  <th style="padding:8px 12px;text-align:center;">Qty</th>
                  <th style="padding:8px 12px;text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <div style="margin-top:16px;padding-top:16px;border-top:2px solid #eee;">
              ${Number(order.discount) > 0 ? `<p style="margin:4px 0;font-size:14px;color:#22c55e;">Discount: -${currencySymbol}${Number(order.discount).toFixed(2)}</p>` : ''}
              <p style="margin:4px 0;font-size:18px;font-weight:bold;color:#1a1a2e;">Total: ${currencySymbol}${Number(order.total).toFixed(2)}</p>
            </div>
            ${productEmailSections}
            <p style="margin:24px 0 0;font-size:13px;color:#888;">If you have any questions, reply to this email or contact our support team.</p>
          </div>
        </div>
        <p style="text-align:center;font-size:12px;color:#aaa;margin-top:16px;">© ${new Date().getFullYear()} ${siteName}</p>
      </div>
    </body>
    </html>`;

    // Load SMTP config from mail_config
    const { data: mailRows } = await supabase.from("mail_config").select("key, value");
    const mailCfg: Record<string, string> = {};
    (mailRows || []).forEach((r: any) => { mailCfg[r.key] = r.value; });

    if (mailCfg.smtp_host && mailCfg.smtp_username && mailCfg.smtp_password) {
      const smtpPort = parseInt(mailCfg.smtp_port || "587");
      const useSSL = mailCfg.smtp_encryption === "ssl";
      const conn = useSSL
        ? await Deno.connectTls({ hostname: mailCfg.smtp_host, port: smtpPort })
        : await Deno.connect({ hostname: mailCfg.smtp_host, port: smtpPort });

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
      if (!useSSL && mailCfg.smtp_encryption === "tls") {
        await write("STARTTLS");
        await write("EHLO localhost");
      }
      
      const credentials = btoa(`\0${mailCfg.smtp_username}\0${mailCfg.smtp_password}`);
      await write(`AUTH PLAIN ${credentials}`);
      
      const fromAddr = mailCfg.from_orders || mailCfg.smtp_from || mailCfg.smtp_username;
      await write(`MAIL FROM:<${fromAddr}>`);
      await write(`RCPT TO:<${order.customer_email}>`);
      await write("DATA");

      const emailData = [
        `From: ${siteName} <${fromAddr}>`,
        `To: ${order.customer_email}`,
        `Subject: Order Confirmation - ${order.order_number}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        html,
        `.`,
      ].join("\r\n");

      await write(emailData);
      await write("QUIT");
      conn.close();
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
