import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  isGuideMarket,
  getGuideMarketCodes,
  listGuides,
  getGuideMarkets,
  marketForCountry,
  marketCountry,
  marketHrefLang,
  countryName,
  MARKET_LANG,
  PRIMARY_GUIDE_MARKET,
} from "@/lib/guides";
import { GuidesHero } from "@/app/components/GuidesText";
import GuidePostList from "@/app/components/GuidePostList";

export const dynamicParams = true;

export function generateStaticParams() {
  return getGuideMarketCodes().map((market) => ({ market }));
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
  params: Promise<{ market: string }>;
}): Promise<Metadata> {
  const { market } = await params;
  if (!isGuideMarket(market)) return {};
  if (!getGuideMarkets().some((m) => m.market === market)) return {};
  const where = countryName(marketCountry(market));
  // The market is in the title because it is the ONLY thing distinguishing these hubs:
  // /gb/guides and /au/guides are both English, so a shared "Guides — Camel Global" would
  // put two indexable pages under one title.
  const title = `Car Hire Guides for ${where} — Camel Global`;
  const description = `Meet & greet car hire guides for travellers from ${where}: how Camel Global delivers your car to the airport, with no desk and no queue.`;
  // Self-canonical: each market hub is the one indexable URL for its own posts. It used to
  // point every variant at a single primary hub which — combined with the country filter
  // defaulting to countries[0] (Australia, alphabetically) — meant the whole section
  // canonicalised into a page showing 2 Australian guides while the other 49 sat on
  // ?country=GB and were never indexed on their own.
  const canonical = `${SITE}/${market}/guides`;
  return {
    title: { absolute: title },
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website", locale: MARKET_LANG[market] },
  };
}

export default async function GuidesIndex({
  params,
  searchParams,
}: {
  params: Promise<{ market: string }>;
  searchParams: Promise<{ country?: string }>;
}) {
  const { market } = await params;
  if (!isGuideMarket(market)) notFound();
  const { country } = await searchParams;

  // Legacy ?country= URLs collapse onto the owning language hub — 308, so the old shape
  // stops competing in the index. Unlike the portal, country is NOT a URL axis here: it is
  // the reader's home market, and English covers both GB and AU.
  if (country) {
    const target = marketForCountry(country) ?? market;
    permanentRedirect(`/${target}/guides`);
  }

  const markets = getGuideMarkets();
  // A language folder with no posts is not a hub — 404 rather than serve an empty,
  // indexable page.
  if (!markets.some((m) => m.market === market)) notFound();
  const posts = listGuides(market);

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
              Markets
            </p>
            {markets.length === 0 ? (
              <p className="text-sm font-semibold text-black/50">No guides yet.</p>
            ) : (
              <ul className="flex flex-row flex-wrap gap-2 md:flex-col md:gap-1">
                {markets.map((c) => {
                  const active = c.market === market;
                  return (
                    <li key={c.market}>
                      <Link
                        href={`/${c.market}/guides`}
                        hrefLang={marketHrefLang(c.market)}
                        className={`flex items-center justify-between gap-3 border px-4 py-2.5 text-sm font-black transition-colors md:border-0 md:border-l-4 md:px-3 ${
                          active
                            ? "border-[#ff7a00] bg-[#ff7a00] text-white md:bg-transparent md:text-black"
                            : "border-black/15 text-black/70 hover:bg-black/5 md:border-transparent md:hover:border-black/20"
                        }`}
                      >
                        <span>{countryName(c.country)}</span>
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
                  href: `/${market}/guides/${g.slug}`,
                  title: g.headline || g.title, // article headline (matches the post page); SEO title stays on <title>
                  description: g.description,
                  dateLabel: g.date ? fmtDate(g.date, MARKET_LANG[market]) : undefined,
                }))}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
