// Shared writer for public.email_logs.
// Failures are swallowed so logging never breaks the main send flow.

export interface EmailLogEntry {
  recipient: string;
  sender: string;
  subject: string;
  purpose?: string;
  status: "sent" | "failed";
  error?: string;
  triggered_by?: string;
}

export async function logEmail(svc: any, entry: EmailLogEntry): Promise<void> {
  try {
    await svc.from("email_logs").insert({
      recipient: entry.recipient || "",
      sender: entry.sender || "",
      subject: entry.subject || "",
      purpose: entry.purpose || "",
      status: entry.status,
      error: entry.error || "",
      triggered_by: entry.triggered_by || "system",
    });
  } catch (_) { /* swallow */ }
}

/**
 * Returns true if an identical email (same recipient + subject) was already
 * sent successfully within the last `windowSeconds` seconds. Used to guard
 * against rapid re-triggers (manual resend + webhook flip + cron all firing).
 */
export async function recentlySent(
  svc: any,
  recipient: string,
  subject: string,
  windowSeconds = 60,
): Promise<boolean> {
  try {
    const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
    const { data } = await svc
      .from("email_logs")
      .select("id")
      .eq("recipient", recipient)
      .eq("subject", subject)
      .eq("status", "sent")
      .gte("created_at", since)
      .limit(1);
    return !!(data && data.length > 0);
  } catch (_) {
    return false;
  }
}
