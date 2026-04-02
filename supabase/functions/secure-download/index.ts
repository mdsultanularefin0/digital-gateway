import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch token record
    const { data: tokenRecord, error: tokenErr } = await supabase
      .from("download_tokens")
      .select("*, product_files(*)")
      .eq("token", token)
      .single();

    if (tokenErr || !tokenRecord) {
      return new Response(JSON.stringify({ error: "Invalid download token" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Download link has expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check max downloads
    if (tokenRecord.max_downloads > 0 && tokenRecord.download_count >= tokenRecord.max_downloads) {
      return new Response(JSON.stringify({ error: "Maximum download limit reached" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment download count
    await supabase
      .from("download_tokens")
      .update({ download_count: tokenRecord.download_count + 1 })
      .eq("id", tokenRecord.id);

    // Redirect to the actual file URL
    const fileUrl = tokenRecord.product_files?.file_url;
    if (!fileUrl) {
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Redirect to the file
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: fileUrl,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
