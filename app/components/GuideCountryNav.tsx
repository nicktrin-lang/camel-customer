import Link from "next/link";
import { getGuideMarkets, countryName, marketHrefLang } from "@/lib/guides";

// Market navigation rail — shown on the guides index and on each post, so a reader can
// jump between markets from anywhere in the section. Server component (reads the content
// filesystem). `selected` highlights the active market.
//
// Markets, not languages: /gb/guides and /au/guides are both English but target different
// countries, so the country name is what the reader needs to see.
export default function GuideCountryNav({ selected }: { selected?: string | null }) {
  const markets = getGuideMarkets();
  if (markets.length === 0) return null;
  const sel = (selected || "").toLowerCase();

  return (
    <aside className="shrink-0 md:w-56">
      <p className="mb-3 text-xs font-black uppercase tracking-widest text-black/40">Markets</p>
      <ul className="flex flex-row flex-wrap gap-2 md:flex-col md:gap-1">
        {markets.map((c) => {
          const active = c.market === sel;
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
    </aside>
  );
}
