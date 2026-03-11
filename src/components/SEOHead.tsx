import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  type?: "website" | "product" | "article";
  jsonLd?: Record<string, unknown>;
}

export function SEOHead({
  title = "DigiStack — Premium Digital Products",
  description = "Premium digital products designed for teams who demand precision, speed, and simplicity.",
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

    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", type);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);

    if (ogImage) {
      setMeta("property", "og:image", ogImage);
      setMeta("name", "twitter:image", ogImage);
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
  }, [title, description, canonical, ogImage, type, jsonLd]);

  return null;
}
