const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type TranslateBody = {
  text?: string;
  target?: "bn" | "en";
  context?: "product" | "page" | "blog" | "generic";
};

function systemPrompt(target: "bn" | "en", context: string) {
  const directionLabel = target === "bn" ? "Bangla (Bengali)" : "English";
  const ctx: Record<string, string> = {
    product: "This is digital e-commerce product copy (name, tagline, description, features).",
    page: "This is CMS website page content (headings, paragraphs, FAQ items). May contain HTML — preserve tags.",
    blog: "This is a blog post. Preserve formatting and paragraph structure.",
    generic: "This is general marketing copy.",
  };
  return `You are a professional bilingual translator for a Bangladeshi digital commerce site (gift cards, subscriptions, digital products).

TASK: Translate the given text into ${directionLabel}.

CONTEXT: ${ctx[context] ?? ctx.generic}

RULES:
- Translate naturally, not literally. Sound like a native speaker writing marketing copy.
- Preserve HTML tags, markdown, emoji, URLs, brand names, and product names (e.g. "Netflix", "bKash", "Spotify") exactly.
- Preserve currency symbols and numbers.
- For Bangla: use modern conversational Bangla, not overly formal "sadhu" style. Tech terms can stay in English inside Bangla sentences if that's how people actually speak (e.g. "সাবস্ক্রিপশন", "অ্যাকাউন্ট").
- Return ONLY the translated text. No preamble, no quotes, no explanations.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as TranslateBody;
    const text = (body.text || "").trim();
    const target = body.target === "en" ? "en" : "bn";
    const context = body.context || "generic";

    if (!text) {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt(target, context) },
          { role: "user", content: text },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Top up in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const err = await resp.text();
      console.error("AI gateway error:", resp.status, err);
      return new Response(JSON.stringify({ error: "AI translation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const translated = data?.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ translated, target, context }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
