import { useEffect } from "react";

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
}

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
}: SEOHeadProps) {
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

    if (siteName && siteName.trim()) {
      setMeta("property", "og:site_name", siteName.trim());
    }

    if (keywords && keywords.trim()) {
      setMeta("name", "keywords", keywords.trim());
    } else {
      removeMeta("name", "keywords");
    }

    // Always set a twitter:card so previews render. Default to large image
    // when an OG image is present, otherwise a plain summary.
    const effectiveTwitterCard =
      twitterCard || (ogImage ? "summary_large_image" : "summary");
    setMeta("name", "twitter:card", effectiveTwitterCard);

    if (ogImage) {
      setMeta("property", "og:image", ogImage);
      setMeta("name", "twitter:image", ogImage);
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

    // JSON-LD
    const existingScript = document.querySelector('script[data-seo-jsonld]');
    existingScript?.remove();
    if (jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo-jsonld", "true");
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      document.querySelector('script[data-seo-jsonld]')?.remove();
    };
  }, [title, description, keywords, canonical, ogImage, type, twitterCard, siteName, jsonLd]);

  return null;
}
