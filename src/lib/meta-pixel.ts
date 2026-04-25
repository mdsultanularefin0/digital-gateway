// Meta Pixel (Facebook Pixel) + Conversions API integration utility

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: (...args: any[]) => void;
  }
}

let pixelId: string | null = null;
let scriptLoaded = false;

type CustomerData = {
  email?: string;
  phone?: string;
  name?: string;
  externalId?: string;
};

/** Generate a unique event_id for deduplication between Pixel and CAPI */
export function generateEventId(eventName = "event"): string {
  return `${eventName.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

// ── Cookie + identifier helpers ──────────────────────────────────────

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

/** Read _fbp cookie (Browser ID) */
function getFbp(): string | null {
  const cookie = getCookie("_fbp");
  if (cookie) return cookie;
  // If no cookie, Pixel script might not have set it yet or it's blocked.
  return null;
}

/**
 * Read _fbc cookie (Click ID). If absent but URL has fbclid, synthesize it
 * per Meta's spec: fb.1.<timestamp>.<fbclid>
 */
function getFbc(): string | null {
  const existing = getCookie("_fbc");
  if (existing) return existing;
  
  if (typeof window === "undefined") return null;
  
  try {
    const url = new URL(window.location.href);
    const fbclid = url.searchParams.get("fbclid");
    
    if (fbclid) {
      // fb.<subdomain_index>.<creation_time>.<fbclid>
      // Using '1' for subdomain index (usually correct for top-level)
      const fbc = `fb.1.${Date.now()}.${fbclid}`;
      
      // Try to persist it so it's available on subsequent pages/events
      try {
        const domain = window.location.hostname.replace(/^www\./, "");
        document.cookie = `_fbc=${fbc}; max-age=${60 * 60 * 24 * 90}; path=/; domain=.${domain}; SameSite=Lax`;
      } catch {
        // Fallback for local dev or restricted environments
        document.cookie = `_fbc=${fbc}; max-age=${60 * 60 * 24 * 90}; path=/; SameSite=Lax`;
      }
      return fbc;
    }
  } catch (e) {
    console.warn("Error parsing fbc:", e);
  }
  return null;
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

function buildBrowserMatchParams(customer?: CustomerData): Record<string, string> {
  const matchParams: Record<string, string> = {};
  if (!customer) return matchParams;
  if (customer.email) matchParams.em = customer.email.trim().toLowerCase();
  if (customer.phone) matchParams.ph = customer.phone.replace(/[^\d]/g, "");
  if (customer.name) {
    const parts = customer.name.trim().split(/\s+/);
    if (parts.length > 0) matchParams.fn = parts[0].toLowerCase();
    if (parts.length > 1) matchParams.ln = parts[parts.length - 1].toLowerCase();
  }
  if (customer.externalId) matchParams.external_id = customer.externalId;
  return matchParams;
}

function syncBrowserIdentifiers(customer?: CustomerData) {
  if (!pixelId || !isFbqReady()) return;
  const matchParams = buildBrowserMatchParams(customer);
  if (Object.keys(matchParams).length > 0) {
    window.fbq("init", pixelId, matchParams);
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

/** Hashed user identifiers set after login / checkout */
let advancedMatch: { 
  em?: string; 
  ph?: string; 
  fn?: string; 
  ln?: string;
  external_id?: string;
} = {};

/**
 * Set advanced-matching identifiers — call after login or once known on checkout.
 * Values are normalized + hashed before storing.
 */
export async function setUserIdentifiers(params: { 
  email?: string; 
  phone?: string; 
  firstName?: string; 
  lastName?: string;
  externalId?: string;
}) {
  if (params.email) advancedMatch.em = await sha256Hex(params.email.trim().toLowerCase());
  if (params.phone) advancedMatch.ph = await sha256Hex(params.phone.replace(/[^\d]/g, ""));
  if (params.firstName) advancedMatch.fn = await sha256Hex(params.firstName.trim().toLowerCase());
  if (params.lastName) advancedMatch.ln = await sha256Hex(params.lastName.trim().toLowerCase());
  if (params.externalId) advancedMatch.external_id = await sha256Hex(params.externalId);
}

export function clearUserIdentifiers() {
  advancedMatch = {};
}

async function buildUserData(extra?: {
  email?: string;
  phone?: string;
  name?: string;
  externalId?: string;
}): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};
  
  // Base signals
  const fbp = getFbp();
  const fbc = getFbc();
  if (fbp) data.fbp = fbp;
  if (fbc) data.fbc = fbc;

  // Merge global advancedMatch with any per-event extras
  const em = extra?.email ? await sha256Hex(extra.email.trim().toLowerCase()) : advancedMatch.em;
  const ph = extra?.phone ? await sha256Hex(extra.phone.replace(/[^\d]/g, "")) : advancedMatch.ph;
  const extId = extra?.externalId ? await sha256Hex(extra.externalId) : advancedMatch.external_id;
  
  let fn = advancedMatch.fn;
  let ln = advancedMatch.ln;
  
  if (extra?.name) {
    const parts = extra.name.trim().split(/\s+/);
    if (parts.length > 0) fn = await sha256Hex(parts[0].toLowerCase());
    if (parts.length > 1) ln = await sha256Hex(parts[parts.length - 1].toLowerCase());
  }

  if (em) data.em = [em];
  if (ph) data.ph = [ph];
  if (fn) data.fn = [fn];
  if (ln) data.ln = [ln];
  if (extId) data.external_id = [extId];
  else {
    const localExtId = getExternalId();
    if (localExtId) data.external_id = [await sha256Hex(localExtId)];
  }

  return data;
}

export function initMetaPixel(id: string, customer?: CustomerData) {
  if (!id) return;
  if (pixelId === id && scriptLoaded) {
    syncBrowserIdentifiers(customer);
    return;
  }
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

  const matchParams = buildBrowserMatchParams(customer);
  window.fbq("init", id, Object.keys(matchParams).length > 0 ? matchParams : undefined);
  trackPageView(customer);
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
  extraUserData?: {
    email?: string;
    phone?: string;
    name?: string;
    externalId?: string;
  }
) {
  capiQueue = capiQueue.then(async () => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const userData = await buildUserData(extraUserData);
      const payload = JSON.stringify({
        event_name: eventName,
        event_id: eventId,
        event_source_url: window.location.href,
        user_data: {
          client_user_agent: navigator.userAgent,
          ...userData,
        },
        custom_data: customData || undefined,
      });
      const endpoint = `https://${projectId}.supabase.co/functions/v1/capi-event`;
      const headers = {
        "Content-Type": "application/json",
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`,
      };

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: payload,
          keepalive: payload.length < 60000,
        });
        if (response.ok || response.status === 422) break;
        await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
      }
    } catch {
      // Silently fail — CAPI is best-effort
    }
  });
}

// ── Client + Server event helpers ────────────────────────────────────

export function trackPageView(customer?: {
  email?: string;
  phone?: string;
  name?: string;
  externalId?: string;
}) {
  const eid = generateEventId("PageView");
  if (isFbqReady()) window.fbq("track", "PageView", {}, { eventID: eid });
  void sendCAPIEvent("PageView", eid, {}, customer);
}

export function trackViewContent(
  params: {
    content_name: string;
    content_ids: string[];
    content_type: string;
    value?: number;
    currency?: string;
  },
  customer?: {
    email?: string;
    phone?: string;
    name?: string;
    externalId?: string;
  }
) {
  const eid = generateEventId("ViewContent");
  if (isFbqReady()) window.fbq("track", "ViewContent", params, { eventID: eid });
  void sendCAPIEvent("ViewContent", eid, params, customer);
}

export function trackAddToCart(
  params: {
    content_name: string;
    content_ids: string[];
    content_type: string;
    value: number;
    currency: string;
  },
  customer?: {
    email?: string;
    phone?: string;
    name?: string;
    externalId?: string;
  }
) {
  const eid = generateEventId("AddToCart");
  if (isFbqReady()) window.fbq("track", "AddToCart", params, { eventID: eid });
  void sendCAPIEvent("AddToCart", eid, params, customer);
}

export function trackInitiateCheckout(
  params: {
    content_ids: string[];
    num_items: number;
    value: number;
    currency: string;
  },
  customer?: {
    email?: string;
    phone?: string;
    name?: string;
    externalId?: string;
  }
) {
  const eid = generateEventId("InitiateCheckout");
  if (isFbqReady()) window.fbq("track", "InitiateCheckout", params, { eventID: eid });
  void sendCAPIEvent("InitiateCheckout", eid, params, customer);
}

export function trackPurchase(
  params: {
    content_ids: string[];
    content_type: string;
    num_items: number;
    value: number;
    currency: string;
  },
  customer?: {
    email: string;
    phone: string;
    name: string;
    externalId?: string;
  }
) {
  // Use order_number as eventID for perfect deduplication, fallback to random
  const eid = customer?.externalId || generateEventId();

  // Browser Pixel: Pass unhashed data if available, fbq handles hashing
  const matchParams: Record<string, any> = {};
  if (customer) {
    matchParams.em = customer.email.trim().toLowerCase();
    matchParams.ph = customer.phone.replace(/[^\d]/g, "");
    const parts = customer.name.trim().split(/\s+/);
    if (parts.length > 0) matchParams.fn = parts[0].toLowerCase();
    if (parts.length > 1) matchParams.ln = parts[parts.length - 1].toLowerCase();
    if (customer.externalId) matchParams.external_id = customer.externalId;
  }

  if (isFbqReady()) {
    window.fbq("track", "Purchase", params, { eventID: eid });
  }
  
  void sendCAPIEvent("Purchase", eid, params, customer);
}
