import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/use-site-settings";

const footerLinks = {
  Product: [
    { label: "Features", to: "/products" },
    { label: "Wishlist", to: "/wishlist" },
    { label: "FAQ", to: "/faq" },
  ],
  Company: [
    { label: "About", to: "/about" },
    { label: "Contact", to: "/contact" },
  ],
  Legal: [
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Terms of Service", to: "/terms" },
  ],
};

export function Footer() {
  const { data: settings } = useSiteSettings();
  const siteName = settings?.site_name || "GiftCardVibe";
  const tagline = settings?.site_tagline || "Premium digital products and subscriptions to elevate your workflow.";
  const footerText = settings?.footer_text || `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`;

  const socialLinks = [
    { label: "Twitter", url: settings?.twitter_url },
    { label: "LinkedIn", url: settings?.linkedin_url },
    { label: "Instagram", url: settings?.instagram_url },
    { label: "Facebook", url: settings?.facebook_url },
    { label: "YouTube", url: settings?.youtube_url },
  ].filter((s) => s.url);

  return (
    <footer className="border-t border-border">
      <div className="container py-16 px-5 md:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="text-base font-bold tracking-executive uppercase text-foreground">
              {siteName}
            </Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xs">
              {tagline}
            </p>
            {settings?.contact_email && (
              <a href={`mailto:${settings.contact_email}`} className="mt-3 block text-sm text-primary hover:underline">
                {settings.contact_email}
              </a>
            )}
            {settings?.contact_phone && (
              <a href={`tel:${settings.contact_phone}`} className="mt-1 block text-sm text-muted-foreground hover:text-foreground">
                {settings.contact_phone}
              </a>
            )}
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="mb-4 text-[11px] font-semibold tracking-wide-custom uppercase text-muted-foreground">{heading}</h4>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-foreground/60 transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-xs text-muted-foreground">
            {footerText}
          </p>
          {socialLinks.length > 0 && (
            <div className="flex gap-6">
              {socialLinks.map((s) => (
                <a key={s.label} href={s.url!} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
