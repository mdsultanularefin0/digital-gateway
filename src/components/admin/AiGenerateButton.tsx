import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Check, Copy, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AiGenerateButtonProps {
  type: string;
  payload: Record<string, any>;
  onResult: (result: string) => void;
  label?: string;
  className?: string;
}

export function AiGenerateButton({ type, payload, onResult, label = "AI Generate", className }: AiGenerateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<"en" | "bn">("en");

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: { type, language, ...payload },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.result) {
        onResult(data.result);
        toast({ title: "AI content generated!" });
      }
    } catch (e: any) {
      toast({ title: e.message || "AI generation failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex items-center gap-1.5 ${className || ""}`}>
      <button
        type="button"
        onClick={() => setLanguage(language === "en" ? "bn" : "en")}
        className="text-[10px] font-medium px-2 py-1 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors flex items-center gap-1"
        title="Toggle language"
      >
        <Globe className="h-3 w-3" />
        {language === "en" ? "EN" : "বা"}
      </button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={generate}
        disabled={loading}
        className="gap-1.5 text-xs rounded-lg"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        {loading ? "Generating..." : label}
      </Button>
    </div>
  );
}

export function AiResultPreview({ result, onApply, onCopy }: { result: string; onApply?: () => void; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast({ title: "Copied!" });
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  return (
    <div className="mt-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto relative">
      {result}
      <div className="absolute top-2 right-2 flex gap-1">
        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded-md bg-background/90 border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        </button>
        {onApply && (
          <Button type="button" variant="outline" size="sm" onClick={onApply} className="h-7 text-[10px] px-2">
            Apply
          </Button>
        )}
      </div>
    </div>
  );
}
