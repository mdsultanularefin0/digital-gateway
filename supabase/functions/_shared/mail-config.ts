// Shared mail config loader + from-address resolver.
// Single source of truth for both `mail` and `send-order-confirmation` functions.

export type MailConfig = Record<string, string>;

export async function getMailConfig(svc: any): Promise<MailConfig> {
  const { data, error } = await svc.from("mail_config").select("key, value");
  if (error) throw new Error("Failed to load mail config: " + error.message);
  const cfg: MailConfig = {};
  (data ?? []).forEach((r: { key: string; value: string }) => { cfg[r.key] = r.value; });
  return cfg;
}

// Map template categories / purposes → which configured "from" address to use.
const CATEGORY_TO_FROM: Record<string, string> = {
  // notifications
  account_created: "from_notifications",
  password_reset: "from_notifications",
  notifications: "from_notifications",

  // orders / commerce
  order_confirmation: "from_orders",
  payment_verified: "from_orders",
  payment_reminder: "from_orders",
  post_purchase: "from_orders",
  shipping: "from_orders",
  refund: "from_orders",
  orders: "from_orders",

  // newsletter
  newsletter: "from_newsletter",

  // support (default)
  support: "from_support",
};

export function resolveFrom(cfg: MailConfig, category?: string): string {
  const key = category ? CATEGORY_TO_FROM[category] : undefined;
  const candidates = [
    key ? cfg[key] : "",
    cfg.from_support,
    cfg.smtp_from,
    cfg.smtp_username,
  ];
  for (const c of candidates) {
    if (c && c.trim()) return c.trim();
  }
  return "";
}
