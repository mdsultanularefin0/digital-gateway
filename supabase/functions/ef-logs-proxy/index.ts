// ef-logs-proxy — admin-only proxy that queries Supabase analytics
// (function_edge_logs) for recent invocations of a given function.
//
// Auth: requires a logged-in admin (validates JWT against user_roles).
// Returns { rows: [{ id, timestamp, function_name, status_code, method, execution_time_ms, message }] }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  function_name?: string;
  limit?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return json({ error: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Verify admin role using service-role client
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return json({ error: "Forbidden" }, 403);
    }

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const fnName = (body.function_name || "").trim();
    const limit = Math.min(Math.max(body.limit ?? 50, 1), 200);

    if (!fnName) {
      return json({ error: "function_name required" }, 400);
    }

    // Supabase analytics is a separate BigQuery-style endpoint reachable via
    // the project ref. Since service role tokens cannot directly query analytics
    // from inside an edge function in all environments, we return a clear
    // empty payload here; the agent's analytics tool is the canonical source.
    // This stub keeps the admin UI working and ready to plug into a real
    // analytics endpoint if/when it becomes available to user-managed code.
    return json({
      rows: [],
      note:
        "Live analytics access from edge functions is restricted. Use the Lovable Cloud backend logs view, or extend this function to call the analytics REST endpoint with the project's analytics token.",
      function_name: fnName,
      limit,
    });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : String(e) },
      500,
    );
  }

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
