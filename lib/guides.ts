import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

// ── Guides content engine ─────────────────────────────────────────────────────
// Content is delivered by the external Growth Engine as one Markdown file per post at
//   content/guides/<market>/<slug>.md
// This module is the ONLY place that reads it. Presentation lives in the route
// components. New files (including any in sub-folders) are picked up automatically.
//
// THE AXIS IS MARKET, NOT LANGUAGE. A market is one folder = one URL segment = one
// country, and LANGUAGE IS AN ATTRIBUTE OF A MARKET rather than the axis itself. That
// distinction is the whole point: /gb/guides and /au/guides are both written in English
// but target different countries, and folding them together would put Adelaide and
// Benidorm on one hub competing for the same English queries. A UK reader searching for
// car hire in Spain and an Australian searching in Sydney are different markets even
// though they share a language.
//
// The folder name IS the lowercased ISO country code, so the market and its country never
// drift apart.

export const GUIDE_MARKETS = [
  "gb", "ie", "us", "ca", "au", "nz", "nl", "es", "fr", "it", "pt", "de",
] as const;
export type GuideMarket = (typeof GUIDE_MARKETS)[number];

/** The six languages the site writes in. Separate from GuideMarket on purpose — several
 *  markets share `en`. Used for labels, date formatting and hreflang, never for routing. */
export const GUIDE_LANGS = ["en", "es", "fr", "it", "pt", "de"] as const;
export type GuideLang = (typeof GUIDE_LANGS)[number];

/** The language each market's guides are written in. */
export const MARKET_LANG: Record<GuideMarket, GuideLang> = {
  gb: "en", ie: "en", us: "en", ca: "en", au: "en", nz: "en", nl: "en",
  es: "es", fr: "fr", it: "it", pt: "pt", de: "de",
};

/** The market whose hub is linked when nothing more specific applies. */
export const PRIMARY_GUIDE_MARKET: GuideMarket = "gb";

export function isGuideMarket(v: string | undefined | null): v is GuideMarket {
  return !!v && (GUIDE_MARKETS as readonly string[]).includes(v);
}

/** ISO country for a market — the folder name is the country, lowercased. */
export function marketCountry(market: GuideMarket): string {
  return market.toUpperCase();
}

/** BCP-47 tag for hreflang: language + region, e.g. en-GB, en-AU, es-ES. Language alone
 *  would be wrong here, since en-GB and en-AU are distinct markets. */
export function marketHrefLang(market: GuideMarket): string {
  return `${MARKET_LANG[market]}-${market.toUpperCase()}`;
}

export type GuideFrontmatter = {
  title: string;
  description: string;
  slug: string;
  language: string;
  country: string;
  type: string; // article | location | guide
  date: string; // ISO 8601
  canonical: string;
  /** JSON-LD schema string from the publishing tool, emitted in a hidden <script>. */
  jsonld?: string;
};

/** List item — frontmatter + slug, WITHOUT the (potentially large) body.
 *  `headline` is the article's own H1 (first `# ` line of the body); the guide list and
 *  the post page both display it, while the concise frontmatter `title` stays on the
 *  <title> tag / SERP. */
export type GuideMeta = GuideFrontmatter & { slug: string; headline?: string };

/** Full post — meta plus the rendered HTML body. */
export type Guide = GuideMeta & { html: string; bodyMarkdown: string };

const CONTENT_ROOT = path.join(process.cwd(), "content", "guides");

function marketDir(market: string): string {
  return path.join(CONTENT_ROOT, market);
}

