import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  isGuideLang,
  getGuideLangs,
  listGuides,
  getGuideMarkets,
  langForCountry,
  GUIDE_LANG_LABEL,
  GUIDE_LANG_NATIVE,
  PRIMARY_GUIDE_LANG,
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
  if (!getGuideMarkets().some((m) => m.lang === lang)) return {};
  const label = GUIDE_LANG_LABEL[lang];
  // Disambiguate the non-primary hubs: GUIDE_LANG_LABEL is "Guides" for BOTH en and fr,
  // and two indexable pages must not share a title.
  const title =
    lang === PRIMARY_GUIDE_LANG
      ? `${label} — Camel Global`
      : `${label} (${GUIDE_LANG_NATIVE[lang]}) — Camel Global`;
  const description =
    "Guides and articles on meet & greet car hire across our destinations, from Camel Global.";
  // Self-canonical: each language hub is the one indexable URL for its own posts. It used
  // to point every variant at the primary lang, which — combined with the country filter
  // below defaulting to countries[0] — meant the whole section canonicalised into a page
  // showing 2 Australian guides while the other 49 sat on ?country=GB.
  const canonical = `${SITE}/${lang}/guides`;
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

  // Legacy ?country= URLs collapse onto the owning language hub — 308, so the old shape
  // stops competing in the index. Unlike the portal, country is NOT a URL axis here: it is
  // the reader's home market, and English covers both GB and AU.
  if (country) {
    const target = langForCountry(country) ?? lang;
    permanentRedirect(`/${target}/guides`);
  }

  const markets = getGuideMarkets();
  // A language folder with no posts is not a hub — 404 rather than serve an empty,
  // indexable page.
  if (!markets.some((m) => m.lang === lang)) notFound();
  const posts = listGuides(lang);

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
          {/* Language nav — a link per hub. Country is deliberately NOT the axis here: it
              records the reader's home market, and English spans GB and AU. */}
          <aside className="shrink-0 md:w-56">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-black/40">
              Languages
            </p>
            {markets.length === 0 ? (
              <p className="text-sm font-semibold text-black/50">No guides yet.</p>
            ) : (
              <ul className="flex flex-row flex-wrap gap-2 md:flex-col md:gap-1">
                {markets.map((c) => {
                  const active = c.lang === lang;
                  return (
                    <li key={c.lang}>
                      <Link
                        href={`/${c.lang}/guides`}
                        hrefLang={c.lang}
                        className={`flex items-center justify-between gap-3 border px-4 py-2.5 text-sm font-black transition-colors md:border-0 md:border-l-4 md:px-3 ${
                          active
                            ? "border-[#ff7a00] bg-[#ff7a00] text-white md:bg-transparent md:text-black"
                            : "border-black/15 text-black/70 hover:bg-black/5 md:border-transparent md:hover:border-black/20"
                        }`}
                      >
                        <span>{GUIDE_LANG_NATIVE[c.lang]}</span>
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
                  // Every post on this hub is in this hub's language, so the extract
                  // cards link inside /<lang>/ — card and article share one path.
                  href: `/${lang}/guides/${g.slug}`,
                  title: g.headline || g.title, // article headline (matches the post page); SEO title stays on <title>
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
