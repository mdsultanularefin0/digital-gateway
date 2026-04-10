import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
}

const MODELS = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (fast, cheap)" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (best quality)" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini (balanced)" },
  { id: "openai/gpt-4o", label: "GPT-4o (powerful)" },
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
  { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick (free)" },
];

export function AiTab({ settings, update }: Props) {
  return (
    <div className="space-y-6 py-4">
      <div>
        <h3 className="text-sm font-bold mb-1">OpenRouter AI</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Powers AI caption generation in the Post Generator. Get your API key from{" "}
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            openrouter.ai/keys
          </a>
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider">API Key</Label>
          <Input
            type="password"
            value={settings.openrouter_api_key || ""}
            onChange={(e) => update("openrouter_api_key", e.target.value)}
            placeholder="sk-or-v1-..."
          />
          <p className="text-[10px] text-muted-foreground">Your OpenRouter API key. Stored securely in the database.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider">Default Model</Label>
          <Select
            value={settings.openrouter_model || "google/gemini-2.5-flash"}
            onValueChange={(v) => update("openrouter_model", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">Model used for AI content generation.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider">Custom Model ID (optional)</Label>
          <Input
            value={settings.openrouter_custom_model || ""}
            onChange={(e) => update("openrouter_custom_model", e.target.value)}
            placeholder="e.g. deepseek/deepseek-r1"
          />
          <p className="text-[10px] text-muted-foreground">Override the default model with any OpenRouter model ID.</p>
        </div>
      </div>
    </div>
  );
}
