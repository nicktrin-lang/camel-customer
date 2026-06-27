"use client";

import { useLanguage } from "./LanguageContext";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import it from "./locales/it.json";
import pt from "./locales/pt.json";
import de from "./locales/de.json";

const translations: Record<string, Record<string, string>> = { en, es, fr, it, pt, de };

export function useTranslation() {
  const { locale } = useLanguage();

  function t(key: string, vars?: Record<string, string | number>): string {
    const dict = translations[locale] ?? translations["en"];
    const fallback = translations["en"];

    let str: string = (dict[key] ?? fallback[key] ?? key);

    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replaceAll(`{{${k}}}`, String(v));
      });
    }

    return str;
  }

  return { t, locale };
}
