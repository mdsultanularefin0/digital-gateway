import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../_shared/logger.ts";
import { getMailConfig, resolveFrom } from "../_shared/mail-config.ts";
import { smtpSend } from "../_shared/smtp.ts";
import { logEmail, recentlySent } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function replaceVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

function generatePassword(length = 12): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$";
  let pw = "";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) pw += chars[arr[i] % chars.length];
  return pw;
}

function wrapInEmailLayout(siteName: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="background:hsl(210,100%,45%);padding:24px 32px;">
        <h1 style="color:#fff;margin:0;font-size:22px;">${siteName}</h1>
      </div>
      <div style="padding:32px;">${bodyContent}</div>
    </div>
    <p style="text-align:center;font-size:12px;color:#aaa;margin-top:16px;">© ${new Date().getFullYear()} ${siteName}</p>
  </div>
</body></html>`;
}

Deno.serve(withLogging("send-order-confirmation", async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const order_id: string | undefined = body.order_id;
    const emailType: string = body.type || "order_confirmation";
    const explicitTemplateId: string | undefined = body.template_id;
    const fromOutbox: boolean = !!body.from_outbox;
    const testSend: boolean = !!body.test_send;
    const overrideRecipient: string | undefined = body.override_recipient;
    // Password forwarded from the outer plan-resolver call so inner
    // recursive calls can substitute {{password}} correctly.
    const forwardedPassword: string = body.auto_created_password || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Mail config (shared loader)
    const mailCfg = await getMailConfig(supabase);
    if (!mailCfg.smtp_host || !mailCfg.smtp_username || !mailCfg.smtp_password) {
      return new Response(JSON.stringify({ success: false, reason: "SMTP missing" }), { headers: corsHeaders });
    }

    const { data: settingsRows } = await supabase.from("site_settings").select("key, value");
    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => { settings[r.key] = r.value; });
    const siteName = settings.site_name || "GiftCardVibe";
    const currencySymbol = settings.currency_symbol || "৳";

    // === TEST SEND PATH ===
    let workingOrderId = order_id;
    if (testSend && !workingOrderId) {
      const { data: recentOrder } = await supabase
        .from("orders").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
      workingOrderId = recentOrder?.id;
      if (!workingOrderId) {
        return new Response(JSON.stringify({ error: "No orders exist to use as test data" }), { status: 400, headers: corsHeaders });
      }
    }

    if (!workingOrderId) {
      return new Response(JSON.stringify({ error: "order_id required" }), { status: 400, headers: corsHeaders });
    }

    const { data: order } = await supabase.from("orders").select("*").eq("id", workingOrderId).single();
    if (!order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: corsHeaders });

    const { data: realItems } = await supabase.from("order_items").select("*").eq("order_id", workingOrderId);
    const productIds = (realItems || []).map((i: any) => i.product_id).filter(Boolean);

    let origin = body.origin || settings.site_url || "";
    if (!origin) {
      const referer = req.headers.get("referer") || req.headers.get("origin");
      if (referer) { try { origin = new URL(referer).origin; } catch (_e) {} }
    }

    // Auto-create account up-front so the plan resolver knows whether this
    // is a new account (drives account_created routing). We do this BEFORE
    // the plan runs so isNewAccount is accurate for the very first order.
    let autoCreatedPassword = "";
    let isNewAccount = false;
    if (!testSend && !fromOutbox && !explicitTemplateId && order.customer_email) {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(
        (u: any) => u.email?.toLowerCase() === order.customer_email.toLowerCase()
      );
      if (!existing) {
        autoCreatedPassword = generatePassword();
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: order.customer_email,
          password: autoCreatedPassword,
          email_confirm: true,
          user_metadata: { display_name: order.customer_name },
        });
        if (!createErr && created?.user) {
          isNewAccount = true;
        }
      } else if (existing.created_at) {
        // Fallback safety net: still treat very-recently-created users as new.
        const ageMs = Date.now() - new Date(existing.created_at).getTime();
        isNewAccount = ageMs < 5 * 60 * 1000;
      }
    }

    // Order is "paid" only when payment_status === 'paid'. We use this to
    // gate payment_verified / post_purchase steps so they don't fire on
    // unpaid orders (e.g. bKash/COD orders awaiting verification).
    const isPaid = order.payment_status === "paid";

    // === PLAN RESOLVER ===
    if (!explicitTemplateId && !fromOutbox && !testSend) {
      let planRows: any[] = [];
      if (productIds.length > 0) {
        const { data } = await supabase
          .from("email_send_plan")
          .select("*")
          .in("product_id", productIds)
          .eq("enabled", true)
          .order("step_order");
        planRows = data || [];
      }
      if (planRows.length === 0) {
        const { data } = await supabase
          .from("email_send_plan")
          .select("*")
          .is("product_id", null)
          .eq("enabled", true)
          .order("step_order");
        planRows = data || [];
      }

      if (planRows.length > 0) {
        // Pre-fetch categories so we can skip account_created for returning users.
        const tplIds = planRows.map((r: any) => r.template_id);
        const { data: tplMeta } = await supabase
          .from("product_email_templates")
          .select("id, category")
          .in("id", tplIds);
        const catById: Record<string, string> = {};
        (tplMeta || []).forEach((t: any) => { catById[t.id] = t.category; });

        // Pre-fetch sent logs for this order within the last hour to prevent duplicates at the plan level.
        const { data: sentLogs } = await supabase
          .from("email_logs")
          .select("purpose")
          .eq("order_id", workingOrderId)
          .eq("status", "sent")
          .gte("created_at", new Date(Date.now() - 3600 * 1000).toISOString());
        const sentPurposes = new Set((sentLogs || []).map((l: any) => l.purpose));

        const enqueued: string[] = [];
        const sentImmediate: string[] = [];
        const skipped: string[] = [];
        for (const step of planRows) {
          const stepCategory = catById[step.template_id] || step.category;
          
          // Plan-level deduplication: skip if this purpose was already sent for this order.
          if (sentPurposes.has(stepCategory)) {
            skipped.push(`${step.template_id} (already_sent)`);
            continue;
          }

          // Skip account_created emails when no new account was created in this checkout.
          if (stepCategory === "account_created" && !isNewAccount) {
            skipped.push(step.template_id);
            continue;
          }
          // payment_reminder should ONLY fire on unpaid orders.
          // If the order is already paid, skip it.
          if (stepCategory === "payment_reminder" && isPaid) {
            skipped.push(`${step.template_id} (already_paid)`);
            continue;
          }
          // Skip payment-dependent emails until the order is actually paid AND completed.
          // order_confirmation, payment_verified, post_purchase all require a paid+completed order.
          // The mfs/bkash verification flow re-invokes this function once
          // payment_status flips to 'paid', at which point these will fire.
          const isCompleted = order.status === "completed";
          if (
            (stepCategory === "order_confirmation" ||
              stepCategory === "payment_verified" ||
              stepCategory === "post_purchase") &&
            !(isPaid && isCompleted)
          ) {
            skipped.push(step.template_id);
            continue;
          }
          if (step.delay_minutes > 0) {
            // Idempotent enqueue: unique partial index on (order_id, template_id) where status in (pending, sent)
            await supabase.from("email_outbox").upsert({
              order_id: workingOrderId,
              template_id: step.template_id,
              send_at: new Date(Date.now() + step.delay_minutes * 60 * 1000).toISOString(),
              status: "pending",
            }, { onConflict: "order_id,template_id", ignoreDuplicates: true });
            enqueued.push(step.template_id);
          } else {
            // Fire EVERY delay=0 step immediately (not just the first one).
            // Look up the template's category so the inner call resolves the right body/from-address.
            const { data: tpl } = await supabase
              .from("product_email_templates")
              .select("category")
              .eq("id", step.template_id)
              .maybeSingle();
            const innerResp = await fetch(`${supabaseUrl}/functions/v1/send-order-confirmation`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
              body: JSON.stringify({
                order_id: workingOrderId,
                type: tpl?.category || step.category || emailType,
                template_id: step.template_id,
                from_outbox: true,
                auto_created_password: autoCreatedPassword,
              }),
            });
            await innerResp.text();
            sentImmediate.push(step.template_id);
          }
        }
        return new Response(JSON.stringify({ success: true, plan: true, enqueued, sent: sentImmediate, skipped }), { headers: corsHeaders });
      }
    }

    // === Templates ===
    const { data: allTemplates } = await supabase.from("product_email_templates").select("*").eq("active", true);

    // Account auto-creation already happened up-front (see top of handler).
    // `autoCreatedPassword` is in scope from there for {{password}} substitution.


    // Deliveries + files + tokens
    const [{ data: deliveries }, { data: files }, { data: tokens }] = await Promise.all([
      supabase.from("order_deliveries").select("*").eq("order_id", workingOrderId),
      supabase.from("product_files").select("*").in("product_id", productIds.length > 0 ? productIds : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("download_tokens").select("*").eq("order_id", workingOrderId),
    ]);

    const tokenByFileId: Record<string, string> = {};
    for (const t of (tokens || [])) {
      if (t.product_file_id && t.token) tokenByFileId[t.product_file_id] = t.token;
    }

    let fileLinksHtml = "";
    let fileLinksPlain = "";
    for (const f of (files || [])) {
      const isExt = f.file_type === "link" || (typeof f.file_url === "string" && f.file_url.startsWith("http") && f.file_type !== "ebook" && f.file_type !== "video" && f.file_type !== "pdf" && f.file_type !== "zip");
      let url: string;
      if (isExt) {
        url = f.file_url;
      } else {
        const tok = tokenByFileId[f.id];
        url = tok
          ? `${supabaseUrl}/functions/v1/secure-download?token=${tok}`
          : `${supabaseUrl}/functions/v1/secure-download?file=${f.id}`;
      }
      const label = f.filename || (isExt ? "Open link" : "Download file");
      fileLinksPlain += `${label}: ${url}\n`;
      fileLinksHtml += `<li style="margin-bottom:6px;"><strong>${label}</strong> — <a href="${url}" style="color:#2563eb;text-decoration:underline;">${isExt ? "Open Link" : "Download"}</a></li>`;
    }

    let deliveriesHtml = "";
    for (const d of (deliveries || [])) {
      const pname = d.payload?.product_name || "Item";
      if (d.status !== "delivered") {
        deliveriesHtml += `<li><strong>${pname}</strong>: <em>Awaiting fulfillment — you'll receive an update shortly.</em></li>`;
        continue;
      }
      if (d.delivery_type === "code" && d.payload?.code) {
        deliveriesHtml += `<li><strong>${pname}</strong> — Code: <code>${d.payload.code}</code>${d.payload.credential_extra ? ` · Extra: <code>${d.payload.credential_extra}</code>` : ""}</li>`;
      } else if (d.delivery_type === "account" && d.payload?.code) {
        deliveriesHtml += `<li><strong>${pname}</strong> — Username: <code>${d.payload.code}</code>${d.payload.credential_extra ? ` · Password: <code>${d.payload.credential_extra}</code>` : ""}</li>`;
      } else if (d.payload?.url || d.payload?.link) {
        const url = d.payload.url || d.payload.link;
        deliveriesHtml += `<li><strong>${pname}</strong>: <a href="${url}">${url}</a></li>`;
      }
    }

    const productContentHtml = (fileLinksHtml || deliveriesHtml) ? `
      <div style="margin-top:20px;padding:16px;background:#f0fdf4;border-radius:8px;border:1px solid #d1fae5;">
        <h4 style="margin:0 0 10px;font-size:14px;color:#166534;">🎁 Your delivery:</h4>
        <ul style="margin:0;padding:0 0 0 20px;font-size:14px;color:#166534;line-height:1.7;">${fileLinksHtml}${deliveriesHtml}</ul>
      </div>` : "";

    // Generate magic link for passwordless login (used in payment_reminder templates)
    let magicLinkUrl = "";
    if (order.customer_email) {
      try {
        const redirectTo = origin
          ? `${origin}/account`
          : "";
        const { data: linkData } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: order.customer_email,
          options: redirectTo ? { redirectTo } : undefined,
        });
        if (linkData?.properties?.action_link) {
          magicLinkUrl = linkData.properties.action_link;
        }
      } catch (e) {
        console.warn("Magic link generation failed:", e);
      }
    }

    const paymentLink = origin ? `${origin}/orders/${order.id}` : "";

    const templateVars: Record<string, string> = {
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      order_number: order.order_number,
      order_total: `${currencySymbol}${Number(order.total).toFixed(2)}`,
      payment_method: order.payment_method,
      transaction_id: order.notes?.match(/trxID:(\S+)/)?.[1] || order.bkash_response?.trxID || "",
      product_name: (realItems || []).map((i: any) => i.product_name).join(", "),
      product_content: productContentHtml,
      product_links: fileLinksPlain,
      order_link: origin ? `${origin}/orders/${order.id}` : "",
      password: autoCreatedPassword || forwardedPassword || "",
      login_url: origin ? `${origin}/login` : "",
      magic_link: magicLinkUrl,
      payment_link: paymentLink,
    };

    // Pick template
    let chosenTemplate: any = null;
    if (explicitTemplateId) {
      chosenTemplate = (allTemplates || []).find((t: any) => t.id === explicitTemplateId) || null;
    }
    if (!chosenTemplate) {
      const cat = (allTemplates || []).filter((t: any) => (t.category || "post_purchase") === emailType);
      chosenTemplate = cat.find((t: any) => !t.is_global && productIds.includes(t.product_id))
        || cat.find((t: any) => t.is_global)
        || null;
    }

    // Resolve category for from-address routing & purpose
    const purposeCategory = chosenTemplate?.category || emailType || "post_purchase";

    let emailSubject: string;
    let emailHtml: string;
    if (chosenTemplate) {
      emailSubject = replaceVars(chosenTemplate.subject, templateVars);
      // Delivery block is now OPT-IN: only injected when template body explicitly contains {{product_content}}.
      // This prevents the same delivery details from appearing in every email of a multi-step plan.
      const bodyHtml = replaceVars(chosenTemplate.body_html, templateVars);
      emailHtml = wrapInEmailLayout(siteName, bodyHtml);
    } else {
      const table = `<table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr style="background:#f8f9fa;"><th style="padding:8px;text-align:left;">Item</th><th style="padding:8px;text-align:right;">Total</th></tr>
        ${(realItems || []).map((i: any) => `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${i.product_name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${currencySymbol}${Number(i.total).toFixed(2)}</td></tr>`).join("")}
      </table>`;
      emailSubject = emailType === "payment_verified"
        ? `Payment Confirmed - ${order.order_number}`
        : `Order Confirmation - ${order.order_number}`;
      const greeting = emailType === "payment_verified" ? "Payment Verified! ✅" : "Order Received!";
      let bodyHtml = `<h2 style="margin:0 0 16px;font-size:20px;color:#1a1a2e;">${greeting}</h2>
        <p style="color:#666;font-size:14px;margin-bottom:16px;">Hi ${order.customer_name}, ${emailType === "payment_verified" ? `your payment of <strong>${templateVars.order_total}</strong> has been confirmed.` : "thanks for your order."}</p>
        ${table}${productContentHtml}`;
      if (templateVars.order_link) bodyHtml += `<p style="margin-top:20px;"><a href="${templateVars.order_link}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">View Order Details</a></p>`;
      emailHtml = wrapInEmailLayout(siteName, bodyHtml);
    }

    if (testSend) {
      emailSubject = `[TEST] ${emailSubject}`;
      emailHtml = emailHtml.replace(
        "<div style=\"padding:32px;\">",
        `<div style="padding:32px;"><div style="background:#fef3c7;border:1px solid #f59e0b;color:#92400e;padding:10px 14px;border-radius:6px;font-size:12px;margin-bottom:20px;">⚠️ This is a TEST email rendered with order ${order.order_number}'s data.</div>`
      );
    }

    const recipient = (testSend && overrideRecipient) ? overrideRecipient : order.customer_email;
    const fromAddr = resolveFrom(mailCfg, purposeCategory);

    // Guard against duplicate sends within 1h window (default in email-logger)
    if (!testSend && await recentlySent(supabase, recipient, emailSubject)) {
      return new Response(JSON.stringify({ success: true, skipped: "duplicate_within_1h" }), { headers: corsHeaders });
    }

    const triggeredBy = fromOutbox ? "outbox" : (testSend ? "test" : `order:${workingOrderId}`);

    try {
      await smtpSend(mailCfg, {
        to: recipient,
        subject: emailSubject,
        html: emailHtml,
        from: fromAddr,
        fromName: siteName,
      });
      await logEmail(supabase, {
        recipient, sender: fromAddr, subject: emailSubject,
        purpose: purposeCategory, status: "sent", triggered_by: triggeredBy,
        order_id: workingOrderId,
      });
      return new Response(JSON.stringify({ success: true, recipient, test: testSend }), { headers: corsHeaders });
    } catch (sendErr: any) {
      await logEmail(supabase, {
        recipient, sender: fromAddr, subject: emailSubject,
        purpose: purposeCategory, status: "failed",
        error: sendErr.message || String(sendErr), triggered_by: triggeredBy,
        order_id: workingOrderId,
      });
      throw sendErr;
    }
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
}));
