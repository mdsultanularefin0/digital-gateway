import { withLogging } from "../_shared/logger.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withLogging("ai-generate", async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { data: settingsRows } = await sb
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "openrouter_api_key",
        "openrouter_model",
        "openrouter_custom_model",
        "ai_global_context",
        "ai_global_context_enabled",
      ]);

    const cfg: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => (cfg[r.key] = r.value));

    // Build global context block (auto-applied unless explicitly disabled)
    const globalContextEnabled = (cfg.ai_global_context_enabled ?? "true") !== "false";
    const globalContext = globalContextEnabled && cfg.ai_global_context?.trim()
      ? cfg.ai_global_context.trim()
      : "";

    const apiKey = cfg.openrouter_api_key;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenRouter API key not configured. Go to Admin → Integrations → AI." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { type, language, userContext, modelOverride } = body;
    const model = (typeof modelOverride === "string" && modelOverride.trim())
      ? modelOverride.trim()
      : (cfg.openrouter_custom_model || cfg.openrouter_model || "google/gemini-2.5-flash");
    const lang = language === "bn" ? "bn" : "en";
    const langInstruction = lang === "bn"
      ? "IMPORTANT: Write the ENTIRE response in Bengali (বাংলা). Use Bengali script throughout."
      : "Write the response in English.";

    const contextInstruction = [
      globalContext ? `\n\nBRAND CONTEXT (always apply — this is who we are and what we sell):\n${globalContext}` : "",
      (userContext && typeof userContext === "string" && userContext.trim())
        ? `\n\nADDITIONAL USER INSTRUCTIONS (highest priority — follow these carefully):\n${userContext.trim()}`
        : "",
    ].join("");

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
      systemPrompt = `You are an SEO expert for an e-commerce site (GiftCardVibe). Generate optimized meta tags for a product page.

Output in this EXACT format (no markdown fences, no extra text):
TITLE: [meta title under 60 chars, primary keyword first]
DESCRIPTION: [meta description under 160 chars with a clear benefit + call-to-action]
KEYWORDS: [5-8 comma-separated keywords/phrases, lowercase]

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
      systemPrompt = `You are an SEO expert for blogs. Generate optimized meta tags for a blog post.

Output in this EXACT format (no markdown fences, no extra text):
TITLE: [SEO title under 60 chars, hook the reader]
DESCRIPTION: [meta description / excerpt under 160 chars]
KEYWORDS: [5-8 comma-separated keywords, lowercase]
EXCERPT: [short on-page excerpt, 1-2 sentences, can match DESCRIPTION]
TAGS: [3-5 comma-separated content tags]

${langInstruction}`;
      userPrompt = `Generate SEO metadata for this blog post:

Title: ${title}
Category: ${category || "General"}
Content preview: ${(content || "").slice(0, 500)}`;

    } else if (type === "page_meta") {
      const { pageSlug, pageLabel, siteName, sampleHeading, sampleBody } = body;
      systemPrompt = `You are an SEO expert. Generate optimized meta tags for a website page.

Output in this EXACT format (no markdown fences, no extra text):
TITLE: [meta title under 60 chars, includes the site name where natural]
DESCRIPTION: [meta description under 160 chars, clear value statement]
KEYWORDS: [5-8 comma-separated keywords, lowercase]

${langInstruction}`;
      userPrompt = `Generate SEO meta tags for this page:

Page: ${pageLabel || pageSlug}
Slug: /${pageSlug}
Site: ${siteName || "GiftCardVibe"}
${sampleHeading ? `Page heading: ${sampleHeading}` : ""}
${sampleBody ? `Sample copy: ${(sampleBody as string).slice(0, 400)}` : ""}`;

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
      
      systemPrompt = `You are an expert landing page copywriter for a high-converting digital product sales page. Write persuasive, benefit-driven copy. ${langInstruction}

CRITICAL OUTPUT RULES:
- Output ONLY a single raw JSON object — nothing else.
- Do NOT wrap in markdown code fences (no triple backticks).
- Do NOT add any explanation, preamble, or commentary before or after the JSON.
- Only include fields relevant to the "${sectionType}" section type.
- For "items" arrays, generate 3-5 entries each with "title" and "description" keys.

Allowed fields: heading, subheading, body, buttonText, badge, price, originalPrice, items`;

      userPrompt = `${actionGuide}

Section type: ${sectionType}
Product: ${productName || "Digital Product"}
Tagline: ${tagline || ""}
Features: ${(features || []).join(", ")}
${existingContent ? `\nExisting content:\n${JSON.stringify(existingContent)}` : ""}

