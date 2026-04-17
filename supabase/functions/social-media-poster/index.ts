// Social Media Poster — publishes to Facebook Page + Instagram Business via Graph API
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH = "https://graph.facebook.com/v21.0";

interface RequestBody {
  caption: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  target: "facebook" | "instagram" | "both";
  mode: "now" | "schedule";
  scheduledAt?: string; // ISO string
  postId?: string;      // social_posts row id (optional, created if missing)
}

async function gget(url: string) {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `GET ${url} failed`);
  return json;
}
async function gpost(url: string, body: Record<string, string>) {
  const form = new URLSearchParams(body);
  const res = await fetch(url, { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `POST ${url} failed`);
  return json;
}

async function publishFacebook(opts: {
  pageId: string; token: string; caption: string; mediaUrl: string; mediaType: string;
  scheduledUnix?: number;
}): Promise<string> {
  const { pageId, token, caption, mediaUrl, mediaType, scheduledUnix } = opts;
  const isVideo = mediaType === "video";
  const endpoint = isVideo ? `${GRAPH}/${pageId}/videos` : `${GRAPH}/${pageId}/photos`;
  const body: Record<string, string> = {
    access_token: token,
    [isVideo ? "description" : "caption"]: caption,
    [isVideo ? "file_url" : "url"]: mediaUrl,
  };
  if (scheduledUnix) {
    body.published = "false";
    body.scheduled_publish_time = String(scheduledUnix);
  }
  const data = await gpost(endpoint, body);
  return data.post_id || data.id;
}

async function publishInstagram(opts: {
  igUserId: string; token: string; caption: string; mediaUrl: string; mediaType: string;
  scheduledUnix?: number;
}): Promise<string> {
  const { igUserId, token, caption, mediaUrl, mediaType, scheduledUnix } = opts;
  const isVideo = mediaType === "video";
  // 1. create container
  const containerBody: Record<string, string> = {
    access_token: token,
    caption,
    ...(isVideo
      ? { media_type: "REELS", video_url: mediaUrl }
      : { image_url: mediaUrl }),
  };
  const container = await gpost(`${GRAPH}/${igUserId}/media`, containerBody);
  const creationId = container.id;

  // 2. poll until FINISHED (videos take time)
  const maxWait = isVideo ? 60 : 10; // seconds
  for (let i = 0; i < maxWait; i++) {
    const status = await gget(`${GRAPH}/${creationId}?fields=status_code&access_token=${token}`);
    if (status.status_code === "FINISHED") break;
    if (status.status_code === "ERROR") throw new Error("Instagram media processing failed");
    await new Promise((r) => setTimeout(r, 1000));
  }

  // 3. publish (or schedule)
  const publishBody: Record<string, string> = {
    access_token: token,
    creation_id: creationId,
  };
  if (scheduledUnix) publishBody.scheduled_publish_time = String(scheduledUnix);
  const published = await gpost(`${GRAPH}/${igUserId}/media_publish`, publishBody);
  return published.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    if (!body.caption && !body.mediaUrl) {
      return new Response(JSON.stringify({ error: "Caption or media required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!body.mediaUrl) {
      return new Response(JSON.stringify({ error: "Meta requires a public media URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate schedule window: 20 min – 75 days
    let scheduledUnix: number | undefined;
    if (body.mode === "schedule") {
      if (!body.scheduledAt) throw new Error("scheduledAt required when mode=schedule");
      const t = Math.floor(new Date(body.scheduledAt).getTime() / 1000);
      const now = Math.floor(Date.now() / 1000);
      if (t < now + 20 * 60) throw new Error("Scheduled time must be at least 20 minutes in the future");
      if (t > now + 75 * 24 * 60 * 60) throw new Error("Scheduled time cannot be more than 75 days from now");
      scheduledUnix = t;
    }

    // Load settings
    const { data: settingsRows } = await admin
      .from("site_settings")
      .select("key,value")
      .in("key", ["meta_page_access_token", "meta_page_id", "meta_ig_business_id", "meta_ig_access_token"]);
    const settings = Object.fromEntries((settingsRows || []).map((r: any) => [r.key, r.value]));

    const fbToken = settings.meta_page_access_token;
    const fbPageId = settings.meta_page_id;
    const igToken = settings.meta_ig_access_token || fbToken;
    const igUserId = settings.meta_ig_business_id;

    // Insert/update tracking row
    const trackingRow = {
      caption: body.caption,
      media_url: body.mediaUrl,
      media_type: body.mediaType,
      target: body.target,
      mode: body.mode,
      scheduled_at: body.scheduledAt || null,
      status: "pending",
      created_by: userId,
    };
    const { data: inserted } = await admin.from("social_posts").insert(trackingRow).select().single();
    const rowId = inserted?.id;

    let fbPostId = "";
    let igPostId = "";
    const errors: string[] = [];

    try {
      if (body.target === "facebook" || body.target === "both") {
        if (!fbToken || !fbPageId) throw new Error("Facebook Page ID or token not configured");
        fbPostId = await publishFacebook({
          pageId: fbPageId, token: fbToken, caption: body.caption,
          mediaUrl: body.mediaUrl, mediaType: body.mediaType, scheduledUnix,
        });
      }
    } catch (e: any) { errors.push(`FB: ${e.message}`); }

    try {
      if (body.target === "instagram" || body.target === "both") {
        if (!igToken || !igUserId) throw new Error("Instagram Business ID or token not configured");
        igPostId = await publishInstagram({
          igUserId, token: igToken, caption: body.caption,
          mediaUrl: body.mediaUrl, mediaType: body.mediaType, scheduledUnix,
        });
      }
    } catch (e: any) { errors.push(`IG: ${e.message}`); }

    const finalStatus =
      errors.length === 0
        ? (scheduledUnix ? "scheduled" : "published")
        : (fbPostId || igPostId ? "published" : "failed");

    if (rowId) {
      await admin.from("social_posts").update({
        status: finalStatus,
        fb_post_id: fbPostId,
        ig_post_id: igPostId,
        error: errors.join(" | "),
      }).eq("id", rowId);
    }

    return new Response(JSON.stringify({
      success: errors.length === 0,
      status: finalStatus,
      fb_post_id: fbPostId,
      ig_post_id: igPostId,
      errors,
      record_id: rowId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
