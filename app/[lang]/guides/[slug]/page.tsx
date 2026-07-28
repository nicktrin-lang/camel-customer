import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuide, relatedGuides, getAllGuideParams, isGuideLang } from "@/lib/guides";

export const dynamicParams = true;

export function generateStaticParams() {
  return getAllGuideParams();
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
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const guide = getGuide(lang, slug);
  if (!guide) return {};
  const canonical = guide.canonical || `${SITE}/${lang}/guides/${slug}`;
  return {
    // Frontmatter title already includes the brand — use absolute so the root
    // layout's "| Camel Global" template doesn't double it up.
    title: { absolute: guide.title },
    description: guide.description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: canonical,
      type: "article",
      locale: lang,
    },
  };
}

export default async function GuidePost({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isGuideLang(lang)) notFound();
  const guide = getGuide(lang, slug);
  if (!guide) notFound();
  const related = relatedGuides(lang, slug, 3);

  return (
    <article className="w-full">
      {/* Header band */}
      <header className="w-full bg-black px-6 pt-16 pb-12 text-white">
        <div className="mx-auto max-w-3xl">
          <Link
            href={`/${lang}/guides`}
            className="mb-6 inline-block text-xs font-black uppercase tracking-widest text-[#ff7a00] hover:underline"
          >
            ← Camel Global Guides
          </Link>
          {guide.date && (
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-white/50">
              {fmtDate(guide.date, lang)}
            </p>
          )}
          {/* The H1 is inside the Markdown body; this is the eyebrow/title band */}
          <h1 className="text-3xl font-black leading-tight text-white md:text-5xl">
            {guide.title}
          </h1>
        </div>
      </header>

      {/* Body — Markdown rendered as-is, styled via .guide-body */}
      <div className="w-full bg-white px-6 py-14">
        <div
          className="guide-body mx-auto max-w-3xl"
          dangerouslySetInnerHTML={{ __html: stripLeadingH1(guide.html, guide.title) }}
        />

        {/* Booking CTA — the customer funnel is booking */}
        <div className="mx-auto mt-14 max-w-3xl border-t border-black/10 pt-10">
          <div className="bg-black px-8 py-10 text-center">
            <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">
              Ready to skip the queue?
            </p>
            <h2 className="mb-6 text-2xl font-black text-white md:text-3xl">
              Book meet &amp; greet car hire
            </h2>
            <Link
              href="/book"
              className="inline-block w-full max-w-md bg-[#ff7a00] px-8 py-6 text-xl font-black uppercase tracking-wide text-white transition-opacity hover:opacity-90 sm:w-auto sm:px-16"
            >
              Book Now
            </Link>
          </div>
        </div>

        {/* Related guides — same language only */}
        {related.length > 0 && (
          <div className="mx-auto mt-14 max-w-3xl">
            <h2 className="mb-6 text-xs font-black uppercase tracking-widest text-black/40">
              More guides
            </h2>
            <ul className="divide-y divide-black/10">
              {related.map((r) => (
                <li key={r.slug} className="py-4">
                  <Link
                    href={`/${lang}/guides/${r.slug}`}
                    className="group flex items-baseline justify-between gap-4"
                  >
                    <span className="text-lg font-black text-black group-hover:text-[#ff7a00] transition-colors">
                      {r.title}
                    </span>
                    <span className="shrink-0 text-sm font-black text-[#ff7a00]">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

// The Markdown body already opens with an H1 that includes the brand name. We
// render our own styled title band above, so drop the body's first H1 to avoid
// a duplicate on the page (keeps a single H1 for SEO).
function stripLeadingH1(html: string, _title: string): string {
  return html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>/i, "");
}