Respond with ONLY the JSON object.`;

    } else if (type === "page_section") {
      const { pageSlug, sectionKey, sectionLabel, fieldType, currentValue, repeaterFields, itemLabel, siteName } = body;

      if (fieldType === "repeater") {
        const fieldList = (repeaterFields || [])
          .map((f: any) => `  - "${f.key}": ${f.label}${f.placeholder ? ` (e.g. ${f.placeholder})` : ""}`)
          .join("\n");
        systemPrompt = `You are an expert website copywriter for "${siteName || "this site"}". You generate content for the "${sectionLabel}" section on the "${pageSlug}" page.

Output MUST be a valid JSON array of items. Each item is an object with these fields:
${fieldList}

Output ONLY the JSON array, no markdown fences, no commentary. Generate 3-6 high-quality items unless the user specifies otherwise. ${langInstruction}`;
        userPrompt = `Generate items for the "${itemLabel || "Item"}" repeater on page "${pageSlug}", section "${sectionLabel}".

${currentValue ? `Existing items (improve / extend in the same spirit):\n${currentValue}\n` : "No existing items — start fresh."}

Make each item concise, on-brand, and conversion-focused.`;
      } else if (fieldType === "rich") {
        systemPrompt = `You are an expert website copywriter for "${siteName || "this site"}". Write content for the "${sectionLabel}" section on the "${pageSlug}" page.

Output clean, semantic HTML using these tags only: <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <a>. Do NOT include <html>, <body>, markdown fences, or commentary — output ONLY the HTML body content. ${langInstruction}`;
        userPrompt = `Write the content for the "${sectionLabel}" section on page "${pageSlug}".

${currentValue ? `Existing content (rewrite & improve, preserve intent):\n${currentValue}\n` : "No existing content — write from scratch."}

Keep paragraphs short and scannable. Use headings sparingly.`;
      } else {
        systemPrompt = `You are an expert website copywriter for "${siteName || "this site"}". Write content for the "${sectionLabel}" field on the "${pageSlug}" page.

