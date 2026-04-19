import { useQuery } from "@tanstack/react-query";
import { Cpu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface AiModel {
  id: string;
  model_id: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (modelId: string) => void;
}

/**
 * Standalone model picker pill for AI buttons that aren't using
 * the shared AiGenerateButton.
 */
export function AiModelPicker({ value, onChange }: Props) {
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`text-[10px] font-medium px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 max-w-[140px] ${
            value
              ? "border-primary text-primary bg-primary/10"
              : "border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/20"
          }`}
          title="Pick AI model for this generation"
        >
          <Cpu className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {value
              ? (models.find((m) => m.model_id === value)?.label ?? "Custom")
              : "Default model"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide px-1">
          Model for this generation
        </p>
        <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
          <button
            type="button"
            onClick={() => onChange("")}
            className={`text-left text-xs px-2 py-1.5 rounded-md transition-colors ${
              !value ? "bg-primary/10 text-primary font-semibold" : "hover:bg-accent/40 text-foreground"
            }`}
          >
            Use default (from settings)
          </button>
          {models.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.model_id)}
              className={`text-left text-xs px-2 py-1.5 rounded-md transition-colors ${
                value === m.model_id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-accent/40 text-foreground"
              }`}
            >
              <div className="truncate">{m.label}</div>
              <div className="text-[9px] text-muted-foreground font-mono truncate">{m.model_id}</div>
            </button>
          ))}
          {models.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic px-2 py-1">
              No models — add some in Integrations → AI.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
