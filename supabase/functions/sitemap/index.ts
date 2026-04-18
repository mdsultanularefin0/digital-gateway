// Sitemap edge function — generates sitemap.xml on demand from products,
// blog posts, landing pages, and a static set of public routes.
// Public, no auth, returns application/xml.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STATIC_ROUTES = [
  "/",
  "/products",
  "/blog",
  "/about",
  "/contact",
  "/faq",
  "/privacy",
  "/terms",
  "/login",
];

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve site base URL from settings or fall back to request origin
    const { data: setting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "default_canonical_url")
      .maybeSingle();

    const requestUrl = new URL(req.url);
    const baseUrl =
      (setting?.value || "").trim().replace(/\/$/, "") ||
      `${requestUrl.protocol}//${requestUrl.host}`;

    // Fetch published content in parallel
    const [productsRes, blogRes, landingRes] = await Promise.all([
      supabase
        .from("products")
        .select("slug, updated_at")
        .eq("published", true),
      supabase
        .from("blog_posts")
        .select("slug, updated_at")
        .eq("published", true),
      supabase
        .from("landing_pages")
        .select("slug, updated_at")
        .eq("published", true),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const urls: { loc: string; lastmod?: string; priority: string; changefreq: string }[] = [];

    STATIC_ROUTES.forEach((path) => {
      urls.push({
        loc: `${baseUrl}${path}`,
        lastmod: today,
        priority: path === "/" ? "1.0" : "0.7",
        changefreq: "weekly",
      });
    });

    (productsRes.data ?? []).forEach((p: any) => {
      if (!p.slug) return;
      urls.push({
        loc: `${baseUrl}/products/${p.slug}`,
        lastmod: (p.updated_at || "").slice(0, 10) || today,
        priority: "0.9",
        changefreq: "weekly",
      });
    });

    (blogRes.data ?? []).forEach((p: any) => {
      if (!p.slug) return;
      urls.push({
        loc: `${baseUrl}/blog/${p.slug}`,
        lastmod: (p.updated_at || "").slice(0, 10) || today,
        priority: "0.6",
        changefreq: "monthly",
      });
    });

    (landingRes.data ?? []).forEach((p: any) => {
      if (!p.slug) return;
      urls.push({
        loc: `${baseUrl}/p/${p.slug}`,
        lastmod: (p.updated_at || "").slice(0, 10) || today,
        priority: "0.8",
        changefreq: "weekly",
      });
    });

    const body =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
      urls
        .map((u) => {
          const enHref = `${escapeXml(u.loc)}?lang=en`;
          const bnHref = `${escapeXml(u.loc)}?lang=bn`;
          return (
            `  <url>\n` +
            `    <loc>${escapeXml(u.loc)}</loc>\n` +
            (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : "") +
            `    <changefreq>${u.changefreq}</changefreq>\n` +
            `    <priority>${u.priority}</priority>\n` +
            `    <xhtml:link rel="alternate" hreflang="en" href="${enHref}"/>\n` +
            `    <xhtml:link rel="alternate" hreflang="bn" href="${bnHref}"/>\n` +
            `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(u.loc)}"/>\n` +
            `  </url>`
          );
        })
        .join("\n") +
      `\n</urlset>\n`;

    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
