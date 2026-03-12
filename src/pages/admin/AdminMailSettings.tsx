import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Save, TestTube, Eye, EyeOff, Loader2, Mail, ShoppingBag, Newspaper, Bell } from "lucide-react";

const PURPOSES = [
  { id: "support", label: "Support Inbox", icon: Mail, description: "Customer support emails & replies" },
  { id: "orders", label: "Order Confirmations", icon: ShoppingBag, description: "Order receipts & shipping updates" },
  { id: "newsletter", label: "Newsletter", icon: Newspaper, description: "Newsletter & marketing emails" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "System alerts & password resets" },
] as const;

type PurposeId = typeof PURPOSES[number]["id"];

const SMTP_FIELDS = [
  { key: "smtp_host", label: "SMTP Host", placeholder: "smtp.resend.com" },
  { key: "smtp_port", label: "Port", placeholder: "587" },
  { key: "smtp_username", label: "Username", placeholder: "resend" },
  { key: "smtp_password", label: "Password", placeholder: "••••••••", sensitive: true },
  { key: "smtp_from", label: "From Address", placeholder: "noreply@example.com" },
];

const IMAP_FIELDS = [
  { key: "imap_host", label: "IMAP Host", placeholder: "imap.gmail.com" },
  { key: "imap_port", label: "Port", placeholder: "993" },
  { key: "imap_username", label: "Username (if different)", placeholder: "Same as SMTP if empty" },
  { key: "imap_password", label: "Password (if different)", placeholder: "Same as SMTP if empty", sensitive: true },
];

function prefixKey(purpose: PurposeId, key: string) {
  return `${purpose}.${key}`;
}

export default function AdminMailSettings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PurposeId>("support");

  const { isLoading } = useQuery({
    queryKey: ["mail-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mail_config").select("key, value");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { map[r.key] = r.value; });
      setSettings(map);
      return map;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (entries: Record<string, string>) => {
      for (const [key, value] of Object.entries(entries)) {
        if (value === "••••••••") continue;
        await supabase.from("mail_config").upsert({ key, value }, { onConflict: "key" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail-config"] });
      toast({ title: "Saved", description: "Mail settings updated." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = (key: string, value: string) => setSettings((s) => ({ ...s, [key]: value }));

  // Get value for a purpose-prefixed key, falling back to legacy unprefixed key
  const getValue = (purpose: PurposeId, key: string): string => {
    const prefixed = prefixKey(purpose, key);
    if (settings[prefixed] !== undefined && settings[prefixed] !== "") return settings[prefixed];
    // Fall back to legacy keys (unprefixed) for backward compat
    if (purpose === "support" && settings[key] !== undefined) return settings[key];
    return "";
  };

  const updatePurpose = (purpose: PurposeId, key: string, value: string) => {
    update(prefixKey(purpose, key), value);
  };

  // Check if this purpose uses its own config or inherits from support
  const usesOwnConfig = (purpose: PurposeId): boolean => {
    if (purpose === "support") return true;
    return settings[`${purpose}.use_own_smtp`] === "true";
  };

  const toggleOwnConfig = (purpose: PurposeId, enabled: boolean) => {
    update(`${purpose}.use_own_smtp`, enabled ? "true" : "false");
  };

  const testConnection = async (type: "smtp" | "imap", purpose: PurposeId) => {
    const testKey = `${type}-${purpose}`;
    setTesting(testKey);
    try {
      await saveMutation.mutateAsync(settings);
      const { data, error } = await supabase.functions.invoke("mail", {
        body: { action: `test-${type}`, purpose },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: `${type.toUpperCase()} OK`, description: data.greeting || "Connected!" });
      } else {
        throw new Error(data?.error || "Connection failed");
      }
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setTesting(null);
    }
  };

  const saveAll = () => saveMutation.mutate(settings);

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold">Mail Settings</h2>
            <p className="text-sm text-muted-foreground">Configure SMTP for each purpose. Non-support purposes can inherit support config.</p>
          </div>
          <Button onClick={saveAll} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" /> Save All
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PurposeId)}>
          <TabsList className="grid grid-cols-4 w-full">
            {PURPOSES.map((p) => (
              <TabsTrigger key={p.id} value={p.id} className="flex items-center gap-1.5 text-xs">
                <p.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{p.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {PURPOSES.map((purpose) => (
            <TabsContent key={purpose.id} value={purpose.id} className="space-y-4 mt-4">
              {/* Toggle for non-support purposes */}
              {purpose.id !== "support" && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Use separate SMTP for {purpose.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {usesOwnConfig(purpose.id) ? "Using its own SMTP credentials" : "Inheriting from Support Inbox config"}
                        </p>
                      </div>
                      <Switch
                        checked={usesOwnConfig(purpose.id)}
                        onCheckedChange={(v) => toggleOwnConfig(purpose.id, v)}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SMTP Card */}
              <Card className={!usesOwnConfig(purpose.id) ? "opacity-50 pointer-events-none" : ""}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <purpose.icon className="h-4 w-4" />
                    SMTP (Outgoing) — {purpose.label}
                  </CardTitle>
                  <CardDescription>{purpose.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {SMTP_FIELDS.map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label>{f.label}</Label>
                      <div className="relative">
                        <Input
                          type={f.sensitive && !visible[prefixKey(purpose.id, f.key)] ? "password" : "text"}
                          placeholder={f.placeholder}
                          value={getValue(purpose.id, f.key)}
                          onChange={(e) => updatePurpose(purpose.id, f.key, e.target.value)}
                        />
                        {f.sensitive && (
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setVisible((v) => ({ ...v, [prefixKey(purpose.id, f.key)]: !v[prefixKey(purpose.id, f.key)] }))}
                          >
                            {visible[prefixKey(purpose.id, f.key)] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <Label>Encryption</Label>
                    <Select
                      value={getValue(purpose.id, "smtp_encryption") || "tls"}
                      onValueChange={(v) => updatePurpose(purpose.id, "smtp_encryption", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tls">STARTTLS</SelectItem>
                        <SelectItem value="ssl">SSL/TLS</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => testConnection("smtp", purpose.id)} disabled={!!testing}>
                    {testing === `smtp-${purpose.id}` ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                    Test SMTP
                  </Button>
                </CardContent>
              </Card>

              {/* IMAP only for support */}
              {purpose.id === "support" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">IMAP (Incoming)</CardTitle>
                    <CardDescription>Used to fetch support inbox emails.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {IMAP_FIELDS.map((f) => (
                      <div key={f.key} className="space-y-1.5">
                        <Label>{f.label}</Label>
                        <div className="relative">
                          <Input
                            type={f.sensitive && !visible[f.key] ? "password" : "text"}
                            placeholder={f.placeholder}
                            value={settings[f.key] ?? ""}
                            onChange={(e) => update(f.key, e.target.value)}
                          />
                          {f.sensitive && (
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              onClick={() => setVisible((v) => ({ ...v, [f.key]: !v[f.key] }))}
                            >
                              {visible[f.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => testConnection("imap", "support")} disabled={!!testing}>
                      {testing === "imap-support" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                      Test IMAP
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
