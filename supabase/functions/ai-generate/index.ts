import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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
        JSON.stringify({ error: "OpenRouter API key not configured. Go to Admin → Integrations → AI." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const model = cfg.openrouter_custom_model || cfg.openrouter_model || "google/gemini-2.5-flash";

    const body = await req.json();
    const { type, language } = body;
    const lang = language === "bn" ? "bn" : "en";
    const langInstruction = lang === "bn"
      ? "IMPORTANT: Write the ENTIRE response in Bengali (বাংলা). Use Bengali script throughout."
      : "Write the response in English.";

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "product_description") {
      const { productName, tagline, features, category } = body;
      systemPrompt = `You are an expert e-commerce copywriter for a digital products store called GiftCardVibe. Write compelling, benefit-driven product descriptions that convert visitors into buyers. Use clear formatting with short paragraphs. Output ONLY the description text. ${langInstruction}`;
      userPrompt = `Write a detailed product description for:

Product: ${productName}
Tagline: ${tagline || ""}
Category: ${category || "General"}
Key Features: ${(features || []).filter((f: string) => f.trim()).join(", ")}

Write 2-3 paragraphs covering what the product is, key benefits, and why customers should buy it. Use persuasive language.`;

    } else if (type === "seo_meta") {
      const { productName, tagline, description, category } = body;
      systemPrompt = `You are an SEO expert. Generate optimized meta title and description for e-commerce product pages. The meta title should be under 60 characters with the primary keyword. The meta description should be under 160 characters and include a call-to-action. Output in this exact format:
TITLE: [meta title here]
DESCRIPTION: [meta description here]
${langInstruction}`;
      userPrompt = `Generate SEO meta tags for this product:

Product: ${productName}
Tagline: ${tagline || ""}
Category: ${category || ""}
Description: ${(description || "").slice(0, 300)}

Store name: GiftCardVibe`;

    } else if (type === "blog_draft") {
      const { title, category, excerpt } = body;
      systemPrompt = `You are a skilled blog writer for GiftCardVibe, a digital products store. Write engaging, well-structured blog posts with proper headings (use ## for subheadings), short paragraphs, and actionable insights. Output ONLY the blog content in markdown format. Do NOT include the title as an H1 — start with the introduction. ${langInstruction}`;
      userPrompt = `Write a blog post draft:

Title: ${title}
Category: ${category || "General"}
${excerpt ? `Brief: ${excerpt}` : ""}

Write a comprehensive blog post with:
- An engaging introduction
- 3-4 sections with ## subheadings
- Practical tips or insights
- A brief conclusion
- Approximately 600-900 words`;

    } else if (type === "blog_seo") {
      const { title, content, category } = body;
      systemPrompt = `You are an SEO expert for blogs. Generate an optimized excerpt/meta description (under 160 characters) and 3-5 suggested tags for a blog post. Output in this exact format:
EXCERPT: [meta description here]
TAGS: [tag1, tag2, tag3]
${langInstruction}`;
      userPrompt = `Generate SEO metadata for this blog post:

Title: ${title}
Category: ${category || "General"}
Content preview: ${(content || "").slice(0, 500)}`;

    } else if (type === "review_response") {
      const { customerName, rating, reviewTitle, reviewContent, productName } = body;
      systemPrompt = `You are a friendly customer service manager for GiftCardVibe. Write professional, warm replies to customer reviews. Be thankful, address specific points they made, and if the review is negative, offer help. Keep it 2-4 sentences. Output ONLY the reply text. ${langInstruction}`;
      userPrompt = `Write a reply to this customer review:

Customer: ${customerName}
Product: ${productName || "Unknown"}
Rating: ${rating}/5
${reviewTitle ? `Title: ${reviewTitle}` : ""}
Review: ${reviewContent}`;

    } else if (type === "landing_section") {
      const { sectionType, productName, tagline, features, existingContent, action } = body;
      const actionGuide = action === "rewrite" 
        ? "Rewrite and improve the existing content below. Keep the same structure but make it more compelling and conversion-focused."
        : action === "fill"
        ? "Fill in any empty or incomplete fields in the existing content below. Keep existing content that is already good."
        : "Generate completely new, high-converting content from scratch. Ignore any existing content.";
      
      systemPrompt = `You are an expert landing page copywriter specializing in high-converting digital product sales pages. Write persuasive, benefit-driven copy. ${langInstruction}

Output MUST be valid JSON matching this structure (include only relevant fields for the section type):
{
  "heading": "...",
  "subheading": "...",
  "body": "...",
  "buttonText": "...",
  "badge": "...",
  "price": "...",
  "originalPrice": "...",
  "items": [{"title": "...", "description": "..."}]
}
Only include fields that are relevant for a "${sectionType}" section. For items, generate 3-5 entries.`;

      userPrompt = `${actionGuide}

Section type: ${sectionType}
Product: ${productName || "Digital Product"}
Tagline: ${tagline || ""}
Features: ${(features || []).join(", ")}
${existingContent ? `\nExisting content:\n${JSON.stringify(existingContent)}` : ""}`;

    } else if (type === "landing_full") {
      const { sections, productName, tagline, features } = body;
      systemPrompt = `You are an expert landing page copywriter. Generate complete content for ALL sections of a landing page. ${langInstruction}

Output MUST be valid JSON where each key is a section ID mapping to content:
{
  "sectionId": {
    "heading": "...",
    "subheading": "...",
    "body": "...",
    "buttonText": "...",
    "badge": "...",
    "items": [{"title": "...", "description": "..."}]
  }
}
For each section, only include fields relevant to its type. For items, generate 3-5 entries.`;

      const sectionList = (sections || []).map((s: any) => `- ${s.id} (type: ${s.type}, label: ${s.label})`).join("\n");
      userPrompt = `Generate complete high-converting landing page content for ALL these sections:

${sectionList}

Product: ${productName || "Digital Product"}
Tagline: ${tagline || ""}
Features: ${(features || []).join(", ")}

Make it persuasive and conversion-focused. Use urgency, social proof, and clear CTAs.`;

    } else {
      return new Response(
        JSON.stringify({ error: "Invalid type." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://giftcardvibe.xyz",
        "X-Title": "GiftCardVibe AI Generator",
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
        return new Response(JSON.stringify({ error: "Invalid OpenRouter API key." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "OpenRouter credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI provider error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
