import { Image as ImageIcon } from "lucide-react";

interface Props {
  title: string;
  description: string;
  ogImage?: string;
  canonical?: string;
  twitterCard?: string;
  siteName?: string;
}

/**
 * Visual preview of how the page will appear when shared on social platforms.
 * Renders Facebook/LinkedIn-style and Twitter/X-style cards side by side.
 */
export function LinkPreviewCard({
  title,
  description,
  ogImage,
  canonical,
  twitterCard = "summary_large_image",
  siteName,
}: Props) {
  const displayDomain = (() => {
    try {
      if (canonical) return new URL(canonical).hostname.replace(/^www\./, "");
    } catch {}
    if (typeof window !== "undefined") return window.location.hostname.replace(/^www\./, "");
    return "your-site.com";
  })();

  const safeTitle = (title || "Untitled page").trim();
  const safeDesc = (description || "Add a meta description to control this snippet.").trim();
  const isLargeTwitter = twitterCard === "summary_large_image" || twitterCard === "player";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Link preview
        </h4>
        <span className="text-[10px] text-muted-foreground/70">
          How this page looks when shared
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Facebook / LinkedIn / WhatsApp style */}
        <div className="space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Facebook · LinkedIn · WhatsApp
          </p>
          <div className="rounded-lg border border-border overflow-hidden bg-background shadow-sm">
            {ogImage ? (
              <img
                src={ogImage}
                alt="OG preview"
                className="w-full h-44 object-cover bg-muted"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-44 bg-muted flex items-center justify-center text-muted-foreground">
                <ImageIcon className="h-8 w-8 opacity-40" />
              </div>
            )}
            <div className="p-3 bg-muted/40">
              <p className="text-[11px] uppercase text-muted-foreground truncate">
                {displayDomain}
              </p>
              <p className="text-sm font-semibold leading-snug line-clamp-2 mt-0.5">
                {safeTitle}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {safeDesc}
              </p>
            </div>
          </div>
        </div>

        {/* Twitter / X style */}
        <div className="space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            X (Twitter) · {twitterCard}
          </p>
          <div className="rounded-2xl border border-border overflow-hidden bg-background shadow-sm">
            {isLargeTwitter ? (
              ogImage ? (
                <img
                  src={ogImage}
                  alt="OG preview"
                  className="w-full h-44 object-cover bg-muted"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-44 bg-muted flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8 opacity-40" />
                </div>
              )
            ) : null}
            <div className="p-3 flex gap-3">
              {!isLargeTwitter && (
                <div className="h-20 w-20 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {ogImage ? (
                    <img src={ogImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground opacity-40" />
                  )}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground truncate">{displayDomain}</p>
                <p className="text-sm font-semibold leading-snug line-clamp-2 mt-0.5">
                  {safeTitle}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {safeDesc}
                </p>
                {siteName && (
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{siteName}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
