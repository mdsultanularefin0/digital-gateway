import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withLogging } from "../_shared/logger.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(withLogging("generate-caption", async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Get OpenRouter API key from site_settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { data: settingsRows } = await sb
      .from("site_settings")
      .select("key, value")
      .in("key", ["openrouter_api_key", "openrouter_model", "openrouter_custom_model"]);

    const cfg: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => (cfg[r.key] = r.value));

    const apiKey = cfg.openrouter_api_key;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenRouter API key not configured. Go to Admin → Integrations → AI to set it up." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const model = cfg.openrouter_custom_model || cfg.openrouter_model || "google/gemini-2.5-flash";

    const { productName, tagline, price, originalPrice, features, platform, language } = await req.json();

    const lang = language === "bn" ? "bn" : "en";

    const platformGuide: Record<string, string> = {
      facebook: "Write for Facebook. Use engaging, conversational tone. 2-3 short paragraphs. Include emojis sparingly. Add 3-5 relevant hashtags at the end.",
      instagram: "Write for Instagram. Use attention-grabbing hook, bullet points with emojis for features, strong CTA. Add 15-20 relevant hashtags separated at the end.",
      twitter: "Write for Twitter/X. Keep under 280 characters. Punchy and direct. 2-3 hashtags max.",
      linkedin: "Write for LinkedIn. Professional tone, value-focused. 2-3 paragraphs. 3-5 hashtags at the end.",
      tiktok: "Write for TikTok caption. Gen-Z friendly, casual, use trending phrases. Keep short. 5-8 hashtags.",
    };

    const langInstruction = lang === "bn"
      ? "IMPORTANT: Write the ENTIRE caption in Bengali (বাংলা). Use Bengali script throughout. Hashtags can remain in English."
      : "Write the caption in English.";

    const guide = platformGuide[platform] || platformGuide.facebook;
    const discount = originalPrice ? `(Original: ${originalPrice}, Now: ${price})` : `Price: ${price}`;
    const featureList = (features || []).filter((f: string) => f.trim()).join(", ");

    const systemPrompt = `You are an expert social media copywriter for a digital products store called GiftCardVibe. You write high-converting captions that drive sales. Always write in a persuasive, benefit-focused style. Never use placeholder text. Output ONLY the caption text, nothing else. ${langInstruction}`;

    const userPrompt = `Generate a social media caption for this product:

Product: ${productName?.replace(/\n/g, " ")}
Tagline: ${tagline}
Pricing: ${discount}
Key Features: ${featureList}

${guide}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://giftcardvibe.xyz",
        "X-Title": "GiftCardVibe Post Generator",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("OpenRouter error:", response.status, t);
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "Invalid OpenRouter API key. Check Admin → Integrations → AI." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "OpenRouter credits exhausted. Add funds at openrouter.ai." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI provider error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ caption, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-caption error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
