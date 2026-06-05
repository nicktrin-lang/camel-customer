"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Locale = "en" | "es";

type LanguageContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
};

const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  setLocale: () => {},
});

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem("camel_locale");
    if (stored === "en" || stored === "es") return stored;
  } catch {}

  try {
    const langs = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];
    for (const lang of langs) {
      const code = lang.toLowerCase();
      if (code.startsWith("es")) return "es";
      if (code.startsWith("en")) return "en";
    }
  } catch {}

  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  function setLocale(l: Locale) {
    try { localStorage.setItem("camel_locale", l); } catch {}
    setLocaleState(l);
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}