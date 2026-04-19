import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Check, Copy, Globe, MessageSquarePlus, Settings2, Cpu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ContextPreset {
  id: string;
  label: string;
  content: string;
  is_system: boolean;
}

interface AiModel {
  id: string;
  model_id: string;
  label: string;
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
  const [modelOverride, setModelOverride] = useState<string>("");

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

  const { data: models = [] } = useQuery<AiModel[]>({
    queryKey: ["ai-models-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_models")
        .select("id, model_id, label")
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AiModel[];
    },
    staleTime: 60_000,
  });

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: { type, language, userContext, modelOverride: modelOverride || undefined, ...payload },
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
            className={`text-[10px] font-medium px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 max-w-[140px] ${
              modelOverride
                ? "border-primary text-primary bg-primary/10"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/20"
            }`}
            title="Pick AI model for this generation"
          >
            <Cpu className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {modelOverride
                ? (models.find((m) => m.model_id === modelOverride)?.label ?? "Custom")
                : "Default model"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="end">
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide px-1">Model for this generation</p>
          <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
            <button
              type="button"
              onClick={() => setModelOverride("")}
              className={`text-left text-xs px-2 py-1.5 rounded-md transition-colors ${
                !modelOverride ? "bg-primary/10 text-primary font-semibold" : "hover:bg-accent/40 text-foreground"
              }`}
            >
              Use default (from settings)
            </button>
            {models.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModelOverride(m.model_id)}
                className={`text-left text-xs px-2 py-1.5 rounded-md transition-colors ${
                  modelOverride === m.model_id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-accent/40 text-foreground"
                }`}
              >
                <div className="truncate">{m.label}</div>
                <div className="text-[9px] text-muted-foreground font-mono truncate">{m.model_id}</div>
              </button>
            ))}
            {models.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic px-2 py-1">No models — add some in Integrations → AI.</p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>

        <PopoverTrigger asChild>
          <button
            type="button"
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
              userContext.trim()
                ? "border-primary text-primary bg-primary/10"
                : "border-primary/30 text-primary/80 hover:text-primary hover:border-primary/60 hover:bg-primary/5"
            }`}
            title="Pick a preset or add custom context"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Preset / Context{userContext.trim() ? " ✓" : ""}
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
