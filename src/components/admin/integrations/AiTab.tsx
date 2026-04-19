import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Lock, Pencil, X } from "lucide-react";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
}

interface AiModel {
  id: string;
  model_id: string;
  label: string;
  is_default: boolean;
  sort_order: number;
}

interface Preset {
  id: string;
  label: string;
  content: string;
  is_system: boolean;
  sort_order: number;
}

export function AiTab({ settings, update }: Props) {
  const qc = useQueryClient();
  const enabled = (settings.ai_global_context_enabled ?? "true") !== "false";

  const { data: models = [] } = useQuery<AiModel[]>({
    queryKey: ["ai-models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_models")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AiModel[];
    },
  });

  const saveModel = useMutation({
    mutationFn: async (m: Partial<AiModel> & { id?: string }) => {
      if (m.id) {
        const { error } = await supabase
          .from("ai_models")
          .update({ model_id: m.model_id, label: m.label })
          .eq("id", m.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ai_models")
          .insert({ model_id: m.model_id || "", label: m.label || "Untitled", sort_order: 1000 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-models"] });
      toast({ title: "Model saved" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteModel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_models").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-models"] });
      toast({ title: "Model deleted" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const { data: presets = [] } = useQuery<Preset[]>({
    queryKey: ["ai-context-presets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_context_presets")
        .select("*")
        .order("is_system", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Preset[];
    },
  });

  const savePreset = useMutation({
    mutationFn: async (p: Partial<Preset> & { id?: string }) => {
      if (p.id) {
        const { error } = await supabase
          .from("ai_context_presets")
          .update({ label: p.label, content: p.content })
          .eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ai_context_presets")
          .insert({ label: p.label || "Untitled", content: p.content || "", is_system: false, sort_order: 1000 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-context-presets"] });
      toast({ title: "Preset saved" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deletePreset = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_context_presets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-context-presets"] });
      toast({ title: "Preset deleted" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-8 py-4">
      {/* OpenRouter config */}
      <section>
        <h3 className="text-sm font-bold mb-1">OpenRouter AI</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Powers AI generation across the admin. Get your API key from{" "}
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            openrouter.ai/keys
          </a>
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider">API Key</Label>
            <Input
              type="password"
              value={settings.openrouter_api_key || ""}
              onChange={(e) => update("openrouter_api_key", e.target.value)}
              placeholder="sk-or-v1-..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider">Default Model</Label>
            <Select
              value={settings.openrouter_model || (models[0]?.model_id ?? "google/gemini-2.5-flash")}
              onValueChange={(v) => update("openrouter_model", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.model_id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Manage the available list below.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider">Custom Model ID (override)</Label>
            <Input
              value={settings.openrouter_custom_model || ""}
              onChange={(e) => update("openrouter_custom_model", e.target.value)}
              placeholder="e.g. deepseek/deepseek-r1 — overrides Default Model when set"
            />
          </div>
        </div>
      </section>

      {/* Models registry */}
      <section className="border-t border-border/60 pt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold">Available Models</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Models that appear in the Default Model dropdown. Use any{" "}
              <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-primary underline">OpenRouter model ID</a>.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => saveModel.mutate({ model_id: "provider/model", label: "New model" })}
          >
            <Plus className="h-3.5 w-3.5" /> Add model
          </Button>
        </div>

        <div className="space-y-2">
          {models.map((m) => (
            <ModelRow
              key={m.id}
              model={m}
              onSave={(model_id, label) => saveModel.mutate({ id: m.id, model_id, label })}
              onDelete={() => deleteModel.mutate(m.id)}
            />
          ))}
          {models.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No models yet — add one to get started.</p>
          )}
        </div>
      </section>

      {/* Global brand context */}
      <section className="border-t border-border/60 pt-6">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h3 className="text-sm font-bold">Global Brand Context</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-injected into <strong>every</strong> AI generation. Tell the AI who you are, what you sell, your audience, and your overall voice.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Label className="text-xs">Enabled</Label>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => update("ai_global_context_enabled", v ? "true" : "false")}
            />
          </div>
        </div>
        <Textarea
          value={settings.ai_global_context || ""}
          onChange={(e) => update("ai_global_context", e.target.value)}
          placeholder="Example: We are GiftCardVibe, a Bangladesh-based digital gift card and subscription marketplace. We sell Netflix, Spotify, Steam, iTunes, and other digital products to tech-savvy young adults aged 18–35. Our voice is friendly, trustworthy, and modern. We focus on instant delivery, secure payments via bKash/Nagad, and 24/7 support."
          className="min-h-[140px] text-sm"
        />
      </section>

      {/* Context presets */}
      <section className="border-t border-border/60 pt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold">Context Presets</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Reusable instructions admins can pick when generating content. System presets (locked) can be edited but not deleted.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => savePreset.mutate({ label: "New preset", content: "" })}
          >
            <Plus className="h-3.5 w-3.5" /> Add preset
          </Button>
        </div>

        <div className="space-y-2">
          {presets.map((p) => (
            <PresetRow
              key={p.id}
              preset={p}
              onSave={(label, content) => savePreset.mutate({ id: p.id, label, content })}
              onDelete={() => deletePreset.mutate(p.id)}
            />
          ))}
          {presets.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No presets yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function PresetRow({
  preset,
  onSave,
  onDelete,
}: {
  preset: Preset;
  onSave: (label: string, content: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(preset.label);
  const [content, setContent] = useState(preset.content);

  if (!editing) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/10 p-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {preset.is_system && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
            <span className="text-sm font-medium truncate">{preset.label}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{preset.content || <em>empty</em>}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setLabel(preset.label); setContent(preset.content); setEditing(true); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {!preset.is_system && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2">
      <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Preset name" className="h-8 text-sm" />
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Instructions for the AI..." className="min-h-[80px] text-xs" />
      <div className="flex gap-1 justify-end">
        <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setEditing(false)}>
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
        <Button size="sm" className="h-7 gap-1" onClick={() => { onSave(label, content); setEditing(false); }}>
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
      </div>
    </div>
  );
}

function ModelRow({
  model,
  onSave,
  onDelete,
}: {
  model: AiModel;
  onSave: (model_id: string, label: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [modelId, setModelId] = useState(model.model_id);
  const [label, setLabel] = useState(model.label);

  if (!editing) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/10 p-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{model.label}</p>
          <code className="text-[10px] text-muted-foreground font-mono">{model.model_id}</code>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setModelId(model.model_id); setLabel(model.label); setEditing(true); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2">
      <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Display label (e.g. Gemini 2.5 Flash)" className="h-8 text-sm" />
      <Input value={modelId} onChange={(e) => setModelId(e.target.value)} placeholder="OpenRouter model ID (e.g. google/gemini-2.5-flash)" className="h-8 text-xs font-mono" />
      <div className="flex gap-1 justify-end">
        <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setEditing(false)}>
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
        <Button size="sm" className="h-7 gap-1" onClick={() => { onSave(modelId, label); setEditing(false); }}>
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
      </div>
    </div>
  );
}
