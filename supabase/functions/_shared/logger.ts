// Shared logger for edge functions — writes to public.edge_function_logs.
// Uses service role key; failures are swallowed so logging never breaks the main flow.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface LogEntry {
  function_name: string;
  method?: string;
  status_code?: number;
  execution_time_ms?: number;
  message?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export async function logInvocation(entry: LogEntry): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const sb = createClient(url, key);
    await sb.from("edge_function_logs").insert({
      function_name: entry.function_name,
      method: entry.method ?? "POST",
      status_code: entry.status_code ?? 200,
      execution_time_ms: entry.execution_time_ms ?? 0,
      message: entry.message ?? "",
      error: entry.error ?? "",
      metadata: entry.metadata ?? {},
    });
  } catch (_) {
    // intentionally swallow
  }
}

/**
 * Wrap a Deno.serve handler so every non-OPTIONS request is logged.
 * Usage: Deno.serve(withLogging("my-fn", async (req) => { ... }));
 */
export function withLogging(
  functionName: string,
  handler: (req: Request) => Promise<Response> | Response,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    if (req.method === "OPTIONS") {
      return await handler(req);
    }
    const start = Date.now();
    let status = 200;
    let errMsg = "";
    try {
      const res = await handler(req);
      status = res.status;
      // fire-and-forget log
      logInvocation({
        function_name: functionName,
        method: req.method,
        status_code: status,
        execution_time_ms: Date.now() - start,
        message: status >= 400 ? "Request failed" : "OK",
      });
      return res;
    } catch (err) {
      errMsg = err instanceof Error ? err.message : String(err);
      logInvocation({
        function_name: functionName,
        method: req.method,
        status_code: 500,
        execution_time_ms: Date.now() - start,
        message: "Unhandled exception",
        error: errMsg,
      });
      throw err;
    }
  };
}
