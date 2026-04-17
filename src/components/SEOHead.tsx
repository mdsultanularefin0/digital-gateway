import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  type?: "website" | "product" | "article";
  jsonLd?: Record<string, unknown>;
}

export function SEOHead({
  title = "GiftCardVibe — Premium Gift Cards",
  description = "Premium gift cards and digital products.",
  keywords,
  canonical,
  ogImage,
  type = "website",
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

    if (keywords && keywords.trim()) {
      setMeta("name", "keywords", keywords.trim());
    } else {
      removeMeta("name", "keywords");
    }

    if (ogImage) {
      setMeta("property", "og:image", ogImage);
      setMeta("name", "twitter:image", ogImage);
      setMeta("name", "twitter:card", "summary_large_image");
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
    } else {
      link?.remove();
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
  }, [title, description, keywords, canonical, ogImage, type, jsonLd]);

  return null;
}
