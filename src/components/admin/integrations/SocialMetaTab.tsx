import { Facebook, Instagram } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SocialTabProps {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
}

const FIELDS = [
  { key: "meta_page_id", label: "Facebook Page ID", placeholder: "1234567890" },
  { key: "meta_page_access_token", label: "Page Access Token (long-lived)", secret: true, placeholder: "EAA..." },
  { key: "meta_ig_business_id", label: "Instagram Business Account ID", placeholder: "1789..." },
  { key: "meta_ig_access_token", label: "Instagram Token (optional, falls back to Page token)", secret: true, placeholder: "EAA..." },
];

export function SocialMetaTab({ settings, update }: SocialTabProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
            <Facebook className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Meta (Facebook + Instagram) Publishing</h3>
            <p className="text-xs text-muted-foreground">Required to publish & schedule posts via the Social Media Poster</p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{f.label}</Label>
              <Input
                type={f.secret ? "password" : "text"}
                value={settings[f.key] || ""}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder={f.placeholder}
              />
            </div>
          ))}
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
            <p className="font-semibold flex items-center gap-2"><Instagram className="h-3.5 w-3.5" /> Setup steps</p>
            <ol className="list-decimal pl-5 space-y-0.5">
              <li>Create a Meta App at developers.facebook.com</li>
              <li>Add the Facebook Login + Instagram Graph API products</li>
              <li>Generate a long-lived Page Access Token (60 days, then refresh)</li>
              <li>Link your Instagram Business account to your Facebook Page</li>
              <li>Get the IG Business Account ID via <code>GET /me/accounts?fields=instagram_business_account</code></li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