/** All Markdown files under `dir`, RECURSIVELY (absolute paths). Safe if missing. */
function walkMarkdown(dir: string): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMarkdown(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

function coerceMeta(data: Record<string, unknown>, fallbackSlug: string): GuideMeta {
  return {
    title: String(data.title ?? "Guide"),
    description: String(data.description ?? ""),
    slug: String(data.slug ?? fallbackSlug),
    language: String(data.language ?? ""),
    country: String(data.country ?? ""),
    type: String(data.type ?? "article"),
    date: String(data.date ?? ""),
    canonical: String(data.canonical ?? ""),
    ...(data.jsonld ? { jsonld: String(data.jsonld) } : {}),
  };
}

function baseSlug(file: string): string {
  return path.basename(file).replace(/\.md$/i, "");
}

/** The article's headline: the first `# ` heading in the Markdown body (light inline
 *  syntax stripped). Null if there's no leading H1. */
function firstMarkdownH1(md: string): string | null {
  const m = md.match(/^\s*#\s+(.+?)\s*$/m);
  if (!m) return null;
  const text = m[1]
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [text](url) -> text
    .replace(/[*_`]/g, "")
    .trim();
  return text || null;
}

/** Markets that actually have at least one post on disk. */
export function getGuideMarketCodes(): GuideMarket[] {
  return GUIDE_MARKETS.filter((m) => walkMarkdown(marketDir(m)).length > 0);
}

/** All posts for a market, newest first by `date`. Meta only (no body). */
export function listGuides(market: string): GuideMeta[] {
  if (!isGuideMarket(market)) return [];
  const metas = walkMarkdown(marketDir(market)).map((file) => {
    const raw = fs.readFileSync(file, "utf8");
    const { data, content } = matter(raw);
    const meta = coerceMeta(data, baseSlug(file));
    const headline = firstMarkdownH1(content);
    return headline ? { ...meta, headline } : meta;
  });
  // De-dupe by slug (last wins) so a stray duplicate can't render twice.
  const bySlug = new Map<string, GuideMeta>();
  for (const m of metas) bySlug.set(m.slug, m);
  return [...bySlug.values()].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

/** One post by market + slug, with its Markdown body rendered to HTML. */
export function getGuide(market: string, slug: string): Guide | null {
  if (!isGuideMarket(market)) return null;
  // Match by the frontmatter slug (authoritative) OR the filename stem.
  for (const file of walkMarkdown(marketDir(market))) {
    const raw = fs.readFileSync(file, "utf8");
    const { data, content } = matter(raw);
    const meta = coerceMeta(data, baseSlug(file));
    if (meta.slug === slug || baseSlug(file) === slug) {
      const html = marked.parse(content, { async: false }) as string;
      const headline = firstMarkdownH1(content) ?? undefined;
      return { ...meta, headline, html, bodyMarkdown: content };
    }
  }
  return null;
}

/** Every (market, slug) pair — for generateStaticParams and the sitemap. */
export function getAllGuideParams(): { market: GuideMarket; slug: string }[] {
  const out: { market: GuideMarket; slug: string }[] = [];
  for (const market of GUIDE_MARKETS) {
    for (const meta of listGuides(market)) out.push({ market, slug: meta.slug });
  }
  return out;
}

/** A market that has posts, with everything the nav and metadata need. */
export type GuideMarketInfo = {
  market: GuideMarket;
  lang: GuideLang;
  country: string;
  count: number;
};

/** Every market with posts, largest first. */
export function getGuideMarkets(): GuideMarketInfo[] {
  return getGuideMarketCodes()
    .map((market) => ({
      market,
      lang: MARKET_LANG[market],
      country: marketCountry(market),
      count: listGuides(market).length,
    }))
    .sort((a, b) => b.count - a.count);
}

/** The market that owns a country's guides — drives the legacy ?country= redirect. */
export function marketForCountry(country: string): GuideMarket | null {
  const code = (country || "").toLowerCase();
  return isGuideMarket(code) && listGuides(code).length ? code : null;
}

/** The best market hub to link a visitor to, given the UI language they are browsing in.
 *  Falls back to the primary market — a Spanish-speaking visitor to a site with no Spanish
 *  guides gets the main hub rather than a 404. */
export function marketForLocale(locale: string): GuideMarket {
  const withPosts = getGuideMarketCodes();
  const match = withPosts.find((m) => MARKET_LANG[m] === locale);
  return match ?? (withPosts.includes(PRIMARY_GUIDE_MARKET) ? PRIMARY_GUIDE_MARKET : withPosts[0] ?? PRIMARY_GUIDE_MARKET);
}

/** ISO 3166-1 alpha-2 → display name for the country sidebar. */
export const COUNTRY_NAME: Record<string, string> = {
  ES: "Spain", GB: "United Kingdom", FR: "France", DE: "Germany",
  IT: "Italy", PT: "Portugal", NL: "Netherlands", IE: "Ireland",
  US: "United States", CA: "Canada", AU: "Australia", NZ: "New Zealand",
};
export function countryName(code: string): string {
  return COUNTRY_NAME[(code || "").toUpperCase()] || code;
}

/** A few "related" posts from the same market, excluding the current one. */
export function relatedGuides(market: string, currentSlug: string, limit = 3): GuideMeta[] {
  return listGuides(market)
    .filter((g) => g.slug !== currentSlug)
    .slice(0, limit);
}

/** Human label for a language, used in nav/index headings. */
export const GUIDE_LANG_LABEL: Record<GuideLang, string> = {
  en: "Guides",
  es: "Guías",
  fr: "Guides",
  it: "Guide",
  pt: "Guias",
  de: "Ratgeber",
};

/** Each language's own name — for the language switcher (a French visitor
 *  recognises "Français"). */
export const GUIDE_LANG_NATIVE: Record<GuideLang, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  pt: "Português",
  de: "Deutsch",
};
