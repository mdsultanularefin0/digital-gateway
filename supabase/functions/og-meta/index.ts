// Per-route SSR meta for social crawlers (facebookexternalhit, Twitterbot,
// LinkedInBot, WhatsApp, Slackbot, Discordbot, TelegramBot, etc.).
//
// Nginx routes requests with a matching User-Agent to this function with
// ?path=<original path>. We look up the entity (product / blog post / landing
// page / static route), build a full HTML document with the correct <title>,
// <meta name="description">, og:*, twitter:*, canonical, and JSON-LD, and
// return it. JS-executing crawlers (Googlebot) continue to hit the SPA and
// pick up per-route meta from src/components/SEOHead.tsx.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withLogging } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function esc(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface Meta {
  title: string;
  description: string;
  image?: string;
  type: "website" | "article" | "product";
  canonical: string;
  siteName: string;
  jsonLd?: Record<string, unknown>;
}

function renderHtml(m: Meta): string {
  const img = m.image ? esc(m.image) : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(m.title)}</title>
<meta name="description" content="${esc(m.description)}" />
<link rel="canonical" href="${esc(m.canonical)}" />

<meta property="og:site_name" content="${esc(m.siteName)}" />
<meta property="og:type" content="${esc(m.type)}" />
<meta property="og:title" content="${esc(m.title)}" />
<meta property="og:description" content="${esc(m.description)}" />
<meta property="og:url" content="${esc(m.canonical)}" />
${img ? `<meta property="og:image" content="${img}" />` : ""}

<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}" />
<meta name="twitter:title" content="${esc(m.title)}" />
<meta name="twitter:description" content="${esc(m.description)}" />
${img ? `<meta name="twitter:image" content="${img}" />` : ""}

${m.jsonLd ? `<script type="application/ld+json">${JSON.stringify(m.jsonLd).replace(/</g, "\\u003c")}</script>` : ""}
</head>
<body>
<h1>${esc(m.title)}</h1>
<p>${esc(m.description)}</p>
<p><a href="${esc(m.canonical)}">${esc(m.canonical)}</a></p>
</body>
</html>`;
}

Deno.serve(withLogging("og-meta", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const rawPath = url.searchParams.get("path") || url.pathname || "/";
    const path = ("/" + rawPath.replace(/^\/+/, "")).split("?")[0].split("#")[0];

    // Resolve base URL + site name from settings
    const { data: settingsRows } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["default_canonical_url", "site_name", "site_tagline", "default_og_image_url"]);
    const settings: Record<string, string> = {};
    (settingsRows ?? []).forEach((r: any) => (settings[r.key] = r.value || ""));

    const baseUrl =
      (settings.default_canonical_url || "").trim().replace(/\/$/, "") ||
      `${url.protocol}//${url.host}`;
    const siteName = settings.site_name?.trim() || "GiftCardVibe";
    const defaultImage = settings.default_og_image_url?.trim() || undefined;
    const defaultDescription =
      settings.site_tagline?.trim() ||
      "Premium digital gift cards for your favorite apps, services, and platforms. Instant delivery, secure transactions.";
    const canonical = `${baseUrl}${path}`;

    // ---- Route resolvers ----
    let meta: Meta = {
      title: `${siteName} — Premium Gift Cards`,
      description: defaultDescription,
      image: defaultImage,
      type: "website",
      canonical,
      siteName,
    };

    // /products/:slug
    const productMatch = path.match(/^\/products\/([^\/]+)\/?$/);
    // /blog/:slug
    const blogMatch = path.match(/^\/blog\/([^\/]+)\/?$/);
    // /p/:slug  (landing page)
    const landingMatch = path.match(/^\/p\/([^\/]+)\/?$/);

    if (productMatch) {
      const slug = decodeURIComponent(productMatch[1]);
      const { data: p } = await supabase
        .from("products")
        .select("name, description, image_url, price, slug, meta_title, meta_description, og_image_url")
        .or(`slug.eq.${slug},id.eq.${slug}`)
        .eq("published", true)
        .maybeSingle();
      if (p) {
        meta = {
          title: (p.meta_title || p.name || meta.title).trim(),
          description: (p.meta_description || p.description || defaultDescription).slice(0, 300),
          image: p.og_image_url || p.image_url || defaultImage,
          type: "product",
          canonical: `${baseUrl}/products/${p.slug || slug}`,
          siteName,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            description: p.description || undefined,
            image: p.og_image_url || p.image_url || undefined,
            offers: p.price
              ? { "@type": "Offer", price: p.price, priceCurrency: "BDT", availability: "https://schema.org/InStock" }
              : undefined,
          },
        };
      }
    } else if (blogMatch) {
      const slug = decodeURIComponent(blogMatch[1]);
      const { data: b } = await supabase
        .from("blog_posts")
        .select("title, excerpt, cover_image_url, slug, meta_title, meta_description, og_image_url, published_at, author")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (b) {
        meta = {
          title: (b.meta_title || b.title || meta.title).trim(),
          description: (b.meta_description || b.excerpt || defaultDescription).slice(0, 300),
          image: b.og_image_url || b.cover_image_url || defaultImage,
          type: "article",
          canonical: `${baseUrl}/blog/${b.slug}`,
          siteName,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: b.title,
            image: b.og_image_url || b.cover_image_url || undefined,
            datePublished: b.published_at || undefined,
            author: b.author ? { "@type": "Person", name: b.author } : undefined,
            mainEntityOfPage: `${baseUrl}/blog/${b.slug}`,
          },
        };
      }
    } else if (landingMatch) {
      const slug = decodeURIComponent(landingMatch[1]);
      const { data: l } = await supabase
        .from("landing_pages")
        .select("title, description, hero_image_url, slug, meta_title, meta_description, og_image_url")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (l) {
        meta = {
          title: (l.meta_title || l.title || meta.title).trim(),
          description: (l.meta_description || l.description || defaultDescription).slice(0, 300),
          image: l.og_image_url || l.hero_image_url || defaultImage,
          type: "website",
          canonical: `${baseUrl}/p/${l.slug}`,
          siteName,
        };
      }
    } else {
      // Static route overrides — fetch from page_meta if present
      const staticSlug =
        path === "/" ? "home" :
        path === "/products" ? "products" :
        path === "/about" ? "about" :
        path === "/contact" ? "contact" :
        path === "/faq" ? "faq" :
        path === "/blog" ? "blog" :
        path === "/privacy" ? "privacy" :
        path === "/terms" ? "terms" : null;

      if (staticSlug) {
        const { data: pm } = await supabase
          .from("page_meta")
          .select("meta_title, meta_description, og_image_url, canonical_url")
          .eq("page_key", staticSlug)
          .maybeSingle();
        if (pm) {
          meta = {
            title: (pm.meta_title || meta.title).trim(),
            description: (pm.meta_description || defaultDescription).slice(0, 300),
            image: pm.og_image_url || defaultImage,
            type: "website",
            canonical: pm.canonical_url?.trim() || canonical,
            siteName,
          };
        }
      }
    }

    return new Response(renderHtml(meta), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch (e) {
    // On failure, return a minimal valid HTML so the crawler still gets *something*
    const msg = e instanceof Error ? e.message : String(e);
    console.error("og-meta error:", msg);
    return new Response(
      `<!doctype html><html><head><title>GiftCardVibe</title><meta name="description" content="Premium digital gift cards."/></head><body>GiftCardVibe</body></html>`,
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}));
