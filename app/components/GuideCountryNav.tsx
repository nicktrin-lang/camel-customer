import Link from "next/link";
import { getGuideCountries, countryName } from "@/lib/guides";

// Country navigation rail — shown on both the guides index and each post, so a
// reader can jump between countries from anywhere in the section. Server
// component (reads the content filesystem). `selected` highlights the active
// country (the current filter on the index, or the post's own country).
export default function GuideCountryNav({
  lang,
  selected,
}: {
  lang: string;
  selected?: string | null;
}) {
  const countries = getGuideCountries();
  if (countries.length === 0) return null;
  const sel = (selected || "").toUpperCase();

  return (
    <aside className="shrink-0 md:w-56">
      <p className="mb-3 text-xs font-black uppercase tracking-widest text-black/40">Countries</p>
      <ul className="flex flex-row flex-wrap gap-2 md:flex-col md:gap-1">
        {countries.map((c) => {
          const active = c.code === sel;
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
    </aside>
  );
}
