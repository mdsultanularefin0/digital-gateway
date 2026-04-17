import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { translate, type Lang, type StringKey } from "@/lib/i18n";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey) => string;
  /** Bilingual helper: pick EN or BN at the call-site */
  tx: (en: string, bn?: string | null) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function detectInitial(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("lang");
  if (stored === "en" || stored === "bn") return stored;
  const nav = navigator.language?.toLowerCase() || "";
  if (nav.startsWith("bn")) return "bn";
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    setLangState(detectInitial());
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem("lang", next);
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.lang = next === "bn" ? "bn" : "en";
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "bn" ? "bn" : "en";
    }
  }, [lang]);

  const t = useCallback((key: StringKey) => translate(key, lang), [lang]);
  const tx = useCallback(
    (en: string, bn?: string | null) => (lang === "bn" && bn && bn.trim() ? bn : en),
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tx }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
