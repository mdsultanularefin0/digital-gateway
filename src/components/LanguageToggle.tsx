import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === "en" ? "bn" : "en")}
      className="flex h-10 items-center justify-center rounded-[4px] px-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors uppercase tracking-wide"
      aria-label="Toggle language"
    >
      {lang === "en" ? "বাং" : "EN"}
    </button>
  );
}
