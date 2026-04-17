import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Languages, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  sourceText: string;
  target?: "bn" | "en";
  context?: "product" | "page" | "blog" | "generic";
  onTranslated: (translated: string) => void;
  label?: string;
  size?: "sm" | "xs";
  disabled?: boolean;
}

export function TranslateButton({
  sourceText,
  target = "bn",
  context = "generic",
  onTranslated,
  label,
  size = "sm",
  disabled,
}: Props) {
  const [loading, setLoading] = useState(false);
  const buttonLabel = label ?? (target === "bn" ? "Translate to Bangla" : "Translate to English");

  const run = async () => {
    if (!sourceText?.trim()) {
      toast({ title: "Nothing to translate", description: "Source text is empty.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate", {
        body: { text: sourceText, target, context },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const result = (data?.translated || "").trim();
      if (!result) throw new Error("Empty translation");
      onTranslated(result);
      toast({ title: "Translated", description: `→ ${target === "bn" ? "Bangla" : "English"}` });
    } catch (err: any) {
      toast({ title: "Translation failed", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size === "xs" ? "sm" : "sm"}
      onClick={run}
      disabled={loading || disabled}
      className={size === "xs" ? "h-7 text-xs gap-1" : "gap-1.5"}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
      {buttonLabel}
    </Button>
  );
}
