import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Save, CreditCard, Mail, MessageSquare, Webhook, HardDrive } from "lucide-react";
import { PaymentTab } from "@/components/admin/integrations/PaymentTab";
import { WebhookTab } from "@/components/admin/integrations/WebhookTab";
import { MailTab } from "@/components/admin/integrations/MailTab";
import { SmsTab } from "@/components/admin/integrations/SmsTab";
import { StorageTab } from "@/components/admin/integrations/StorageTab";

interface SettingsMap {
  [key: string]: string;
}

export default function AdminIntegrations() {
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
      toast({ title: "Settings saved" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
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
            <h2 className="text-xl font-display font-bold">Integrations</h2>
            <p className="text-sm text-muted-foreground">Manage payment, mail, SMS, webhook, and storage integrations</p>
          </div>
          <Button
            onClick={() => saveMutation.mutate(settings)}
            disabled={!dirty || saveMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save All"}
          </Button>
        </div>

        <Tabs defaultValue="payment" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="payment" className="gap-1.5 text-xs sm:text-sm">
              <CreditCard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Payment</span>
            </TabsTrigger>
            <TabsTrigger value="mail" className="gap-1.5 text-xs sm:text-sm">
              <Mail className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mail</span>
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">SMS</span>
            </TabsTrigger>
            <TabsTrigger value="webhook" className="gap-1.5 text-xs sm:text-sm">
              <Webhook className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Webhook</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payment">
            <PaymentTab settings={settings} update={update} />
          </TabsContent>

          <TabsContent value="mail">
            <MailTab />
          </TabsContent>

          <TabsContent value="sms">
            <SmsTab settings={settings} update={update} />
          </TabsContent>

          <TabsContent value="webhook">
            <WebhookTab settings={settings} update={update} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
