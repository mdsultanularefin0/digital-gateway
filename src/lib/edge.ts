/**
 * Centralized helper for calling Supabase Edge Functions from the browser.
 * Removes duplicated `https://${projectId}.supabase.co/functions/v1/...` URLs
 * scattered across pages/components.
 */
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const baseHeaders = {
  "Content-Type": "application/json",
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
};

export function edgeUrl(name: string, query?: string) {
  const qs = query ? `?${query}` : "";
  return `https://${PROJECT_ID}.supabase.co/functions/v1/${name}${qs}`;
}

export async function callEdge<T = any>(
  name: string,
  body?: Record<string, unknown>,
  opts?: { query?: string; method?: string }
): Promise<T> {
  const res = await fetch(edgeUrl(name, opts?.query), {
    method: opts?.method || "POST",
    headers: baseHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  return (await res.json()) as T;
}

/**
 * Fire-and-forget edge call (errors silently swallowed).
 * Use for webhooks/notifications that should not block UX.
 */
export function fireEdge(name: string, body?: Record<string, unknown>) {
  fetch(edgeUrl(name), {
    method: "POST",
    headers: baseHeaders,
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => {});
}
