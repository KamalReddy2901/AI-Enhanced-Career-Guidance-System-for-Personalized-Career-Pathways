import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { en } from "./en";
import { hi } from "./hi";
import { te } from "./te";
const dictionaries = { en, hi, te };
export type Language = keyof typeof dictionaries;
export type TranslationKey = keyof typeof en;
const localeTags: Record<Language, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};
const LanguageContext = createContext<{
  lang: Language;
  locale: string;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}>({
  lang: "en",
  locale: "en-IN",
  setLang: () => undefined,
  t: (key) => en[key],
});
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem("cc_guidance_lang");
    return saved === "hi" || saved === "te"
      ? saved
      : navigator.language.startsWith("hi")
        ? "hi"
        : navigator.language.startsWith("te")
          ? "te"
          : "en";
  });
  const setLang = (next: Language) => {
    setLangState(next);
    localStorage.setItem("cc_guidance_lang", next);
  };
  const value = useMemo(
    () => ({
      lang,
      locale: localeTags[lang],
      setLang,
      t: (key: TranslationKey) => dictionaries[lang][key] ?? en[key],
    }),
    [lang],
  );
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useT() {
  return useContext(LanguageContext);
}
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useT();
  return (
    <label className="font-[JetBrains_Mono] text-[10px] uppercase tracking-wide">
      <span className={compact ? "sr-only" : "mr-2"}>Language</span>
      <select
        value={lang}
        onChange={(event) => setLang(event.target.value as Language)}
        className="min-h-11 border border-black/20 bg-[#f9f8f7] px-2"
      >
        <option value="en">English</option>
        <option value="hi">हिन्दी</option>
        <option value="te">తెలుగు</option>
      </select>
    </label>
  );
}
