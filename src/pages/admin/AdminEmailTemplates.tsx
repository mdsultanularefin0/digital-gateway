import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Save, X, Mail, Globe, Package } from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

interface EmailTemplate {
  id: string;
  product_id: string | null;
  name: string;
  subject: string;
  body_html: string;
  is_global: boolean;
  active: boolean;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
}

const emptyTemplate: Omit<EmailTemplate, "id" | "created_at"> = {
  product_id: null,
  name: "",
  subject: "",
  body_html: "",
  is_global: false,
  active: true,
};

export default function AdminEmailTemplates() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState(emptyTemplate);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["admin-email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_email_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug")
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const payload = {
        product_id: data.is_global ? null : data.product_id,
        name: data.name,
        subject: data.subject,
        body_html: data.body_html,
        is_global: data.is_global,
        active: data.active,
      };

      if (data.id) {
        const { error } = await supabase
          .from("product_email_templates")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("product_email_templates")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-email-templates"] });
      setEditing(null);
      setForm(emptyTemplate);
      toast({ title: "Template saved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_email_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-email-templates"] });
      toast({ title: "Template deleted" });
    },
  });

  const openEditor = (template?: EmailTemplate) => {
    if (template) {
      setEditing(template);
      setForm({
        product_id: template.product_id,
        name: template.name,
        subject: template.subject,
        body_html: template.body_html,
        is_global: template.is_global,
        active: template.active,
      });
    } else {
      setEditing({} as EmailTemplate);
      setForm(emptyTemplate);
    }
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.subject.trim()) {
      toast({ title: "Name and subject are required", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ ...form, id: editing?.id });
  };

  const getProductName = (productId: string | null) => {
    if (!productId) return null;
    return products.find((p) => p.id === productId)?.name || "Unknown";
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>
      </AdminLayout>
    );
  }

  // Editor view
  if (editing) {
    return (
      <AdminLayout>
        <div className="max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold">
              {editing.id ? "Edit Template" : "New Email Template"}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => { setEditing(null); setForm(emptyTemplate); }}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          </div>

          <div className="rounded-xl border border-border p-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Ebook Delivery, Course Access Link"
                />
              </div>
              <div className="space-y-2">
                <Label>Email Subject *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Your download is ready! 🎉"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_global}
                  onCheckedChange={(v) => setForm({ ...form, is_global: v, product_id: v ? null : form.product_id })}
                />
                <Label className="text-sm">Global template (fallback for all products)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                />
                <Label className="text-sm">Active</Label>
              </div>
            </div>

            {!form.is_global && (
              <div className="space-y-2">
                <Label>Assign to Product</Label>
                <select
                  value={form.product_id || ""}
                  onChange={(e) => setForm({ ...form, product_id: e.target.value || null })}
                  className="h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Select a product —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Email Body</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Use the editor to add text, links, buttons, images, etc. 
                Variables: <code className="bg-muted px-1 rounded">{"{{customer_name}}"}</code>, 
                <code className="bg-muted px-1 rounded">{"{{order_number}}"}</code>, 
                <code className="bg-muted px-1 rounded">{"{{product_name}}"}</code>
              </p>
              <RichTextEditor
                value={form.body_html}
                onChange={(v) => setForm({ ...form, body_html: v })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setEditing(null); setForm(emptyTemplate); }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // List view
  return (
    <AdminLayout>
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold">Email Templates</h2>
            <p className="text-sm text-muted-foreground">
              Create post-purchase email templates with custom content, links, and instructions
            </p>
          </div>
          <Button onClick={() => openEditor()} className="gap-2">
            <Plus className="h-4 w-4" /> New Template
          </Button>
        </div>

        {templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">No email templates yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create templates to send custom post-purchase emails with download links, access instructions, or any content.
            </p>
            <Button onClick={() => openEditor()} className="gap-2">
              <Plus className="h-4 w-4" /> Create First Template
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition-colors ${
                  t.active ? "border-border" : "border-border/50 opacity-60"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {t.is_global ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        <Globe className="h-3 w-3" /> Global
                      </span>
                    ) : t.product_id ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                        <Package className="h-3 w-3" /> {getProductName(t.product_id)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        Unassigned
                      </span>
                    )}
                    {!t.active && (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold truncate">{t.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">Subject: {t.subject}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEditor(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Delete this template?")) deleteMutation.mutate(t.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
