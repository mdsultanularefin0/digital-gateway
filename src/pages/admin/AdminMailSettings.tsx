import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Save, TestTube, Eye, EyeOff, Loader2, Mail, ShoppingBag, Newspaper, Bell } from "lucide-react";

const SMTP_FIELDS = [
  { key: "smtp_host", label: "SMTP Host", placeholder: "smtp.resend.com" },
  { key: "smtp_port", label: "Port", placeholder: "587" },
  { key: "smtp_username", label: "Username", placeholder: "resend" },
  { key: "smtp_password", label: "Password", placeholder: "••••••••", sensitive: true },
];

const IMAP_FIELDS = [
  { key: "imap_host", label: "IMAP Host", placeholder: "imap.gmail.com" },
  { key: "imap_port", label: "Port", placeholder: "993" },
  { key: "imap_username", label: "Username (if different)", placeholder: "Same as SMTP if empty" },
  { key: "imap_password", label: "Password (if different)", placeholder: "Same as SMTP if empty", sensitive: true },
];

const FROM_ADDRESSES = [
  { key: "from_support", label: "Support Inbox", icon: Mail, placeholder: "support@giftcardvibe.xyz", description: "Customer support emails & replies" },
  { key: "from_orders", label: "Order Confirmations", icon: ShoppingBag, placeholder: "noreply@giftcardvibe.xyz", description: "Order receipts & shipping updates" },
  { key: "from_newsletter", label: "Newsletter", icon: Newspaper, placeholder: "news@giftcardvibe.xyz", description: "Newsletter & marketing emails" },
  { key: "from_notifications", label: "Notifications", icon: Bell, placeholder: "contact@giftcardvibe.xyz", description: "System alerts & password resets" },
];

export default function AdminMailSettings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);

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

  const testConnection = async (type: "smtp" | "imap") => {
    setTesting(type);
    try {
      await saveMutation.mutateAsync(settings);
      const { data, error } = await supabase.functions.invoke("mail", {
        body: { action: `test-${type}` },
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

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold">Mail Settings</h2>
            <p className="text-sm text-muted-foreground">Configure SMTP, IMAP & sender addresses.</p>
          </div>
          <Button onClick={() => saveMutation.mutate(settings)} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" /> Save
          </Button>
        </div>

        {/* From Addresses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sender Addresses</CardTitle>
            <CardDescription>Different "From" addresses for each purpose.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {FROM_ADDRESSES.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  <f.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {f.label}
                </Label>
                <Input
                  placeholder={f.placeholder}
                  value={settings[f.key] ?? ""}
                  onChange={(e) => update(f.key, e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* SMTP */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SMTP (Outgoing)</CardTitle>
            <CardDescription>Shared SMTP credentials used by all senders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {SMTP_FIELDS.map((f) => (
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
            <div className="space-y-1.5">
              <Label>Encryption</Label>
              <Select value={settings.smtp_encryption ?? "tls"} onValueChange={(v) => update("smtp_encryption", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tls">STARTTLS</SelectItem>
                  <SelectItem value="ssl">SSL/TLS</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => testConnection("smtp")} disabled={testing === "smtp"}>
              {testing === "smtp" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
              Test SMTP
            </Button>
          </CardContent>
        </Card>

        {/* IMAP */}
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
            <Button variant="outline" size="sm" onClick={() => testConnection("imap")} disabled={testing === "imap"}>
              {testing === "imap" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
              Test IMAP
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
