import { useState } from "react";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("dismissed-announcements") || "[]");
    } catch { return []; }
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const active = announcements.find((a) => !dismissed.includes(a.id));
  if (!active) return null;

  const dismiss = () => {
    const next = [...dismissed, active.id];
    setDismissed(next);
    localStorage.setItem("dismissed-announcements", JSON.stringify(next));
  };

  return (
    <div className="bg-primary text-primary-foreground text-center text-sm py-2.5 px-4 relative z-50">
      <span>{active.message}</span>
      {active.link_text && active.link_url && (
        <a href={active.link_url} className="ml-2 underline font-semibold hover:opacity-80">
          {active.link_text}
        </a>
      )}
      <button onClick={dismiss} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
