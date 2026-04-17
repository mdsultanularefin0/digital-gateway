import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  className?: string;
  compact?: boolean;
}

export function LanguageToggle({ className = "", compact = false }: Props) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`inline-flex items-center rounded-full border border-border bg-background/60 p-0.5 text-xs font-semibold ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`rounded-full px-2.5 py-1 transition-colors ${
          lang === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("bn")}
        aria-pressed={lang === "bn"}
        className={`rounded-full px-2.5 py-1 transition-colors ${
          lang === "bn"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {compact ? "বাং" : "বাংলা"}
      </button>
    </div>
  );
}
