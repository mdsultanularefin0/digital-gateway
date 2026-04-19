import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Check, Copy, Globe, MessageSquarePlus, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

interface ContextPreset {
  id: string;
  label: string;
  content: string;
  is_system: boolean;
}

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
  const [userContext, setUserContext] = useState("");

  const { data: presets = [] } = useQuery<ContextPreset[]>({
    queryKey: ["ai-context-presets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_context_presets")
        .select("id, label, content, is_system")
        .order("is_system", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ContextPreset[];
    },
    staleTime: 60_000,
  });

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: { type, language, userContext, ...payload },
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

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`text-[10px] font-medium px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
              userContext.trim()
                ? "border-primary/40 text-primary bg-primary/5"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/20"
            }`}
            title="Add context / instructions"
          >
            <MessageSquarePlus className="h-3 w-3" />
            Context{userContext.trim() ? " ✓" : ""}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="end">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Custom instructions for the AI</p>
              <Link
                to="/admin/integrations"
                className="text-[10px] text-primary hover:underline flex items-center gap-1"
                title="Manage presets in Integrations → AI"
              >
                <Settings2 className="h-2.5 w-2.5" /> Manage
              </Link>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Pick a preset or write your own. The Global Brand Context is auto-applied.
            </p>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Presets</p>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {presets.length === 0 && (
                  <span className="text-[10px] text-muted-foreground italic">No presets yet — add some in Integrations → AI.</span>
                )}
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setUserContext(preset.content)}
                    className="text-[10px] px-2 py-1 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-accent/40 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              placeholder="e.g. Use a friendly, casual tone. Focus on small business owners. Avoid technical jargon. Keep it under 150 words."
              className="text-xs min-h-[100px]"
            />
            {userContext.trim() && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] w-full"
                onClick={() => setUserContext("")}
              >
                Clear context
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

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
