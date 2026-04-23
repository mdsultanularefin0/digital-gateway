// Meta Pixel (Facebook Pixel) + Conversions API integration utility

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: (...args: any[]) => void;
  }
}

let pixelId: string | null = null;
let scriptLoaded = false;

/** Generate a unique event_id for deduplication between Pixel and CAPI */
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

// ── Cookie + identifier helpers ──────────────────────────────────────

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

/** Read _fbp cookie (Browser ID) */
function getFbp(): string | null {
  return getCookie("_fbp");
}

/**
 * Read _fbc cookie (Click ID). If absent but URL has fbclid, synthesize it
 * per Meta's spec: fb.1.<timestamp>.<fbclid> and persist as cookie.
 */
function getFbc(): string | null {
  const existing = getCookie("_fbc");
  if (existing) return existing;
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get("fbclid");
    if (!fbclid) return null;
    const fbc = `fb.1.${Date.now()}.${fbclid}`;
    // persist for 90 days
    document.cookie = `_fbc=${encodeURIComponent(fbc)}; max-age=${60 * 60 * 24 * 90}; path=/; SameSite=Lax`;
    return fbc;
  } catch {
    return null;
  }
}

/** Stable per-browser external_id stored in localStorage */
function getExternalId(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    let id = localStorage.getItem("_ext_uid");
    if (!id) {
      id =
        (crypto?.randomUUID?.() as string) ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("_ext_uid", id);
    }
    return id;
  } catch {
    return null;
  }
}

/** SHA-256 hex hash for PII (email, phone, names) */
async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** In-memory user identifiers set after login / checkout */
let advancedMatch: { email?: string; phone?: string } = {};

/**
 * Set advanced-matching identifiers (email/phone) — call after login or
 * once known on checkout. Values are normalized + hashed before sending.
 */
export function setUserIdentifiers(params: { email?: string; phone?: string }) {
  if (params.email) advancedMatch.email = params.email.trim().toLowerCase();
  if (params.phone) advancedMatch.phone = params.phone.replace(/[^\d]/g, "");
}

export function clearUserIdentifiers() {
  advancedMatch = {};
}

async function buildUserData(): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};
  const fbp = getFbp();
  const fbc = getFbc();
  const externalId = getExternalId();
  if (fbp) data.fbp = fbp;
  if (fbc) data.fbc = fbc;
  if (externalId) data.external_id = [await sha256Hex(externalId)];
  if (advancedMatch.email) data.em = [await sha256Hex(advancedMatch.email)];
  if (advancedMatch.phone) data.ph = [await sha256Hex(advancedMatch.phone)];
  return data;
}

export function initMetaPixel(id: string) {
  if (!id) return;
  if (pixelId === id && scriptLoaded) return;
  pixelId = id;

  if (!scriptLoaded) {
    scriptLoaded = true;
    const f = window;
    const b = document;
    if (!f.fbq) {
      const n: any = (f.fbq = function (...args: any[]) {
        if (n.callMethod) {
          n.callMethod.apply(n, args);
        } else {
          n.queue.push(args);
        }
      });
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      const s = b.createElement("script");
      s.async = true;
      s.src = "https://connect.facebook.net/en_US/fbevents.js";
      const firstScript = b.getElementsByTagName("script")[0];
      firstScript?.parentNode?.insertBefore(s, firstScript);
    }
  }

  // Ensure _fbc gets seeded from any fbclid in the landing URL
  getFbc();

  window.fbq("init", id);
  const eid = generateEventId();
  window.fbq("track", "PageView", {}, { eventID: eid });
  void sendCAPIEvent("PageView", eid);
}

function isFbqReady(): boolean {
  return !!pixelId && typeof window.fbq === "function";
}

// ── Server-side CAPI helper ──────────────────────────────────────────

let capiQueue: Promise<void> = Promise.resolve();

async function sendCAPIEvent(
  eventName: string,
  eventId: string,
  customData?: Record<string, unknown>,
  extraUserData?: Record<string, unknown>
) {
  capiQueue = capiQueue.then(async () => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const baseUserData = await buildUserData();
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/capi-event`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": anonKey,
            "Authorization": `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            event_name: eventName,
            event_id: eventId,
            event_source_url: window.location.href,
            user_data: {
              client_user_agent: navigator.userAgent,
              ...baseUserData,
              ...extraUserData,
            },
            custom_data: customData || undefined,
          }),
        }
      );
    } catch {
      // Silently fail — CAPI is best-effort
    }
  });
}

// ── Client + Server event helpers ────────────────────────────────────

export function trackPageView() {
  const eid = generateEventId();
  if (isFbqReady()) window.fbq("track", "PageView", {}, { eventID: eid });
  void sendCAPIEvent("PageView", eid);
}

export function trackViewContent(params: {
  content_name: string;
  content_ids: string[];
  content_type: string;
  value?: number;
  currency?: string;
}) {
  const eid = generateEventId();
  if (isFbqReady()) window.fbq("track", "ViewContent", params, { eventID: eid });
  void sendCAPIEvent("ViewContent", eid, params);
}

export function trackAddToCart(params: {
  content_name: string;
  content_ids: string[];
  content_type: string;
  value: number;
  currency: string;
}) {
  const eid = generateEventId();
  if (isFbqReady()) window.fbq("track", "AddToCart", params, { eventID: eid });
  void sendCAPIEvent("AddToCart", eid, params);
}

export function trackInitiateCheckout(params: {
  content_ids: string[];
  num_items: number;
  value: number;
  currency: string;
}) {
  const eid = generateEventId();
  if (isFbqReady()) window.fbq("track", "InitiateCheckout", params, { eventID: eid });
  void sendCAPIEvent("InitiateCheckout", eid, params);
}

export function trackPurchase(params: {
  content_ids: string[];
  content_type: string;
  num_items: number;
  value: number;
  currency: string;
}) {
  const eid = generateEventId();
  if (isFbqReady()) window.fbq("track", "Purchase", params, { eventID: eid });
  void sendCAPIEvent("Purchase", eid, params);
}
