import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Save, X, Mail, Globe, Package, ShoppingBag, CreditCard, UserPlus, Truck, ListOrdered, Eye, Clock } from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { EmailSendPlanEditor } from "@/components/admin/EmailSendPlanEditor";
import { EmailTemplatePreview } from "@/components/admin/EmailTemplatePreview";

interface EmailTemplate {
  id: string;
  product_id: string | null;
  name: string;
  subject: string;
  body_html: string;
  is_global: boolean;
  active: boolean;
  category: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
}

const CATEGORIES = [
  { value: "post_purchase", label: "Post-Purchase / Delivery", icon: Package, description: "Sent after purchase — download links, access instructions" },
  { value: "order_confirmation", label: "Order Confirmation", icon: ShoppingBag, description: "Sent immediately when an order is placed" },
  { value: "payment_verified", label: "Payment Verified", icon: CreditCard, description: "Sent when payment is confirmed/verified" },
  { value: "account_created", label: "Account Created", icon: UserPlus, description: "Sent when a customer account is auto-created with login credentials" },
  { value: "payment_reminder", label: "Payment Reminder", icon: Clock, description: "Sent to remind customers to complete pending payments — includes login link" },
  { value: "shipping_update", label: "Shipping Update", icon: Truck, description: "Sent when order ships or delivery status changes" },
];

const CATEGORY_VARIABLES: Record<string, { key: string; desc: string }[]> = {
  post_purchase: [
    { key: "customer_name", desc: "Customer's full name" },
    { key: "order_number", desc: "Order number" },
    { key: "product_name", desc: "Product name" },
  ],
  order_confirmation: [
    { key: "customer_name", desc: "Customer's full name" },
    { key: "order_number", desc: "Order number" },
    { key: "product_name", desc: "Product names" },
    { key: "order_total", desc: "Order total amount" },
    { key: "payment_method", desc: "Payment method used" },
    { key: "product_content", desc: "Delivery block (codes, downloads, credentials)" },
  ],
  payment_verified: [
    { key: "customer_name", desc: "Customer's full name" },
    { key: "order_number", desc: "Order number" },
    { key: "order_total", desc: "Order total amount" },
    { key: "transaction_id", desc: "Payment transaction ID" },
    { key: "product_content", desc: "Delivery block (codes, downloads, credentials)" },
  ],
  account_created: [
    { key: "customer_name", desc: "Customer's full name" },
    { key: "customer_email", desc: "Login email address" },
    { key: "password", desc: "Auto-generated password" },
    { key: "login_url", desc: "Login page URL" },
  ],
  payment_reminder: [
    { key: "customer_name", desc: "Customer's full name" },
    { key: "customer_email", desc: "Login email address" },
    { key: "order_number", desc: "Order number" },
    { key: "order_total", desc: "Order total amount" },
    { key: "product_name", desc: "Product names" },
    { key: "payment_method", desc: "Payment method used" },
    { key: "password", desc: "Auto-generated password (if new account)" },
    { key: "magic_link", desc: "One-click login link (auto-generated, expires in 24h)" },
    { key: "payment_link", desc: "Direct link to view & pay the order" },
    { key: "login_url", desc: "Login page URL" },
  ],
  shipping_update: [
    { key: "customer_name", desc: "Customer's full name" },
    { key: "order_number", desc: "Order number" },
    { key: "tracking_number", desc: "Tracking number" },
    { key: "shipping_carrier", desc: "Shipping carrier name" },
  ],
};

const emptyTemplate: Omit<EmailTemplate, "id" | "created_at"> = {
  product_id: null,
  name: "",
  subject: "",
  body_html: "",
  is_global: false,
  active: true,
  category: "post_purchase",
};

