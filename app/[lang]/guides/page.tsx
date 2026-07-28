import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  isGuideLang,
  listGuides,
  getGuideLangs,
  GUIDE_LANG_LABEL,
  type GuideLang,
} from "@/lib/guides";

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
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${SITE}/${lang}/guides` },
    openGraph: { title, description, url: `${SITE}/${lang}/guides`, type: "website" },
  };
}

export default async function GuidesIndex({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isGuideLang(lang)) notFound();
  const guides = listGuides(lang);
  const label = GUIDE_LANG_LABEL[lang as GuideLang];

  return (
    <div className="w-full">
      {/* Hero — matches the branded content pages (black + orange) */}
      <section className="w-full bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">
            Camel Global
          </p>
          <h1 className="mb-6 text-4xl font-black leading-tight text-white md:text-6xl">
            {label}
          </h1>
          <p className="max-w-2xl text-xl font-semibold leading-relaxed text-white">
            Practical guides to meet &amp; greet car hire — skip the queues, drive away in minutes.
          </p>
        </div>
      </section>

      {/* Post list */}
      <section className="w-full bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl">
          {guides.length === 0 ? (
            <p className="text-lg font-semibold text-black/60">
              No guides yet — check back soon.
            </p>
          ) : (
            <ul className="divide-y divide-black/10">
              {guides.map((g) => (
                <li key={g.slug} className="py-8 first:pt-0">
                  <Link href={`/${lang}/guides/${g.slug}`} className="group block">
                    {g.date && (
                      <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#ff7a00]">
                        {fmtDate(g.date, lang)}
                      </p>
                    )}
                    <h2 className="text-2xl font-black leading-snug text-black group-hover:text-[#ff7a00] transition-colors md:text-3xl">
                      {g.title}
                    </h2>
                    {g.description && (
                      <p className="mt-2 max-w-2xl text-base font-medium leading-relaxed text-black/60">
                        {g.description}
                      </p>
                    )}
                    <span className="mt-3 inline-block text-sm font-black uppercase tracking-widest text-black group-hover:text-[#ff7a00] transition-colors">
                      Read guide →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
