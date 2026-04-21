import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Save, Mail, MessageSquare, Webhook, HardDrive, Brain, Share2 } from "lucide-react";
import { WebhookTab } from "@/components/admin/integrations/WebhookTab";
import { MailTab } from "@/components/admin/integrations/MailTab";
import { SmsTab } from "@/components/admin/integrations/SmsTab";
import { StorageTab } from "@/components/admin/integrations/StorageTab";
import { AiTab } from "@/components/admin/integrations/AiTab";
import { SocialMetaTab } from "@/components/admin/integrations/SocialMetaTab";

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-display font-bold">Integrations</h2>
            <p className="text-sm text-muted-foreground">Manage payment, mail, SMS, webhook, and storage integrations</p>
          </div>
          <Button
            onClick={() => saveMutation.mutate(settings)}
            disabled={!dirty || saveMutation.isPending}
            className="gap-2 w-full sm:w-auto"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save All"}
          </Button>
        </div>

        <Tabs defaultValue="mail" className="w-full">
          <TabsList className="w-full h-auto flex flex-wrap gap-1 p-1 sm:grid sm:grid-cols-6">
            <TabsTrigger value="mail" className="flex-1 min-w-[30%] gap-1.5 text-xs sm:text-sm">
              <Mail className="h-3.5 w-3.5" />
              <span className="sm:inline">Mail</span>
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex-1 min-w-[30%] gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="sm:inline">SMS</span>
            </TabsTrigger>
            <TabsTrigger value="webhook" className="flex-1 min-w-[30%] gap-1.5 text-xs sm:text-sm">
              <Webhook className="h-3.5 w-3.5" />
              <span className="sm:inline">Webhook</span>
            </TabsTrigger>
            <TabsTrigger value="storage" className="flex-1 min-w-[30%] gap-1.5 text-xs sm:text-sm">
              <HardDrive className="h-3.5 w-3.5" />
              <span className="sm:inline">Storage</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex-1 min-w-[30%] gap-1.5 text-xs sm:text-sm">
              <Brain className="h-3.5 w-3.5" />
              <span className="sm:inline">AI</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="flex-1 min-w-[30%] gap-1.5 text-xs sm:text-sm">
              <Share2 className="h-3.5 w-3.5" />
              <span className="sm:inline">Social</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mail">
            <div><MailTab /></div>
          </TabsContent>

          <TabsContent value="sms">
            <div><SmsTab settings={settings} update={update} /></div>
          </TabsContent>

          <TabsContent value="webhook">
            <div><WebhookTab settings={settings} update={update} /></div>
          </TabsContent>

          <TabsContent value="storage">
            <div><StorageTab settings={settings} update={update} /></div>
          </TabsContent>

          <TabsContent value="ai">
            <div><AiTab settings={settings} update={update} /></div>
          </TabsContent>

          <TabsContent value="social">
            <div><SocialMetaTab settings={settings} update={update} /></div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
