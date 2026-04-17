import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  // Product-specific first
  const productTemplate = catTemplates.find(
    (t: any) => !t.is_global && productIds.includes(t.product_id)
  );
  if (productTemplate) return productTemplate;
  // Global fallback
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const order_id = body.order_id;
    const emailType = body.type || "order_confirmation"; // order_confirmation | payment_verified | account_created

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

    // Fetch order items
    const { data: items } = await supabase
      .from("order_items")
      .select("product_name, tier_label, quantity, unit_price, total, product_id")
      .eq("order_id", order_id);

    // Fetch site settings
    const { data: settingsRows } = await supabase.from("site_settings").select("key, value");
    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => { settings[r.key] = r.value; });

    const siteName = settings.site_name || "GiftCardVibe";
    const currencySymbol = settings.currency_symbol || "$";

    // Fetch all active templates
    const productIds = (items || []).map((i: any) => i.product_id).filter(Boolean);
    const { data: allTemplates } = await supabase
      .from("product_email_templates")
      .select("*")
      .eq("active", true);

    // Load SMTP config
    const { data: mailRows } = await supabase.from("mail_config").select("key, value");
    const mailCfg: Record<string, string> = {};
    (mailRows || []).forEach((r: any) => { mailCfg[r.key] = r.value; });

    if (!mailCfg.smtp_host || !mailCfg.smtp_username || !mailCfg.smtp_password) {
      return new Response(JSON.stringify({ success: false, reason: "SMTP not configured" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const smtpPort = parseInt(mailCfg.smtp_port || "587");
    const useSSL = mailCfg.smtp_encryption === "ssl";

    // ── AUTO-CREATE USER ACCOUNT ──
    if (emailType === "order_confirmation" || emailType === "account_created") {
      // Check if user already exists by email
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const userExists = existingUsers?.users?.some(
        (u: any) => u.email?.toLowerCase() === order.customer_email.toLowerCase()
      );

      if (!userExists && order.customer_email) {
        const password = generatePassword();
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email: order.customer_email,
          password,
          email_confirm: true,
          user_metadata: { display_name: order.customer_name },
        });

        if (!createErr && newUser?.user) {
          // Send account created email
          const loginUrl = body.origin ? `${body.origin}/login` : settings.site_url || "";
          const accountVars: Record<string, string> = {
            customer_name: order.customer_name,
            customer_email: order.customer_email,
            password,
            login_url: loginUrl,
            order_number: order.order_number,
          };

          const accountTemplate = findTemplate(allTemplates || [], "account_created", productIds);

          let accountHtml: string;
          if (accountTemplate) {
            accountHtml = wrapInEmailLayout(siteName, replaceVars(accountTemplate.body_html, accountVars));
          } else {
            // Default account created email
            accountHtml = wrapInEmailLayout(siteName, `
              <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a2e;">Your Account Has Been Created!</h2>
              <p style="color:#666;margin:0 0 24px;">Hi ${order.customer_name}, we've created an account for you so you can track your orders and access your purchases.</p>
              <div style="background:#f8f9fa;border-radius:6px;padding:16px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:13px;color:#888;">Login Credentials</p>
                <p style="margin:0 0 4px;font-size:14px;"><strong>Email:</strong> ${order.customer_email}</p>
                <p style="margin:0;font-size:14px;"><strong>Password:</strong> ${password}</p>
              </div>
              <p style="color:#666;font-size:14px;">Please change your password after logging in for the first time.</p>
              ${loginUrl ? `<p style="margin:16px 0 0;"><a href="${loginUrl}" style="display:inline-block;background:hsl(210,100%,45%);color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;">Log In Now</a></p>` : ""}
            `);
          }

          // Send account email
          try {
            const conn = useSSL
              ? await Deno.connectTls({ hostname: mailCfg.smtp_host, port: smtpPort })
              : await Deno.connect({ hostname: mailCfg.smtp_host, port: smtpPort });
            await sendEmail(
              conn, mailCfg, siteName, order.customer_email,
              accountTemplate ? replaceVars(accountTemplate.subject, accountVars) : `Your account at ${siteName}`,
              accountHtml
            );
            conn.close();
          } catch (e) {
            console.error("Failed to send account email:", e);
          }
        }
      }

      // If only account_created was requested, return here
      if (emailType === "account_created") {
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ── BUILD ORDER EMAIL ──
    const templateVars: Record<string, string> = {
      customer_name: order.customer_name,
      order_number: order.order_number,
      product_name: (items || []).map((i: any) => i.product_name).join(", "),
      order_total: `${currencySymbol}${Number(order.total).toFixed(2)}`,
      payment_method: order.payment_method,
      transaction_id: order.notes?.match(/trxID:(\S+)/)?.[1] || "",
    };

    // Check for category-specific custom template
    const categoryTemplate = findTemplate(allTemplates || [], emailType, productIds);

    let emailSubject: string;
    let emailHtml: string;

    if (categoryTemplate) {
      emailSubject = replaceVars(categoryTemplate.subject, templateVars);
      emailHtml = wrapInEmailLayout(siteName, replaceVars(categoryTemplate.body_html, templateVars));
    } else {
      // Default templates by type
      const itemsHtml = (items || []).map((item: any) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.product_name}${item.tier_label ? ` (${item.tier_label})` : ''}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${currencySymbol}${Number(item.total).toFixed(2)}</td>
        </tr>
      `).join('');

      const orderTable = `
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead><tr style="background:#f8f9fa;">
            <th style="padding:8px 12px;text-align:left;">Item</th>
            <th style="padding:8px 12px;text-align:center;">Qty</th>
            <th style="padding:8px 12px;text-align:right;">Total</th>
          </tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="margin-top:16px;padding-top:16px;border-top:2px solid #eee;">
          ${Number(order.discount) > 0 ? `<p style="margin:4px 0;font-size:14px;color:#22c55e;">Discount: -${currencySymbol}${Number(order.discount).toFixed(2)}</p>` : ''}
          <p style="margin:4px 0;font-size:18px;font-weight:bold;color:#1a1a2e;">Total: ${currencySymbol}${Number(order.total).toFixed(2)}</p>
        </div>`;

      // Build post-purchase product sections
      let productEmailSections = "";
      const processedProducts = new Set<string>();
      for (const item of items || []) {
        if (!item.product_id || processedProducts.has(item.product_id)) continue;
        processedProducts.add(item.product_id);
        const template = findTemplate(allTemplates || [], "post_purchase", [item.product_id]);
        if (template) {
          const vars = { ...templateVars, product_name: item.product_name };
          productEmailSections += `
            <div style="background:#f0f7ff;border-radius:8px;padding:20px;margin-top:20px;border-left:4px solid hsl(210,100%,45%);">
              <h3 style="margin:0 0 8px;font-size:16px;color:#1a1a2e;">${replaceVars(template.subject, vars)}</h3>
              <div style="font-size:14px;color:#333;line-height:1.6;">${replaceVars(template.body_html, vars)}</div>
            </div>`;
        }
      }

      if (emailType === "payment_verified") {
        emailSubject = `Payment Confirmed - ${order.order_number}`;
        emailHtml = wrapInEmailLayout(siteName, `
          <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a2e;">Payment Verified! ✅</h2>
          <p style="color:#666;margin:0 0 24px;">Great news, ${order.customer_name}! Your payment for order <strong>${order.order_number}</strong> has been confirmed.</p>
          <div style="background:#f0fdf4;border-radius:6px;padding:16px;margin-bottom:24px;border-left:4px solid #22c55e;">
            <p style="margin:0;font-size:14px;color:#166534;">Amount: <strong>${currencySymbol}${Number(order.total).toFixed(2)}</strong></p>
            ${templateVars.transaction_id ? `<p style="margin:4px 0 0;font-size:14px;color:#166534;">Transaction ID: <strong>${templateVars.transaction_id}</strong></p>` : ""}
          </div>
          ${orderTable}
          ${productEmailSections}
          <p style="margin:24px 0 0;font-size:13px;color:#888;">If you have any questions, reply to this email or contact our support team.</p>
        `);
      } else {
        emailSubject = `Order Confirmation - ${order.order_number}`;
        emailHtml = wrapInEmailLayout(siteName, `
          <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a2e;">Order Confirmed!</h2>
          <p style="color:#666;margin:0 0 24px;">Thank you for your order, ${order.customer_name}.</p>
          <div style="background:#f8f9fa;border-radius:6px;padding:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:13px;color:#888;">Order Number</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:bold;color:#1a1a2e;">${order.order_number}</p>
          </div>
          ${orderTable}
          ${productEmailSections}
          <p style="margin:24px 0 0;font-size:13px;color:#888;">If you have any questions, reply to this email or contact our support team.</p>
        `);
      }
    }

    // Send the order email
    const conn = useSSL
      ? await Deno.connectTls({ hostname: mailCfg.smtp_host, port: smtpPort })
      : await Deno.connect({ hostname: mailCfg.smtp_host, port: smtpPort });
    await sendEmail(conn, mailCfg, siteName, order.customer_email, emailSubject, emailHtml);
    conn.close();

    // ── TRIGGER SMS (best-effort, non-blocking) ──
    try {
      const smsEnabled =
        (emailType === "order_confirmation" && settings.sms_on_order === "true") ||
        (emailType === "payment_verified" && settings.sms_on_payment_verified === "true");
      if (smsEnabled && order.customer_phone) {
        const fnUrl = `${supabaseUrl}/functions/v1/send-sms`;
        fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            order_id: order.id,
            template: emailType === "payment_verified" ? "payment_verified" : "order_confirmation",
            type: "transactional",
          }),
        }).catch((e) => console.error("SMS trigger failed:", e));
      }
    } catch (smsErr) {
      console.error("SMS trigger failed:", smsErr);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("send-order-confirmation error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
