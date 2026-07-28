"use client";

import Link from "next/link";
import { useLanguage, type Locale } from "@/lib/i18n/LanguageContext";

// Guides CHROME text — follows the site language switcher (the post title and
// body stay in the language they were written). Client components so switching
// the language updates them without a reload.

const TITLE: Record<Locale, string> = {
  en: "Guides", es: "Guías", fr: "Guides", it: "Guide", pt: "Guias", de: "Ratgeber",
};

const SUBTITLE: Record<Locale, string> = {
  en: "Practical guides to meet & greet car hire.",
  es: "Guías prácticas de alquiler de coches meet & greet.",
  fr: "Guides pratiques sur la location de voiture meet & greet.",
  it: "Guide pratiche sul noleggio auto meet & greet.",
  pt: "Guias práticos de aluguer de carros meet & greet.",
  de: "Praktische Ratgeber zur Meet-and-Greet-Autovermietung.",
};

export function GuidesHero() {
  const { locale } = useLanguage();
  return (
    <>
      <h1 className="mb-4 text-4xl font-black leading-tight text-white md:text-6xl">
        {TITLE[locale]}
      </h1>
      <p className="max-w-2xl text-lg font-semibold leading-relaxed text-white md:text-xl">
        {SUBTITLE[locale]}
      </p>
    </>
  );
}

const CTA_EYEBROW: Record<Locale, string> = {
  en: "Ready to skip the queue?",
  es: "¿Listo para saltarte la cola?",
  fr: "Prêt à éviter la file d'attente ?",
  it: "Pronto a saltare la fila?",
  pt: "Pronto para evitar a fila?",
  de: "Bereit, die Warteschlange zu überspringen?",
};
const CTA_HEADING: Record<Locale, string> = {
  en: "Book meet & greet car hire",
  es: "Reserva tu alquiler meet & greet",
  fr: "Réservez votre location meet & greet",
  it: "Prenota il noleggio meet & greet",
  pt: "Reserve o seu aluguer meet & greet",
  de: "Meet-and-Greet-Autovermietung buchen",
};
const CTA_BTN: Record<Locale, string> = {
  en: "Book Now", es: "Reservar ahora", fr: "Réserver", it: "Prenota ora", pt: "Reservar agora", de: "Jetzt buchen",
};

// Booking CTA — the customer funnel is the homepage booking form.
export function GuidesCta() {
  const { locale } = useLanguage();
  return (
    <div className="bg-black px-8 py-10 text-center">
      <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">
        {CTA_EYEBROW[locale]}
      </p>
      <h2 className="mb-6 text-2xl font-black text-white md:text-3xl">{CTA_HEADING[locale]}</h2>
      <Link
        href="/"
        className="inline-block w-full max-w-md bg-[#ff7a00] px-8 py-6 text-xl font-black uppercase tracking-wide text-white transition-opacity hover:opacity-90 sm:w-auto sm:px-16"
      >
        {CTA_BTN[locale]}
      </Link>
    </div>
  );
}
