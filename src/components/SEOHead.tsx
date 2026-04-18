import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/use-site-settings";

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  type?: "website" | "product" | "article";
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  siteName?: string;
  jsonLd?: Record<string, unknown>;
  /** Breadcrumb trail for site-wide BreadcrumbList JSON-LD */
  breadcrumbs?: BreadcrumbItem[];
  /** Disable automatic hreflang injection for routes that aren't bilingual */
  disableHreflang?: boolean;
}

const LANGS = ["en", "bn"] as const;

export function SEOHead({
  title = "GiftCardVibe — Premium Gift Cards",
  description = "Premium gift cards and digital products.",
  keywords,
  canonical,
  ogImage,
  type = "website",
  twitterCard,
  siteName,
  jsonLd,
  breadcrumbs,
  disableHreflang,
}: SEOHeadProps) {
  const { data: settings } = useSiteSettings();

  // Resolve fallbacks from global site settings
  const effectiveOgImage = ogImage || settings?.default_og_image_url || undefined;
  const effectiveSiteName = siteName || settings?.site_name || undefined;
  const baseUrl = settings?.default_canonical_url?.replace(/\/$/, "") || "";

  useEffect(() => {
    document.title = title;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const removeMeta = (attr: string, key: string) => {
      document.querySelector(`meta[${attr}="${key}"]`)?.remove();
    };

    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", type);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);

    if (effectiveSiteName && effectiveSiteName.trim()) {
      setMeta("property", "og:site_name", effectiveSiteName.trim());
    }

    if (keywords && keywords.trim()) {
      setMeta("name", "keywords", keywords.trim());
    } else {
      removeMeta("name", "keywords");
    }

    const effectiveTwitterCard =
      twitterCard ||
      (settings?.default_twitter_card as SEOHeadProps["twitterCard"]) ||
      (effectiveOgImage ? "summary_large_image" : "summary");
    setMeta("name", "twitter:card", effectiveTwitterCard);

    if (effectiveOgImage) {
      setMeta("property", "og:image", effectiveOgImage);
      setMeta("name", "twitter:image", effectiveOgImage);
    } else {
      removeMeta("property", "og:image");
      removeMeta("name", "twitter:image");
    }

    // Canonical
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) {
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonical);
      setMeta("property", "og:url", canonical);
    } else {
      link?.remove();
      removeMeta("property", "og:url");
    }

    // hreflang for bilingual EN/BN routes
    document.querySelectorAll('link[rel="alternate"][data-hreflang]').forEach((el) => el.remove());
    if (!disableHreflang && canonical) {
      const url = new URL(canonical, baseUrl || window.location.origin);
      const pathname = url.pathname;
      const search = url.search;
      const origin = url.origin;

      LANGS.forEach((lang) => {
        const alt = document.createElement("link");
        alt.setAttribute("rel", "alternate");
        alt.setAttribute("hreflang", lang);
        alt.setAttribute("data-hreflang", "true");
        // Use ?lang=xx convention; site already toggles via LanguageContext
        const params = new URLSearchParams(search);
        params.set("lang", lang);
        alt.setAttribute("href", `${origin}${pathname}?${params.toString()}`);
        document.head.appendChild(alt);
      });
      // x-default points to the canonical (English by default)
      const xDefault = document.createElement("link");
      xDefault.setAttribute("rel", "alternate");
      xDefault.setAttribute("hreflang", "x-default");
      xDefault.setAttribute("data-hreflang", "true");
      xDefault.setAttribute("href", canonical);
      document.head.appendChild(xDefault);
    }

    // JSON-LD: combine breadcrumbs + custom jsonLd into a single graph script
    document.querySelectorAll('script[data-seo-jsonld]').forEach((el) => el.remove());
    const graphs: unknown[] = [];
    if (breadcrumbs && breadcrumbs.length > 0) {
      graphs.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: b.name,
          item: b.url.startsWith("http")
            ? b.url
            : `${baseUrl || window.location.origin}${b.url.startsWith("/") ? b.url : `/${b.url}`}`,
        })),
      });
    }
    if (jsonLd) graphs.push(jsonLd);

    if (graphs.length > 0) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo-jsonld", "true");
      script.textContent = JSON.stringify(graphs.length === 1 ? graphs[0] : graphs);
      document.head.appendChild(script);
    }

    return () => {
      document.querySelectorAll('script[data-seo-jsonld]').forEach((el) => el.remove());
      document.querySelectorAll('link[rel="alternate"][data-hreflang]').forEach((el) => el.remove());
    };
  }, [
    title,
    description,
    keywords,
    canonical,
    effectiveOgImage,
    type,
    twitterCard,
    effectiveSiteName,
    jsonLd,
    breadcrumbs,
    disableHreflang,
    baseUrl,
    settings?.default_twitter_card,
  ]);

  return null;
}
