import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Save, Upload, ChevronDown, Search } from "lucide-react";
import { countries, currencies } from "@/data/countries-currencies";

interface SettingsMap {
  [key: string]: string;
}

const settingGroups = [
  {
    title: "General",
    description: "Basic site identity and branding",
    fields: [
      { key: "site_name", label: "Site Name", placeholder: "e.g. GiftCardVibe" },
      { key: "site_tagline", label: "Tagline", placeholder: "e.g. Premium Digital Products" },
      { key: "logo_url", label: "Logo URL", placeholder: "https://... or upload", type: "image" },
      { key: "hero_image_url", label: "Hero Image", placeholder: "https://... or upload", type: "image" },
      { key: "favicon_url", label: "Favicon URL", placeholder: "https://..." },
      { key: "footer_text", label: "Footer Text", placeholder: "e.g. © 2026 GiftCardVibe. All rights reserved." },
    ],
  },
  {
    title: "Contact Information",
    description: "How customers can reach you",
    fields: [
      { key: "contact_email", label: "Primary Email", placeholder: "hello@example.com", type: "email" },
      { key: "support_email", label: "Support Email", placeholder: "support@example.com", type: "email" },
      { key: "contact_phone", label: "Phone Number", placeholder: "+1 (555) 123-4567" },
      { key: "whatsapp_number", label: "WhatsApp Number", placeholder: "+15551234567" },
    ],
  },
  {
    title: "Location",
    description: "Business address details",
    fields: [
      { key: "contact_address", label: "Street Address", placeholder: "123 Main St" },
      { key: "city", label: "City", placeholder: "San Francisco" },
      { key: "state", label: "State / Province", placeholder: "California" },
      { key: "zip_code", label: "ZIP / Postal Code", placeholder: "94105" },
      { key: "country", label: "Country", placeholder: "Select a country", type: "country" },
    ],
  },
  {
    title: "Currency",
    description: "Pricing display preferences",
    fields: [
      { key: "currency", label: "Currency", placeholder: "Select currency", type: "currency" },
    ],
  },
  {
    title: "Payment Methods",
    description: "Choose which payment methods to show at checkout",
    fields: [
      { key: "payment_methods", label: "Enabled Methods", placeholder: "", type: "payment_methods" },
    ],
  },
  {
    title: "bKash PGW",
    description: "bKash payment gateway configuration",
    fields: [
      { key: "bkash_sandbox", label: "Sandbox Mode", placeholder: "", type: "toggle" },
    ],
  },
  {
    title: "Social Media",
    description: "Links to your social profiles",
    fields: [
      { key: "facebook_url", label: "Facebook", placeholder: "https://facebook.com/..." },
      { key: "twitter_url", label: "X (Twitter)", placeholder: "https://x.com/..." },
      { key: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/..." },
      { key: "linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/..." },
      { key: "youtube_url", label: "YouTube", placeholder: "https://youtube.com/..." },
    ],
  },
  {
    title: "SEO & Analytics",
    description: "Search engine and tracking configuration",
    fields: [
      { key: "meta_title", label: "Default Meta Title", placeholder: "GiftCardVibe — Premium Gift Cards" },
      { key: "meta_description", label: "Default Meta Description", placeholder: "Discover curated digital tools...", type: "textarea" },
      { key: "google_analytics_id", label: "Google Analytics ID", placeholder: "G-XXXXXXXXXX" },
      { key: "facebook_pixel_id", label: "Facebook Pixel ID", placeholder: "e.g. 123456789012345" },
    ],
  },
];

// Searchable select dropdown component
function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  renderOption,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  renderOption?: (opt: string) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-10 w-full rounded-[4px] border border-border bg-background px-4 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-[4px] border border-border bg-background shadow-lg max-h-60 flex flex-col">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-8 w-full rounded-[4px] border border-border bg-muted pl-7 pr-3 text-xs focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">No results</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${opt === value ? "bg-primary/10 text-primary font-medium" : ""
                    }`}
                >
                  {renderOption ? renderOption(opt) : opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(""); }} />
      )}
    </div>
  );
}

const AVAILABLE_PAYMENT_METHODS = [
  { value: "cod", label: "Cash on Delivery", description: "Customer pays on delivery" },
  { value: "bkash", label: "bKash", description: "Mobile banking via bKash" },
  { value: "nagad", label: "Nagad", description: "Mobile banking via Nagad" },
  { value: "bank", label: "Bank Transfer", description: "Direct bank transfer" },
  { value: "stripe", label: "Credit/Debit Card", description: "Online card payments via Stripe" },
];

function PaymentMethodsEditor({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  let enabled: string[] = [];
  try { enabled = JSON.parse(value); } catch { enabled = ["cod"]; }

  const toggle = (method: string) => {
    const next = enabled.includes(method)
      ? enabled.filter((m) => m !== method)
      : [...enabled, method];
    onChange(JSON.stringify(next));
  };

  return (
    <div className="space-y-2">
      {AVAILABLE_PAYMENT_METHODS.map((m) => (
        <label key={m.value} className={`flex items-center gap-3 rounded-[4px] border p-3 cursor-pointer transition-colors ${enabled.includes(m.value) ? "border-primary bg-primary/5" : "border-border hover:border-foreground/20"}`}>
          <input
            type="checkbox"
            checked={enabled.includes(m.value)}
            onChange={() => toggle(m.value)}
            className="h-4 w-4 accent-primary rounded"
          />
          <div>
            <span className="text-sm font-medium">{m.label}</span>
            <p className="text-xs text-muted-foreground">{m.description}</p>
          </div>
        </label>
      ))}
      {enabled.length === 0 && (
        <p className="text-xs text-destructive">At least one payment method should be enabled.</p>
      )}
    </div>
  );
}

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<SettingsMap>({});
  const [uploading, setUploading] = useState(false);

  const currencyOptions = currencies.map((c) => c.code);
  const currencyLabels: Record<string, string> = {};
  currencies.forEach((c) => {
    currencyLabels[c.code] = `${c.symbol}  ${c.code} — ${c.name}`;
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;
      const map: SettingsMap = {};
      (data || []).forEach((row: { key: string; value: string }) => {
        map[row.key] = row.value;
      });
      return map;
    },
  });

  useEffect(() => {
    if (settings) setValues(settings);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const upserts = Object.entries(values).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString(),
      }));

      for (const item of upserts) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value: item.value, updated_at: item.updated_at })
          .eq("key", item.key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings-admin"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error saving settings", description: err.message, variant: "destructive" });
    },
  });

  const handleImageUpload = async (key: string, file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `settings/${key}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      setValues({ ...values, [key]: urlData.publicUrl });
      toast({ title: "Image uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleCurrencyChange = (code: string) => {
    const cur = currencies.find((c) => c.code === code);
    if (cur) {
      setValues((prev) => ({ ...prev, currency: cur.code, currency_symbol: cur.symbol }));
    }
  };

  const update = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const inputClass = "h-10 w-full rounded-[4px] border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-muted-foreground">Loading settings...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-display font-bold">General Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your site configuration</p>
        </div>
        <Button
          variant="gradient"
          size="lg"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      <div className="max-w-3xl space-y-10">
        {settingGroups.map((group) => (
          <div key={group.title}>
            <div className="mb-4">
              <h3 className="text-sm font-semibold tracking-executive uppercase">{group.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
            </div>
            <div className="rounded-[4px] border border-border divide-y divide-border">
              {group.fields.map((field) => (
                <div key={field.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4">
                  <label className="text-sm font-medium w-40 shrink-0">{field.label}</label>
                  <div className="flex-1">
                    {field.type === "country" ? (
                      <SearchableSelect
                        value={values[field.key] || ""}
                        onChange={(val) => update(field.key, val)}
                        options={countries}
                        placeholder={field.placeholder}
                      />
                    ) : field.type === "currency" ? (
                      <SearchableSelect
                        value={values[field.key] || ""}
                        onChange={handleCurrencyChange}
                        options={currencyOptions}
                        placeholder={field.placeholder}
                        renderOption={(opt) => currencyLabels[opt]}
                      />
                    ) : field.type === "payment_methods" ? (
                      <PaymentMethodsEditor
                        value={values[field.key] || '["cod"]'}
                        onChange={(val) => update(field.key, val)}
                      />
                    ) : field.type === "toggle" ? (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => update(field.key, values[field.key] === "false" ? "true" : "false")}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${values[field.key] !== "false" ? "bg-primary" : "bg-muted"}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform ${values[field.key] !== "false" ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                        <span className="text-sm text-muted-foreground">{values[field.key] !== "false" ? "Enabled" : "Disabled"}</span>
                      </div>
                    ) : field.type === "textarea" ? (
                      <textarea
                        value={values[field.key] || ""}
                        onChange={(e) => update(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full rounded-[4px] border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                      />
                    ) : field.type === "image" ? (
                      <div className="flex items-center gap-3">
                        {values[field.key] && (
                          <img
                            src={values[field.key]}
                            alt={field.label}
                            className="h-10 w-10 rounded-[4px] border border-border object-contain bg-muted"
                          />
                        )}
                        <input
                          value={values[field.key] || ""}
                          onChange={(e) => update(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className={`${inputClass} flex-1`}
                        />
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(field.key, file);
                            }}
                          />
                          <span className="inline-flex items-center gap-1 rounded-[4px] border border-border px-3 h-10 text-xs font-medium hover:bg-muted transition-colors">
                            <Upload className="h-3.5 w-3.5" />
                            {uploading ? "..." : "Upload"}
                          </span>
                        </label>
                      </div>
                    ) : (
                      <input
                        type={field.type || "text"}
                        value={values[field.key] || ""}
                        onChange={(e) => update(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className={inputClass}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-3xl mt-8 pt-6 border-t border-border flex justify-end">
        <Button
          variant="gradient"
          size="lg"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save All Changes"}
        </Button>
      </div>
    </AdminLayout>
  );
}