Output ONLY the plain text for this field — no quotes, no markdown, no commentary, no HTML. Match the field's purpose: a heading should be short and punchy, a description should be 1-2 sentences, a CTA should be 2-4 words. ${langInstruction}`;
        userPrompt = `Write the value for the "${sectionLabel}" field on page "${pageSlug}".

${currentValue ? `Existing value (rewrite & improve):\n${currentValue}\n` : "No existing value — write from scratch."}`;
      }

    } else if (type === "landing_full") {
      const { sections, productName, tagline, features } = body;
      systemPrompt = `You are an expert landing page copywriter. Generate complete content for ALL sections of a landing page. ${langInstruction}
The output MUST be a single JSON object where each key is an EXACT section ID provided by the user.
Do NOT nest all sections inside a generic "sections" key. The root keys should be the section IDs.

Allowed fields per section: heading, subheading, body, buttonText, badge, price, originalPrice, items (array of {title, description}), images (array of URLs), imageRatio, imageUrl, countdownDate.

CRITICAL OUTPUT RULES:
- Output ONLY a single raw JSON object — nothing else.
- Do NOT wrap in markdown code fences (no triple backticks).
- Do NOT add any explanation, preamble, or commentary before or after the JSON.
- For each section value, include only the fields relevant to that section type.
- Keep the tone persuasive and conversion-focused.

Example structure:
{ 
  "hero-123": { "heading": "...", "subheading": "...", "buttonText": "..." }, 
  "features-456": { "heading": "...", "items": [{"title": "...", "description": "..."}] } 
}`;

      const sectionList = (sections || []).map((s: any) => `- ${s.id} (type: ${s.type}, label: ${s.label})`).join("\n");
      userPrompt = `Generate complete high-converting landing page content for ALL these sections:

${sectionList}

Product: ${productName || "Digital Product"}
Tagline: ${tagline || ""}
Features: ${(features || []).join(", ")}

Make it persuasive and conversion-focused. Use urgency, social proof, and clear CTAs.

Respond with ONLY the JSON object.`;

    } else if (type === "social_caption") {
      const { platform, mediaType, target, topic, productName, tone } = body;
      const plat = platform || target || "facebook";
      const isReel = mediaType === "video";

      const platformGuide: Record<string, string> = {
        facebook: "Write for a Facebook Page post. Conversational and engaging. 2-3 short paragraphs. Use 1-2 emojis sparingly. End with a soft CTA. Add 3-5 relevant hashtags on the last line.",
        instagram: isReel
          ? "Write for an Instagram Reel. Strong hook in the first line (stop-the-scroll). Short punchy lines, line breaks for rhythm. Use trending-style phrasing. End with a CTA (comment / save / share). Add 15-20 relevant hashtags on the last line."
          : "Write for an Instagram feed post. Hook line first, then 2-3 short value lines with emojis. Strong CTA. Add 15-20 relevant hashtags on the last line.",
        both: "Write a caption that works for BOTH Facebook and Instagram. Engaging hook, 2-3 short paragraphs, 1-2 emojis, soft CTA. Add 8-12 relevant hashtags on the last line.",
      };

      const guide = platformGuide[plat] || platformGuide.facebook;

      systemPrompt = `You are an expert social media copywriter. You write high-converting captions that drive engagement and sales. Output ONLY the caption text — no preamble, no quotes, no markdown code fences. ${langInstruction}`;

      userPrompt = `Generate a social media caption.

Platform: ${plat}${isReel ? " (Reel / short video)" : ""}
${topic ? `Topic / message: ${topic}` : ""}
${productName ? `Product: ${productName}` : ""}
${tone ? `Tone: ${tone}` : ""}

${guide}`;

    } else if (type === "poster_content") {
      const { layout, productName, tagline, price, currencySymbol, posterContext } = body;

      systemPrompt = `You are an expert visual social-media poster copywriter. You write extremely short, punchy, scroll-stopping copy for Instagram/Facebook posters. Output ONLY a single valid JSON object — no preamble, no markdown, no code fences, no commentary. Keep every value SHORT — designed to fit on a poster, not a paragraph. ${langInstruction}`;

      const layoutGuide: Record<string, string> = {
        split: "Standard product card. Need: punchy productName (1-4 words), tagline (max 8 words), badge (2-4 words ALL CAPS), ctaText (1-3 words ALL CAPS), 3-5 short feature bullets (max 4 words each), footerText (short call-to-action line).",
        centered: "Centered hero. Same fields as split but bolder/shorter. Headline must be a single power statement.",
        "bold-stack": "Bold typographic stack. Headline = 1-3 BIG words. Tagline = supporting line.",
        minimal: "Minimal card. Clean, restrained copy.",
        diagonal: "Diagonal cut design. Bold headline, short tagline.",
        quote: "Minimal quote layout. The MAIN field is tagline — write it as a strong, memorable QUOTE / one-liner / hot take (max 12 words). productName becomes the attribution. No features needed.",
        sale: "Price drop. Badge MUST be a discount % or 'SALE'. Headline short and urgent. ctaText urgent. 2-3 short benefit bullets.",
        testimonial: "Customer testimonial. MAIN fields are testimonialQuote (1-2 short sentences, sounds like a real customer) and testimonialAuthor (realistic first name + last initial, e.g. 'Sarah K.'). Keep tagline empty or very short.",
        carousel: "Carousel slide. productName = slide title (3-6 words). tagline = body text for THIS slide (1 short sentence). No price/cta needed.",
      };

      const guide = layoutGuide[layout] || layoutGuide.split;

      userPrompt = `Generate poster copy for layout: "${layout}".
${guide}

Existing context (use as inspiration, you may rewrite if context below conflicts):
- Product: ${productName || "(none)"}
- Current tagline: ${tagline || "(none)"}
- Price: ${price || "(none)"}
- Currency: ${currencySymbol || "৳"}

User instructions for THIS poster:
${posterContext?.trim() || "(none — improvise based on the product)"}

Return ONLY this JSON object (omit fields that don't apply to the layout, but include the keys with empty string ""):
{
  "productName": "",
  "tagline": "",
  "badge": "",
  "ctaText": "",
  "footerText": "",
  "features": ["", "", ""],
  "testimonialQuote": "",
  "testimonialAuthor": ""
}`;

    } else if (type === "translate") {
      const { text, target, context } = body;
      const targetLang = target === "en" ? "en" : "bn";
      const directionLabel = targetLang === "bn" ? "Bangla (Bengali)" : "English";
      const ctxMap: Record<string, string> = {
        product: "Digital e-commerce product copy (name, tagline, description, features).",
        page: "CMS website page content (headings, paragraphs, FAQ items). May contain HTML — preserve tags.",
        blog: "A blog post. Preserve formatting and paragraph structure.",
        generic: "General marketing copy.",
      };
      systemPrompt = `You are a professional bilingual translator for a Bangladeshi digital commerce site (gift cards, subscriptions, digital products).

TASK: Translate the given text into ${directionLabel}.
CONTEXT: ${ctxMap[context as string] ?? ctxMap.generic}

RULES:
- Translate naturally, not literally. Sound like a native speaker writing marketing copy.
- Preserve HTML tags, markdown, emoji, URLs, brand names, and product names (e.g. "Netflix", "bKash", "Spotify") exactly.
- Preserve currency symbols and numbers.
- For Bangla: use modern conversational Bangla, not overly formal "sadhu" style. Tech terms can stay in English inside Bangla sentences if that's how people actually speak (e.g. "সাবস্ক্রিপশন", "অ্যাকাউন্ট").
- Return ONLY the translated text. No preamble, no quotes, no explanations.`;
      userPrompt = String(text || "").trim();
      if (!userPrompt) {
        return new Response(
          JSON.stringify({ error: "text is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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
          { role: "system", content: systemPrompt + contextInstruction },
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
}));
