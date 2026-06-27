"use client";

import { useLanguage, Locale } from "./LanguageContext";

export default function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  const options: { code: Locale; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
    { code: "fr", label: "FR" },
    { code: "it", label: "IT" },
    { code: "pt", label: "PT" },
    { code: "de", label: "DE" },
  ];

  return (
    <div className="flex items-center gap-0 border border-white/20 overflow-hidden">
      {options.map(({ code, label }, i) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={[
            "px-3 py-2 text-xs font-black transition-colors",
            i < options.length - 1 ? "border-r border-white/20" : "",
            locale === code
              ? "bg-[#ff7a00] text-white"
              : "text-white/60 hover:bg-white/10 hover:text-white",
          ].join(" ")}
          aria-label={`Switch to ${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
