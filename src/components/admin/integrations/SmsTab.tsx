import { MessageSquare, Eye, EyeOff, Send, Loader2, Users, History } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SmsTabProps {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
}

const PROVIDER_OPTIONS = [
  { value: "brevo", label: "Brevo (Sendinblue)" },
  { value: "twilio", label: "Twilio" },
  { value: "vonage", label: "Vonage (Nexmo)" },
  { value: "custom", label: "Custom API" },
];

const BREVO_FIELDS = [
  { key: "brevo_api_key", label: "Brevo API Key", placeholder: "xkeysib-…", sensitive: true },
  { key: "brevo_sender_id", label: "Sender ID", placeholder: "MyBrand or +880…" },
];

const GENERIC_FIELDS = [
  { key: "sms_api_key", label: "API Key", placeholder: "Your SMS provider API key", sensitive: true },
  { key: "sms_api_secret", label: "API Secret", placeholder: "Your SMS provider API secret", sensitive: true },
  { key: "sms_sender_id", label: "Sender ID / Phone Number", placeholder: "+880…" },
];

const SMS_EVENTS = [
  { key: "sms_on_order", label: "Order confirmation (sent to customer on checkout)" },
  { key: "sms_on_payment_verified", label: "Payment verified (sent when manual MFS verified)" },
];

const TEMPLATE_FIELDS = [
  {
    key: "sms_template_order_confirmation",
    label: "Order confirmation template",
    placeholder: "Hi {{customer_name}}, your order {{order_number}} ({{order_total}}) is confirmed at {{site_name}}. Thank you!",
  },
  {
    key: "sms_template_payment_verified",
    label: "Payment verified template",
    placeholder: "Hi {{customer_name}}, payment for {{order_number}} ({{order_total}}) confirmed. Thank you!",
  },
];

export function SmsTab({ settings, update }: SmsTabProps) {
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [testTo, setTestTo] = useState("");
  const [testMsg, setTestMsg] = useState("Test SMS from your store ✓");
  const [sending, setSending] = useState(false);

  const [bulkRecipients, setBulkRecipients] = useState("");
  const [bulkMsg, setBulkMsg] = useState("");
  const [bulkSending, setBulkSending] = useState(false);

  const provider = (settings.sms_provider || "brevo").toLowerCase();
  const fields = provider === "brevo" ? BREVO_FIELDS : GENERIC_FIELDS;

  const toggleVisibility = (key: string) =>
    setVisibleFields((prev) => ({ ...prev, [key]: !prev[key] }));

  const sendSms = async (payload: Record<string, any>) => {
    const { data, error } = await supabase.functions.invoke("send-sms", { body: payload });
    if (error) throw error;
    if (data?.success === false) throw new Error(data.error || "SMS send failed");
    return data;
  };

  const handleTest = async () => {
    if (!testTo.trim() || !testMsg.trim()) {
      toast({ title: "Enter recipient and message", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const data = await sendSms({ recipient: testTo.trim(), content: testMsg.trim(), type: "transactional", tag: "test" });
      toast({ title: `SMS sent to ${data.count} recipient(s)` });
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleBulk = async () => {
    const list = bulkRecipients.split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean);
    if (list.length === 0 || !bulkMsg.trim()) {
      toast({ title: "Enter recipients and message", variant: "destructive" });
      return;
    }
    setBulkSending(true);
    try {
      const data = await sendSms({ recipients: list, content: bulkMsg.trim(), type: "marketing", tag: "promo" });
      toast({ title: `Promo sent to ${data.count} recipient(s)` });
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally {
      setBulkSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider config */}
      <section className="rounded-xl border border-border">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10">
            <MessageSquare className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">SMS Notifications</h3>
            <p className="text-xs text-muted-foreground">Send order updates and promotional messages via SMS</p>
          </div>
          <Link
            to="/admin/sms-logs"
            className="ml-auto h-8 px-3 rounded-xl border border-border bg-background text-xs font-medium hover:bg-muted inline-flex items-center gap-1.5"
          >
            <History className="h-3.5 w-3.5" /> View History
          </Link>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Provider
            </label>
            <select
              value={provider}
              onChange={(e) => update("sms_provider", e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              {PROVIDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {provider !== "brevo" && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Only Brevo is wired into the sending edge function. Other providers store credentials but won't send until implemented.
              </p>
            )}
          </div>

          {fields.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                {field.label}
              </label>
              <div className="relative">
                <input
                  type={field.sensitive && !visibleFields[field.key] ? "password" : "text"}
                  value={settings[field.key] || ""}
                  onChange={(e) => update(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 pr-10 text-sm"
                />
                {field.sensitive && (
                  <button
                    type="button"
                    onClick={() => toggleVisibility(field.key)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {visibleFields[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Automated SMS Events
            </label>
            <div className="space-y-2">
              {SMS_EVENTS.map((evt) => (
                <label key={evt.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings[evt.key] === "true"}
                    onChange={(e) => update(evt.key, e.target.checked ? "true" : "false")}
                    className="rounded border-border"
                  />
                  {evt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
              SMS Templates
            </label>
            {TEMPLATE_FIELDS.map((field) => (
              <div key={field.key}>
                <p className="text-[11px] text-muted-foreground mb-1">{field.label}</p>
                <textarea
                  value={settings[field.key] || ""}
                  onChange={(e) => update(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-y"
                />
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              Variables: <code className="text-foreground">{"{{customer_name}}"}</code>{" "}
              <code className="text-foreground">{"{{order_number}}"}</code>{" "}
              <code className="text-foreground">{"{{order_total}}"}</code>{" "}
              <code className="text-foreground">{"{{site_name}}"}</code>
            </p>
          </div>
        </div>
      </section>

      {/* Test SMS */}
      <section className="rounded-xl border border-border">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
            <Send className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Test SMS</h3>
            <p className="text-xs text-muted-foreground">Send a single test message to verify your configuration</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <input
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="Recipient phone (e.g. +8801XXXXXXXXX or 01XXXXXXXXX)"
            className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />
          <textarea
            value={testMsg}
            onChange={(e) => setTestMsg(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-y"
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={sending}
            className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send Test
          </button>
        </div>
      </section>

      {/* Bulk promotional */}
      <section className="rounded-xl border border-border">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10">
            <Users className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Promotional Broadcast</h3>
            <p className="text-xs text-muted-foreground">Send a one-off marketing SMS to a list of recipients</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            value={bulkRecipients}
            onChange={(e) => setBulkRecipients(e.target.value)}
            placeholder="Recipient numbers separated by commas, spaces or newlines"
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-y"
          />
          <textarea
            value={bulkMsg}
            onChange={(e) => setBulkMsg(e.target.value)}
            placeholder="Promotional message (will be sent as type=marketing)"
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-y"
          />
          <button
            type="button"
            onClick={handleBulk}
            disabled={bulkSending}
            className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {bulkSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send Broadcast
          </button>
          <p className="text-[11px] text-muted-foreground">
            Marketing SMS in many countries requires recipient consent. Make sure your audience has opted in.
          </p>
        </div>
      </section>
    </div>
  );
}
