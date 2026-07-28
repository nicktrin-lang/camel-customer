import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  isGuideLang,
  getGuideLangs,
  getGuideCountries,
  guidesByCountry,
  listAllGuides,
  countryName,
  GUIDE_LANG_LABEL,
  PRIMARY_GUIDE_LANG,
} from "@/lib/guides";
import { GuidesHero } from "@/app/components/GuidesText";

export const dynamicParams = true;

export function generateStaticParams() {
  return getGuideLangs().map((lang) => ({ lang }));
}

const SITE = "https://camel-global.com";

function fmtDate(iso: string, lang: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(lang, { year: "numeric", month: "long", day: "numeric" });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isGuideLang(lang)) return {};
  const label = GUIDE_LANG_LABEL[lang];
  const title = `${label} — Camel Global`;
  const description =
    "Guides and articles on meet & greet car hire across our destinations, from Camel Global.";
  // All language variants of the aggregated index consolidate to one canonical.
  const canonical = `${SITE}/${PRIMARY_GUIDE_LANG}/guides`;
  return {
    title: { absolute: title },
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function GuidesIndex({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ country?: string }>;
}) {
  const { lang } = await params;
  if (!isGuideLang(lang)) notFound();
  const { country } = await searchParams;

  const countries = getGuideCountries(); // countries that actually have posts
  const selected =
    country && countries.some((c) => c.code === country.toUpperCase())
      ? country.toUpperCase()
      : countries[0]?.code ?? null;
  const posts = selected ? guidesByCountry(selected) : listAllGuides();

  return (
    <div className="w-full">
      {/* Hero — title + subtitle follow the site language switcher */}
      <section className="w-full bg-black px-6 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">
            Camel Global
          </p>
          <GuidesHero />
        </div>
      </section>

      {/* Country sidebar (left) + posts (right) */}
      <section className="w-full bg-white px-6 py-12 sm:py-16">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 md:flex-row md:gap-12">
          {/* Country nav — a link per country that holds posts */}
          <aside className="shrink-0 md:w-56">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-black/40">
              Countries
            </p>
            {countries.length === 0 ? (
              <p className="text-sm font-semibold text-black/50">No guides yet.</p>
            ) : (
              <ul className="flex flex-row flex-wrap gap-2 md:flex-col md:gap-1">
                {countries.map((c) => {
                  const active = c.code === selected;
                  return (
                    <li key={c.code}>
                      <Link
                        href={`/${lang}/guides?country=${c.code}`}
                        className={`flex items-center justify-between gap-3 border px-4 py-2.5 text-sm font-black transition-colors md:border-0 md:border-l-4 md:px-3 ${
                          active
                            ? "border-[#ff7a00] bg-[#ff7a00] text-white md:bg-transparent md:text-black"
                            : "border-black/15 text-black/70 hover:bg-black/5 md:border-transparent md:hover:border-black/20"
                        }`}
                      >
                        <span>{countryName(c.code)}</span>
                        <span className={active ? "text-white md:text-[#ff7a00]" : "text-black/30"}>{c.count}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* Post list for the selected country */}
          <div className="flex-1">
            {posts.length === 0 ? (
              <p className="text-lg font-semibold text-black/60">No guides yet — check back soon.</p>
            ) : (
              <ul className="divide-y divide-black/10">
                {posts.map((g) => (
                  <li key={`${g.lang}/${g.slug}`} className="py-7 first:pt-0">
                    <Link href={`/${g.lang}/guides/${g.slug}`} className="group block">
                      {g.date && (
                        <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#ff7a00]">
                          {fmtDate(g.date, g.lang)}
                        </p>
                      )}
                      <h2 className="text-2xl font-black leading-snug text-black transition-colors group-hover:text-[#ff7a00] md:text-3xl">
                        {g.title}
                      </h2>
                      {g.description && (
                        <p className="mt-2 max-w-2xl text-base font-medium leading-relaxed text-black/60">
                          {g.description}
                        </p>
                      )}
                      <span className="mt-3 inline-block text-sm font-black uppercase tracking-widest text-black transition-colors group-hover:text-[#ff7a00]">
                        Read guide →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
