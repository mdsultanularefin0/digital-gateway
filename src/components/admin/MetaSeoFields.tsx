import { Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LinkPreviewCard } from "@/components/admin/LinkPreviewCard";
import { parseMetaResult } from "@/components/admin/meta-seo/parseMetaResult";
import { MetaTextFields } from "@/components/admin/meta-seo/MetaTextFields";
import { OgImagePicker } from "@/components/admin/meta-seo/OgImagePicker";
import { AdvancedSeoFields } from "@/components/admin/meta-seo/AdvancedSeoFields";
import { AiContextPicker } from "@/components/admin/AiContextPicker";

export interface MetaSeoValues {
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  og_image_url?: string;
  twitter_card?: string;
  canonical_url?: string;
}

interface Props {
  values: MetaSeoValues;
  onChange: (next: MetaSeoValues) => void;
  aiType: "seo_meta" | "blog_seo" | "page_meta";
  aiPayload: Record<string, any>;
  showOgImage?: boolean;
  langLabel?: string;
  translateAction?: React.ReactNode;
  showAdvanced?: boolean;
  showPreview?: boolean;
  siteName?: string;
}

export function MetaSeoFields({
  values,
  onChange,
  aiType,
  aiPayload,
  showOgImage = true,
  langLabel,
  translateAction,
  showAdvanced = true,
  showPreview = true,
  siteName,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [userContext, setUserContext] = useState("");

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: { type: aiType, language: "en", userContext, ...aiPayload },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const parsed = parseMetaResult(data?.result || "");
      if (!parsed.meta_title && !parsed.meta_description && !parsed.meta_keywords) {
        throw new Error("AI returned no parseable meta fields");
      }
      onChange({ ...values, ...parsed } as MetaSeoValues);
      toast({ title: "Meta tags generated" });
    } catch (e: any) {
      toast({ title: "AI failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold">SEO &amp; Link Preview {langLabel ? `(${langLabel})` : ""}</h3>
          <p className="text-xs text-muted-foreground">
            Controls the title, description, image &amp; URL shown when this page is shared on Facebook, X, LinkedIn, WhatsApp, etc.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {translateAction}
          <AiContextPicker value={userContext} onChange={setUserContext} />
          <Button type="button" variant="outline" size="sm" onClick={handleGenerate} disabled={generating} className="gap-1.5">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {generating ? "Generating..." : "AI Generate"}
          </Button>
        </div>
      </div>

      <MetaTextFields values={values} onChange={onChange} />

      {showOgImage && <OgImagePicker values={values} onChange={onChange} />}

      {showAdvanced && <AdvancedSeoFields values={values} onChange={onChange} />}

      {showPreview && (
        <div className="pt-3 border-t border-border">
          <LinkPreviewCard
            title={values.meta_title}
            description={values.meta_description}
            ogImage={values.og_image_url}
            canonical={values.canonical_url}
            twitterCard={values.twitter_card || "summary_large_image"}
            siteName={siteName}
          />
        </div>
      )}
    </div>
  );
}
