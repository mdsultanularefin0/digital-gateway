// Meta Pixel (Facebook Pixel) integration utility
// Loads the pixel script and provides typed event helpers

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: (...args: any[]) => void;
  }
}

let initialized = false;
let pixelId: string | null = null;

export function initMetaPixel(id: string) {
  if (!id || initialized) return;
  pixelId = id;
  initialized = true;

  // Standard Meta Pixel base code
  const f = window;
  const b = document;
  if (f.fbq) return;

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

  window.fbq("init", id);
  window.fbq("track", "PageView");
}

export function trackPageView() {
  if (!pixelId || !window.fbq) return;
  window.fbq("track", "PageView");
}

export function trackViewContent(params: {
  content_name: string;
  content_ids: string[];
  content_type: string;
  value?: number;
  currency?: string;
}) {
  if (!pixelId || !window.fbq) return;
  window.fbq("track", "ViewContent", params);
}

export function trackAddToCart(params: {
  content_name: string;
  content_ids: string[];
  content_type: string;
  value: number;
  currency: string;
}) {
  if (!pixelId || !window.fbq) return;
  window.fbq("track", "AddToCart", params);
}

export function trackInitiateCheckout(params: {
  content_ids: string[];
  num_items: number;
  value: number;
  currency: string;
}) {
  if (!pixelId || !window.fbq) return;
  window.fbq("track", "InitiateCheckout", params);
}

export function trackPurchase(params: {
  content_ids: string[];
  content_type: string;
  num_items: number;
  value: number;
  currency: string;
}) {
  if (!pixelId || !window.fbq) return;
  window.fbq("track", "Purchase", params);
}
