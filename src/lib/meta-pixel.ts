// Meta Pixel (Facebook Pixel) + Conversions API integration utility

import { supabase } from "@/integrations/supabase/client";

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
        n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
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

  window.fbq("init", id);
  const eid = generateEventId();
  window.fbq("track", "PageView", {}, { eventID: eid });
  sendCAPIEvent("PageView", eid);
}

function isFbqReady(): boolean {
  return !!pixelId && typeof window.fbq === "function";
}

// ── Server-side CAPI helper ──────────────────────────────────────────

async function sendCAPIEvent(
  eventName: string,
  eventId: string,
  customData?: Record<string, unknown>,
  userData?: Record<string, unknown>
) {
  try {
    await supabase.functions.invoke("capi-event", {
      body: {
        event_name: eventName,
        event_id: eventId,
        event_source_url: window.location.href,
        user_data: userData || {},
        custom_data: customData || undefined,
      },
    });
  } catch {
    // Silently fail — CAPI is best-effort
  }
}

// ── Client + Server event helpers ────────────────────────────────────

export function trackPageView() {
  const eid = generateEventId();
  if (isFbqReady()) window.fbq("track", "PageView", {}, { eventID: eid });
  sendCAPIEvent("PageView", eid);
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
  sendCAPIEvent("ViewContent", eid, params);
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
  sendCAPIEvent("AddToCart", eid, params);
}

export function trackInitiateCheckout(params: {
  content_ids: string[];
  num_items: number;
  value: number;
  currency: string;
}) {
  const eid = generateEventId();
  if (isFbqReady()) window.fbq("track", "InitiateCheckout", params, { eventID: eid });
  sendCAPIEvent("InitiateCheckout", eid, params);
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
  sendCAPIEvent("Purchase", eid, params);
}
