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
const MAX_BODY_CHARS = 8000;

function truncate(s: string): string {
  if (s.length <= MAX_BODY_CHARS) return s;
  return s.slice(0, MAX_BODY_CHARS) + `\n…[truncated ${s.length - MAX_BODY_CHARS} chars]`;
}

function tryParse(s: string): unknown {
  if (!s) return "";
  try { return JSON.parse(s); } catch { return truncate(s); }
}

function redactHeaders(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((v, k) => {
    const key = k.toLowerCase();
    if (key === "authorization" || key === "apikey" || key === "x-api-key" || key === "cookie") {
      out[k] = "[redacted]";
    } else {
      out[k] = v;
    }
  });
  return out;
}

/**
 * Wrap a Deno.serve handler so every non-OPTIONS request is logged
 * with request/response bodies captured into metadata for troubleshooting.
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

    // Clone request to read body without consuming the original
    let requestBody: unknown = "";
    try {
      const cloned = req.clone();
      const text = await cloned.text();
      requestBody = tryParse(text);
    } catch (_) { /* ignore */ }

    const url = new URL(req.url);
    const reqMeta = {
      url: url.pathname + url.search,
      headers: redactHeaders(req.headers),
    };

    try {
      const res = await handler(req);
      const status = res.status;

      // Capture response body by reading the clone
      let responseBody: unknown = "";
      try {
        const text = await res.clone().text();
        responseBody = tryParse(text);
      } catch (_) { /* ignore */ }

      logInvocation({
        function_name: functionName,
        method: req.method,
        status_code: status,
        execution_time_ms: Date.now() - start,
        message: status >= 400 ? "Request failed" : "OK",
        metadata: {
          request: reqMeta,
          request_body: requestBody,
          response_body: responseBody,
        },
      });
      return res;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logInvocation({
        function_name: functionName,
        method: req.method,
        status_code: 500,
        execution_time_ms: Date.now() - start,
        message: "Unhandled exception",
        error: errMsg,
        metadata: {
          request: reqMeta,
          request_body: requestBody,
          stack: err instanceof Error ? err.stack : undefined,
        },
      });
      throw err;
    }
  };
}
