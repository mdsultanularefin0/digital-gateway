import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageSquarePlus, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ContextPreset {
  id: string;
  label: string;
  content: string;
  is_system: boolean;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Standalone preset/context picker pill for AI buttons that aren't using
 * the shared AiGenerateButton (e.g. SEO/meta generators with custom parsers).
 */
export function AiContextPicker({ value, onChange }: Props) {
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
            value.trim()
              ? "border-primary text-primary bg-primary/10"
              : "border-primary/30 text-primary/80 hover:text-primary hover:border-primary/60 hover:bg-primary/5"
          }`}
          title="Pick a preset or add custom context"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          Preset / Context{value.trim() ? " ✓" : ""}
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
                  onClick={() => onChange(preset.content)}
                  className="text-[10px] px-2 py-1 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-accent/40 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. Use a friendly, casual tone. Focus on small business owners. Keep it under 150 words."
            className="text-xs min-h-[100px]"
          />
          {value.trim() && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] w-full"
              onClick={() => onChange("")}
            >
              Clear context
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
