import { Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { uploadToStorage } from "@/lib/storage";

export interface MetaSeoValues {
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  /** Optional — only shown when `showOgImage` is true. */
  og_image_url?: string;
}

interface Props {
  values: MetaSeoValues;
  onChange: (next: MetaSeoValues) => void;
  /**
   * AI generation type: `seo_meta` (products), `blog_seo` (blog), `page_meta` (static pages).
   * The result is parsed for TITLE / DESCRIPTION / KEYWORDS lines.
   */
  aiType: "seo_meta" | "blog_seo" | "page_meta";
  /** Extra payload merged into the AI request body. */
  aiPayload: Record<string, any>;
  /** Show the Open Graph image uploader. Default: true. */
  showOgImage?: boolean;
  /** Override language label shown in field labels (EN / বাংলা). */
  langLabel?: string;
  /** Show a translate-from-EN bar on Bangla side (parent provides handler). */
  translateAction?: React.ReactNode;
}

const inputClass =
  "h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
const textareaClass =
  "w-full rounded-xl border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]";

function parseMetaResult(result: string): Partial<MetaSeoValues> {
  const out: Partial<MetaSeoValues> = {};
  const t = result.match(/TITLE:\s*(.+)/i);
  if (t?.[1]) out.meta_title = t[1].trim();
  const d = result.match(/DESCRIPTION:\s*(.+)/i);
  if (d?.[1]) out.meta_description = d[1].trim();
  const k = result.match(/KEYWORDS:\s*(.+)/i);
  if (k?.[1]) out.meta_keywords = k[1].trim();
  return out;
}

export function MetaSeoFields({
  values,
  onChange,
  aiType,
  aiPayload,
  showOgImage = true,
  langLabel,
  translateAction,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: { type: aiType, language: "en", ...aiPayload },
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

  const handleOgUpload = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await uploadToStorage(file, "products");
      onChange({ ...values, og_image_url: url });
      toast({ title: "OG image uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const titleLen = values.meta_title?.length ?? 0;
  const descLen = values.meta_description?.length ?? 0;

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold">SEO Meta {langLabel ? `(${langLabel})` : ""}</h3>
          <p className="text-xs text-muted-foreground">Search engine title, description & keywords. Leave blank to auto-fall-back.</p>
        </div>
        <div className="flex items-center gap-2">
          {translateAction}
          <Button type="button" variant="outline" size="sm" onClick={handleGenerate} disabled={generating} className="gap-1.5">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {generating ? "Generating..." : "AI Generate"}
          </Button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium">Meta Title</label>
          <span className={`text-[10px] ${titleLen > 60 ? "text-destructive" : "text-muted-foreground"}`}>{titleLen}/60</span>
        </div>
        <input
          value={values.meta_title}
          onChange={(e) => onChange({ ...values, meta_title: e.target.value })}
          placeholder="Concise, keyword-rich title under 60 chars"
          className={inputClass}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium">Meta Description</label>
          <span className={`text-[10px] ${descLen > 160 ? "text-destructive" : "text-muted-foreground"}`}>{descLen}/160</span>
        </div>
        <textarea
          value={values.meta_description}
          onChange={(e) => onChange({ ...values, meta_description: e.target.value })}
          placeholder="Compelling 1-2 sentence summary under 160 chars"
          className={textareaClass}
        />
      </div>

      <div>
        <label className="text-xs font-medium block mb-1">Meta Keywords</label>
        <input
          value={values.meta_keywords}
          onChange={(e) => onChange({ ...values, meta_keywords: e.target.value })}
          placeholder="comma, separated, keywords"
          className={inputClass}
        />
      </div>

      {showOgImage && (
        <div>
          <label className="text-xs font-medium block mb-1">Open Graph Image (social share)</label>
          <div className="flex gap-2 items-start flex-wrap">
            {values.og_image_url ? (
              <div className="relative">
                <img src={values.og_image_url} alt="OG preview" className="h-20 w-36 object-cover rounded-lg border border-border" />
                <button
                  type="button"
                  onClick={() => onChange({ ...values, og_image_url: "" })}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ) : null}
            <div className="flex-1 min-w-[200px] space-y-2">
              <input
                value={values.og_image_url || ""}
                onChange={(e) => onChange({ ...values, og_image_url: e.target.value })}
                placeholder="Paste image URL or upload below"
                className={inputClass}
              />
              <label className="inline-flex items-center gap-2 text-xs cursor-pointer rounded-lg border border-dashed border-border px-3 py-1.5 hover:border-primary/50">
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleOgUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