export default function AdminEmailTemplates() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState(emptyTemplate);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [view, setView] = useState<"templates" | "plans">("templates");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [paymentReminderDelay, setPaymentReminderDelay] = useState(30);

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

  const { data: sendPlanRows = [] } = useQuery({
    queryKey: ["admin-email-send-plan-global"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_send_plan")
        .select("id, category, template_id, delay_minutes, enabled")
        .is("product_id", null)
        .order("step_order");
      if (error) throw error;
      return data || [];
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
        category: data.category,
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

  const createPaymentReminderMutation = useMutation({
    mutationFn: async () => {
      const existing = templates.find((t) => t.category === "payment_reminder");
      let templateId = existing?.id;
      if (existing) {
        const { error } = await supabase
          .from("product_email_templates")
          .update({ active: true, is_global: true, product_id: null })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("product_email_templates")
          .insert({
            product_id: null,
            name: "Payment Reminder",
            subject: "Complete your payment for {{order_number}}",
            category: "payment_reminder",
            is_global: true,
            active: true,
            body_html: `<p>Hi {{customer_name}},</p><p>Your order <strong>{{order_number}}</strong> for <strong>{{order_total}}</strong> is waiting for payment.</p><p>Product: {{product_name}}</p><p>Payment method: {{payment_method}}</p><p><a href="{{payment_link}}" style="display:inline-block;background:#0ea5e9;color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Complete Payment</a></p><p>You can also sign in here: <a href="{{magic_link}}">{{magic_link}}</a></p>`,
          })
          .select("id")
          .single();
        if (error) throw error;
        templateId = data.id;
      }
      if (!templateId) throw new Error("Payment Reminder template could not be created");
      const alreadyPlanned = sendPlanRows.some((row: any) => row.template_id === templateId || row.category === "payment_reminder");
      if (!alreadyPlanned) {
        const { count } = await supabase
          .from("email_send_plan")
          .select("id", { count: "exact", head: true })
          .is("product_id", null);
        const { error } = await supabase.from("email_send_plan").insert({
          product_id: null,
          category: "payment_reminder",
          template_id: templateId,
          step_order: count || 0,
          delay_minutes: Math.max(1, paymentReminderDelay || 30),
          enabled: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-email-templates"] });
      queryClient.invalidateQueries({ queryKey: ["admin-email-send-plan-global"] });
      queryClient.invalidateQueries({ queryKey: ["email-send-plan"] });
      toast({ title: "Payment Reminder activated", description: "It will send only while the order is unpaid." });
    },
    onError: (err: any) => toast({ title: "Setup failed", description: err.message, variant: "destructive" }),
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
        category: template.category || "post_purchase",
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

  const getCategoryInfo = (cat: string) => CATEGORIES.find((c) => c.value === cat) || CATEGORIES[0];

  const filteredTemplates = activeCategory === "all"
    ? templates
    : templates.filter((t) => (t.category || "post_purchase") === activeCategory);
  const requiredCategories = ["account_created", "payment_reminder", "payment_verified", "order_confirmation"];
  const missingCategories = requiredCategories.filter((category) => !templates.some((t) => t.category === category));
  const paymentReminderTemplate = templates.find((t) => t.category === "payment_reminder");
  const paymentReminderPlan = sendPlanRows.find((row: any) => row.category === "payment_reminder" || row.template_id === paymentReminderTemplate?.id);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>
      </AdminLayout>
    );
  }

  // Editor view
  if (editing) {
    const currentVars = CATEGORY_VARIABLES[form.category] || CATEGORY_VARIABLES.post_purchase;
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
            {/* Category selector */}
            <div className="space-y-2">
              <Label>Template Category *</Label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <label
                      key={cat.value}
                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                        form.category === cat.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-foreground/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name="template-category"
                        value={cat.value}
                        checked={form.category === cat.value}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="sr-only"
                      />
                      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${form.category === cat.value ? "text-primary" : "text-muted-foreground"}`} />
                      <div>
                        <p className="text-sm font-medium">{cat.label}</p>
                        <p className="text-xs text-muted-foreground">{cat.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

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
              <div className="rounded-lg bg-muted/50 p-3 mb-2">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Available variables for this category:</p>
                <div className="flex flex-wrap gap-1.5">
                  {currentVars.map((v) => (
                    <span key={v.key} className="inline-flex items-center gap-1 text-xs bg-background border border-border px-2 py-1 rounded-md" title={v.desc}>
                      <code className="font-mono text-primary">{`{{${v.key}}}`}</code>
                      <span className="text-muted-foreground">— {v.desc}</span>
                    </span>
                  ))}
                </div>
              </div>
              <RichTextEditor
                value={form.body_html}
                onChange={(v) => setForm({ ...form, body_html: v })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setEditing(null); setForm(emptyTemplate); }}>
                Cancel
              </Button>
              <Button variant="outline" onClick={() => setPreviewOpen(true)} className="gap-2">
                <Eye className="h-4 w-4" /> Preview
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </div>
        </div>

        <EmailTemplatePreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          subject={form.subject}
          bodyHtml={form.body_html}
          category={form.category}
        />
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
              Create email templates for order confirmations, payment notifications, account setup, and more
            </p>
          </div>
          {view === "templates" && (
            <Button onClick={() => openEditor()} className="gap-2">
              <Plus className="h-4 w-4" /> New Template
            </Button>
          )}
        </div>

        {/* View tabs: templates vs plans */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-2">
          <button
            onClick={() => setView("templates")}
            className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${
              view === "templates" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="h-3.5 w-3.5" /> Templates
          </button>
          <button
            onClick={() => setView("plans")}
            className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${
              view === "plans" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListOrdered className="h-3.5 w-3.5" /> Send plans
          </button>
        </div>

        {view === "plans" ? (
          <EmailSendPlanEditor />
        ) : (
        <>
        {/* Category filter tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              activeCategory === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({templates.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = templates.filter((t) => (t.category || "post_purchase") === cat.value).length;
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  activeCategory === cat.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3 w-3" />
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">
              {activeCategory === "all" ? "No email templates yet" : `No ${getCategoryInfo(activeCategory).label} templates`}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create templates to send automated emails for orders, payments, and account creation.
            </p>
            <Button onClick={() => openEditor()} className="gap-2">
              <Plus className="h-4 w-4" /> Create Template
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTemplates.map((t) => {
              const catInfo = getCategoryInfo(t.category || "post_purchase");
              const CatIcon = catInfo.icon;
              return (
                <div
                  key={t.id}
                  className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition-colors ${
                    t.active ? "border-border" : "border-border/50 opacity-60"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                        <CatIcon className="h-3 w-3" /> {catInfo.label}
                      </span>
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
              );
            })}
          </div>
        )}
        </>
        )}
      </div>
    </AdminLayout>
  );
}
