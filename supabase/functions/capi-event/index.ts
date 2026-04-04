import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FB_GRAPH_URL = "https://graph.facebook.com/v21.0";

interface CAPIEvent {
  event_name: string;
  event_id: string;
  event_time: number;
  event_source_url: string;
  action_source: "website";
  user_data: {
    client_ip_address?: string;
    client_user_agent?: string;
    em?: string[];
    ph?: string[];
    fn?: string[];
  };
  custom_data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      event_name,
      event_id,
      event_source_url,
      user_data,
      custom_data,
    } = body;

    if (!event_name || !event_id) {
      return new Response(
        JSON.stringify({ error: "event_name and event_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch CAPI settings from site_settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { data: settings } = await sb
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "facebook_pixel_id",
        "facebook_capi_access_token",
        "facebook_capi_test_code",
      ]);

    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((r: { key: string; value: string }) => {
      settingsMap[r.key] = r.value;
    });

    const pixelId = settingsMap.facebook_pixel_id;
    const accessToken = settingsMap.facebook_capi_access_token;
    const testCode = settingsMap.facebook_capi_test_code;

    if (!pixelId || !accessToken) {
      return new Response(
        JSON.stringify({ error: "CAPI not configured (missing pixel ID or access token)" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build event
    const event: CAPIEvent = {
      event_name,
      event_id,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: event_source_url || "",
      action_source: "website",
      user_data: {
        client_ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || undefined,
        client_user_agent: req.headers.get("user-agent") || undefined,
        ...(user_data || {}),
      },
      custom_data: custom_data || undefined,
    };

    // Send to Facebook
    const url = `${FB_GRAPH_URL}/${pixelId}/events?access_token=${accessToken}`;
    const fbBody: Record<string, unknown> = { data: [event] };
    if (testCode) {
      fbBody.test_event_code = testCode;
    }

    const fbRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fbBody),
    });

    const fbData = await fbRes.json();

    if (!fbRes.ok) {
      console.error("Facebook CAPI error:", JSON.stringify(fbData));
      return new Response(
        JSON.stringify({ error: "Facebook API error", details: fbData }),
        { status: fbRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, fb_response: fbData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("CAPI edge function error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
