import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  isGuideLang,
  getGuideLangs,
  getGuideCountriesForLang,
  guidesByCountryForLang,
  listGuides,
  countryName,
  GUIDE_LANG_LABEL,
  guideIndexAlternates,
} from "@/lib/guides";
import { GuidesHero } from "@/app/components/GuidesText";
import GuidePostList from "@/app/components/GuidePostList";

export const dynamicParams = true;

export function generateStaticParams() {
  return getGuideLangs().map((lang) => ({ lang }));
}

const SITE = "https://www.camel-global.com";

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
  // Each language index is its own canonical URL, cross-linked by hreflang.
  const canonical = `${SITE}/${lang}/guides`;
  return {
    title: { absolute: title },
    description,
    robots: { index: true, follow: true },
    alternates: { canonical, languages: guideIndexAlternates() },
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

  const countries = getGuideCountriesForLang(lang); // countries with posts in THIS language
  const selected =
    country && countries.some((c) => c.code === country.toUpperCase())
      ? country.toUpperCase()
      : countries[0]?.code ?? null;
  const posts = selected ? guidesByCountryForLang(lang, selected) : listGuides(lang);

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
        <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:gap-12">
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

          {/* Post list for the selected country — paginated with "Show more" */}
          <div className="min-w-0 flex-1">
            {posts.length === 0 ? (
              <p className="text-lg font-semibold text-black/60">No guides yet — check back soon.</p>
            ) : (
              <GuidePostList
                posts={posts.map((g) => ({
                  href: `/${lang}/guides/${g.slug}`,
                  title: g.title,
                  description: g.description,
                  dateLabel: g.date ? fmtDate(g.date, lang) : undefined,
                }))}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
