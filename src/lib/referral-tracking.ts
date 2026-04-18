import { supabase } from "@/integrations/supabase/client";

const COOKIE = "ref_code";
const DAYS = 30;

function setCookie(value: string) {
  const d = new Date();
  d.setTime(d.getTime() + DAYS * 24 * 60 * 60 * 1000);
  document.cookie = `${COOKIE}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Reads ?ref= from URL, validates against the referrals table, and persists
 * a 30-day cookie. Records a "click" attribution exactly once per session.
 */
export async function captureReferralFromUrl() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const code = (params.get("ref") || "").trim().toUpperCase();
  if (!code) return;

  const { data } = await supabase
    .from("referrals")
    .select("code, active")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();
  if (!data) return;

  setCookie(code);
  const sessionKey = `ref_click_${code}`;
  if (!sessionStorage.getItem(sessionKey)) {
    sessionStorage.setItem(sessionKey, "1");
    await supabase.from("referral_attributions").insert({
      referral_code: code,
      event_type: "click",
      amount: 0,
    });
  }
}
