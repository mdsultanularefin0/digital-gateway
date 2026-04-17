import { MessageSquare } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface SmsTabProps {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
}

const SMS_FIELDS = [
  { key: "sms_provider", label: "Provider", type: "select", options: [
    { value: "twilio", label: "Twilio" },
    { value: "vonage", label: "Vonage (Nexmo)" },
    { value: "custom", label: "Custom API" },
  ]},
  { key: "sms_api_key", label: "API Key", placeholder: "Your SMS provider API key", sensitive: true },
  { key: "sms_api_secret", label: "API Secret", placeholder: "Your SMS provider API secret", sensitive: true },
  { key: "sms_sender_id", label: "Sender ID / Phone Number", placeholder: "+880..." },
];

const SMS_EVENTS = [
  { key: "sms_on_order", label: "New order placed" },
  { key: "sms_on_shipped", label: "Order shipped" },
  { key: "sms_on_delivered", label: "Order delivered" },
];

export function SmsTab({ settings, update }: SmsTabProps) {
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  const toggleVisibility = (key: string) => {
    setVisibleFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10">
            <MessageSquare className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">SMS Notifications</h3>
            <p className="text-xs text-muted-foreground">Send order updates via SMS to customers</p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {SMS_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                {field.label}
              </label>
              {field.type === "select" ? (
                <select
                  value={settings[field.key] || field.options![0].value}
                  onChange={(e) => update(field.key, e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm"
                >
                  {field.options!.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
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
              )}
            </div>
          ))}

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              SMS Events
            </label>
            <div className="space-y-2">
              {SMS_EVENTS.map((evt) => (
                <label key={evt.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings[evt.key] !== "false"}
                    onChange={(e) => update(evt.key, e.target.checked ? "true" : "false")}
                    className="rounded border-border"
                  />
                  {evt.label}
                </label>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            SMS sending requires a configured provider. Credentials are saved to your site settings.
          </p>
        </div>
      </section>
    </div>
  );
}
