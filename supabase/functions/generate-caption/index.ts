import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { productName, tagline, price, originalPrice, features, platform } = await req.json();

    const platformGuide: Record<string, string> = {
      facebook: "Write for Facebook. Use engaging, conversational tone. 2-3 short paragraphs. Include emojis sparingly. Add 3-5 relevant hashtags at the end.",
      instagram: "Write for Instagram. Use attention-grabbing hook, bullet points with emojis for features, strong CTA. Add 15-20 relevant hashtags separated at the end.",
      twitter: "Write for Twitter/X. Keep under 280 characters. Punchy and direct. 2-3 hashtags max.",
      linkedin: "Write for LinkedIn. Professional tone, value-focused. 2-3 paragraphs. 3-5 hashtags at the end.",
      tiktok: "Write for TikTok caption. Gen-Z friendly, casual, use trending phrases. Keep short. 5-8 hashtags.",
    };

    const guide = platformGuide[platform] || platformGuide.facebook;
    const discount = originalPrice ? `(Original: ${originalPrice}, Now: ${price})` : `Price: ${price}`;
    const featureList = (features || []).filter((f: string) => f.trim()).join(", ");

    const systemPrompt = `You are an expert social media copywriter for a digital products store called GiftCardVibe. You write high-converting captions that drive sales. Always write in a persuasive, benefit-focused style. Never use placeholder text. Output ONLY the caption text, nothing else.`;

    const userPrompt = `Generate a social media caption for this product:

Product: ${productName?.replace(/\n/g, " ")}
Tagline: ${tagline}
Pricing: ${discount}
Key Features: ${featureList}

${guide}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ caption }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-caption error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
