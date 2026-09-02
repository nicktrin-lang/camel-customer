import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuide, relatedGuides, getAllGuideParams, isGuideLang } from "@/lib/guides";
import GuideCountryNav from "@/app/components/GuideCountryNav";
import { GuidesCta } from "@/app/components/GuidesText";

export const dynamicParams = true;

export function generateStaticParams() {
  return getAllGuideParams();
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
  // The body's own H1 is the full on-page headline; show THAT in the header band.
  // The concise SEO `title` (frontmatter) stays on the <title> tag / Google via
  // generateMetadata. Falls back to `title` if a post has no body H1.
  const { heading, rest } = extractLeadingH1(guide.html);
  const displayTitle = heading || guide.title;

  return (
    <article className="w-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: displayTitle,
            description: guide.description,
            inLanguage: lang,
            datePublished: guide.date || undefined,
            dateModified: guide.date || undefined,
            mainEntityOfPage: guide.canonical || `${SITE}/${lang}/guides/${slug}`,
            author: { "@type": "Organization", name: "Camel Global", url: SITE },
            publisher: {
              "@type": "Organization",
              name: "Camel Global",
              logo: { "@type": "ImageObject", url: `${SITE}/camel-logo.png` },
            },
          }),
        }}
      />
      {/* Header band */}
      <header className="w-full bg-black px-6 pt-16 pb-12 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:gap-12">
          {/* Spacer matches the country nav below so the title lines up with the body */}
          <div className="hidden shrink-0 md:block md:w-56" aria-hidden />
          <div className="min-w-0 flex-1">
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
            {/* The article's full headline (the body's H1), shown as the page H1.
                The concise SEO title lives on the <title> tag / SERP instead. */}
            <h1 className="text-3xl font-black leading-tight text-white md:text-5xl">
              {displayTitle}
            </h1>
          </div>
        </div>
      </header>

      {/* Body — country sidebar (left) + article (right) */}
      <div className="w-full bg-white px-6 py-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:gap-12">
          <GuideCountryNav lang={lang} selected={guide.country} />
          <div className="min-w-0 flex-1">
        {guide.jsonld ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: guide.jsonld }} />
        ) : null}
        <div
          className="guide-body"
          dangerouslySetInnerHTML={{ __html: rest }}
        />

        {/* Booking CTA — chrome text follows the site language switcher */}
        <div className="mt-14 border-t border-black/10 pt-10">
          <GuidesCta />
        </div>

        {/* Related guides — same language only */}
        {related.length > 0 && (
          <div className="mt-14">
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
        </div>
      </div>
    </article>
  );
}

// The Markdown body opens with an H1 (the article's full headline). We render that
// headline in the styled title band above and drop it from the body, so the page has
// a single H1 = the full headline. Returns the heading text (tags stripped) + the body
// without it; heading is null if the post has no leading H1.
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&"); // last, so a real "&amp;" isn't double-decoded
}

function extractLeadingH1(html: string): { heading: string | null; rest: string } {
  const m = html.match(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return { heading: null, rest: html };
  // Strip tags, then decode entities: the heading goes into a React text node, which
  // re-escapes, so a raw "&#39;" would otherwise render as literal text.
  const heading = decodeEntities(m[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim() || null;
  return { heading, rest: html.slice(m[0].length) };
}
