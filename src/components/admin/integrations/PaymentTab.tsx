import { CreditCard } from "lucide-react";

interface PaymentTabProps {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
}

const BKASH_FIELDS = [
  {
    key: "bkash_sandbox", label: "Environment", type: "select", options: [
      { value: "true", label: "Sandbox (Testing)" },
      { value: "false", label: "Production (Live)" },
    ]
  },
];

export function PaymentTab({ settings, update }: PaymentTabProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/10">
            <CreditCard className="h-4 w-4 text-pink-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">bKash Payment Gateway</h3>
            <p className="text-xs text-muted-foreground">Tokenized Checkout integration for accepting bKash payments</p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {BKASH_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                {field.label}
              </label>
              {field.type === "select" ? (
                <select
                  value={settings[field.key] || field.options[0].value}
                  onChange={(e) => update(field.key, e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm"
                >
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : null}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            bKash credentials (App Key, App Secret, Username, Password) are securely stored as backend secrets and cannot be viewed here.
            Contact your administrator to update them.
          </p>
        </div>
      </section>
    </div>
  );
}
