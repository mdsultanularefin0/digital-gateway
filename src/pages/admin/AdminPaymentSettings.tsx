import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Save, CreditCard, Smartphone, Upload, X, Loader2 } from "lucide-react";
import { uploadToStorage } from "@/lib/storage";

interface SettingsMap {
  [key: string]: string;
}

const AVAILABLE_PAYMENT_METHODS = [
  { value: "cod", label: "Cash on Delivery", description: "Customer pays on delivery" },
  { value: "bkash", label: "bKash (PGW)", description: "Tokenized checkout via bKash payment gateway" },
  { value: "bkash_send", label: "bKash Send Money", description: "Customer sends money manually to your bKash number" },
  { value: "nagad_send", label: "Nagad Send Money", description: "Customer sends money manually to your Nagad number" },
  { value: "bank", label: "Bank Transfer", description: "Direct bank transfer" },
  { value: "stripe", label: "Credit/Debit Card", description: "Online card payments via Stripe" },
];

export default function AdminPaymentSettings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [dirty, setDirty] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["site-settings-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("key, value");
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (rows && Array.isArray(rows)) {
      const map: SettingsMap = {};
      rows.forEach((r) => (map[r.key] = r.value));
      setSettings(map);
    }
  }, [rows]);

  const saveMutation = useMutation({
    mutationFn: async (entries: SettingsMap) => {
      for (const [key, value] of Object.entries(entries)) {
        if (value === "••••••••") continue;
        const { error } = await supabase
          .from("site_settings")
          .upsert({ key, value }, { onConflict: "key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings-admin"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      setDirty(false);
      toast({ title: "Payment settings saved" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  // Payment methods toggle
  let enabledMethods: string[] = [];
  try { enabledMethods = JSON.parse(settings.payment_methods || '["cod"]'); } catch { enabledMethods = ["cod"]; }

  const toggleMethod = (method: string) => {
    const next = enabledMethods.includes(method)
      ? enabledMethods.filter((m) => m !== method)
      : [...enabledMethods, method];
    update("payment_methods", JSON.stringify(next));
  };

  const inputClass = "h-9 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);
  const handleLogoUpload = async (method: string, file: File) => {
    setUploadingLogo(method);
    try {
      const result = await uploadToStorage(file, "assets");
      update(`payment_logo_${method}`, result.url);
      toast({ title: "Logo uploaded", description: "Save to apply changes." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingLogo(null);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold">Payment Settings</h2>
            <p className="text-sm text-muted-foreground">Configure payment methods and provider settings</p>
          </div>
          <Button
            onClick={() => saveMutation.mutate(settings)}
            disabled={!dirty || saveMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>

        {/* Enabled Payment Methods */}
        <section className="rounded-xl border border-border">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Enabled Payment Methods</h3>
              <p className="text-xs text-muted-foreground">Choose which payment methods to show at checkout</p>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {AVAILABLE_PAYMENT_METHODS.map((m) => {
              const isEnabled = enabledMethods.includes(m.value);
              const logoUrl = settings[`payment_logo_${m.value}`] || "";
              const isUploading = uploadingLogo === m.value;
              return (
                <div key={m.value} className={`rounded-xl border p-3 transition-colors ${isEnabled ? "border-primary bg-primary/5" : "border-border"}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => toggleMethod(m.value)}
                      className="h-4 w-4 accent-primary rounded"
                    />
                    {logoUrl ? (
                      <img src={logoUrl} alt={m.label} className="h-7 w-7 object-contain rounded" />
                    ) : (
                      <div className="h-7 w-7 rounded bg-muted flex items-center justify-center text-[9px] text-muted-foreground">No logo</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{m.label}</span>
                      <p className="text-xs text-muted-foreground">{m.description}</p>
                    </div>
                  </label>
                  {isEnabled && (
                    <div className="mt-4 ml-7 space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Display Name (Label)</label>
                        <input
                          value={settings[`payment_label_${m.value}`] || m.label}
                          onChange={(e) => update(`payment_label_${m.value}`, e.target.value)}
                          className={inputClass}
                          placeholder={m.label}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors">
                          {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                          {logoUrl ? "Replace logo" : "Upload logo"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleLogoUpload(m.value, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {logoUrl && (
                          <button
                            type="button"
                            onClick={() => update(`payment_logo_${m.value}`, "")}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg border border-border text-destructive hover:bg-destructive/5"
                          >
                            <X className="h-3 w-3" /> Remove
                          </button>
                        )}
                        <span className="text-[10px] text-muted-foreground">PNG/SVG, square recommended</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {enabledMethods.length === 0 && (
              <p className="text-xs text-destructive">At least one payment method should be enabled.</p>
            )}
          </div>
        </section>

        {/* bKash PGW Config */}
        {enabledMethods.includes("bkash") && (
          <section className="rounded-xl border border-border">
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/10">
                <CreditCard className="h-4 w-4 text-pink-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">bKash Payment Gateway (PGW)</h3>
                <p className="text-xs text-muted-foreground">Tokenized Checkout integration</p>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Environment</label>
                <select
                  value={settings.bkash_sandbox || "true"}
                  onChange={(e) => update("bkash_sandbox", e.target.value)}
                  className={inputClass}
                >
                  <option value="true">Sandbox (Testing)</option>
                  <option value="false">Production (Live)</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                bKash PGW credentials (App Key, App Secret, Username, Password) are stored as backend secrets.
              </p>
            </div>
          </section>
        )}

        {/* bKash Send Money Config */}
        {enabledMethods.includes("bkash_send") && (
          <section className="rounded-xl border border-border">
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/10">
                <Smartphone className="h-4 w-4 text-pink-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">bKash Send Money</h3>
                <p className="text-xs text-muted-foreground">Manual send money payment — customer sends to your number</p>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  bKash Number (Merchant)
                </label>
                <input
                  value={settings.bkash_send_number || ""}
                  onChange={(e) => update("bkash_send_number", e.target.value)}
                  className={inputClass}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Instructions (shown to customer)
                </label>
                <textarea
                  value={settings.bkash_send_instructions || ""}
                  onChange={(e) => update("bkash_send_instructions", e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="1. Open bKash app&#10;2. Tap Send Money&#10;3. Enter the number shown&#10;4. Enter the exact amount&#10;5. Submit your sender number and TrxID below"
                />
              </div>
            </div>
          </section>
        )}

        {/* Nagad Send Money Config */}
        {enabledMethods.includes("nagad_send") && (
          <section className="rounded-xl border border-border">
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10">
                <Smartphone className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Nagad Send Money</h3>
                <p className="text-xs text-muted-foreground">Manual send money payment — customer sends to your Nagad number</p>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Nagad Number (Merchant)
                </label>
                <input
                  value={settings.nagad_send_number || ""}
                  onChange={(e) => update("nagad_send_number", e.target.value)}
                  className={inputClass}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Instructions (shown to customer)
                </label>
                <textarea
                  value={settings.nagad_send_instructions || ""}
                  onChange={(e) => update("nagad_send_instructions", e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="1. Open Nagad app&#10;2. Tap Send Money&#10;3. Enter the number shown&#10;4. Enter the exact amount&#10;5. Submit your sender number and TrxID below"
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
