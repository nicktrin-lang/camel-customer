import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

// ── Guides content engine ─────────────────────────────────────────────────────
// Content is delivered by the external Growth Engine as one Markdown file per
// post, split by language, at:  content/guides/<lang>/<slug>.md
// This module is the ONLY place that reads that content. Presentation lives in
// the route components. New files are picked up automatically at build time — no
// code change per post.

export const GUIDE_LANGS = ["en", "es", "fr", "it", "pt", "de"] as const;
export type GuideLang = (typeof GUIDE_LANGS)[number];

export function isGuideLang(v: string | undefined | null): v is GuideLang {
  return !!v && (GUIDE_LANGS as readonly string[]).includes(v);
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
};

/** List item — frontmatter + slug, WITHOUT the (potentially large) body. */
export type GuideMeta = GuideFrontmatter & { slug: string };

/** Full post — meta plus the rendered HTML body. */
export type Guide = GuideMeta & { html: string; bodyMarkdown: string };

const CONTENT_ROOT = path.join(process.cwd(), "content", "guides");

function langDir(lang: string): string {
  return path.join(CONTENT_ROOT, lang);
}

function safeReadDir(dir: string): string[] {
  try {
    return fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".md"));
  } catch {
    return [];
  }
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
  };
}

/** Languages that actually have at least one post on disk. */
export function getGuideLangs(): GuideLang[] {
  return GUIDE_LANGS.filter((l) => safeReadDir(langDir(l)).length > 0);
}

/** All posts for a language, newest first by `date`. Meta only (no body). */
export function listGuides(lang: string): GuideMeta[] {
  if (!isGuideLang(lang)) return [];
  const dir = langDir(lang);
  const metas = safeReadDir(dir).map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const { data } = matter(raw);
    return coerceMeta(data, file.replace(/\.md$/i, ""));
  });
  return metas.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

/** One post by language + slug, with its Markdown body rendered to HTML. */
export function getGuide(lang: string, slug: string): Guide | null {
  if (!isGuideLang(lang)) return null;
  const dir = langDir(lang);
  // Match by filename OR by the frontmatter slug (Growth Engine sets both).
  for (const file of safeReadDir(dir)) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const { data, content } = matter(raw);
    const meta = coerceMeta(data, file.replace(/\.md$/i, ""));
    if (meta.slug === slug || file.replace(/\.md$/i, "") === slug) {
      const html = marked.parse(content, { async: false }) as string;
      return { ...meta, html, bodyMarkdown: content };
    }
  }
  return null;
}

/** Every (lang, slug) pair — for generateStaticParams and the sitemap. */
export function getAllGuideParams(): { lang: GuideLang; slug: string }[] {
  const out: { lang: GuideLang; slug: string }[] = [];
  for (const lang of GUIDE_LANGS) {
    for (const meta of listGuides(lang)) out.push({ lang, slug: meta.slug });
  }
  return out;
}

/** A few "related" posts in the same language, excluding the current one. */
export function relatedGuides(lang: string, currentSlug: string, limit = 3): GuideMeta[] {
  return listGuides(lang)
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
