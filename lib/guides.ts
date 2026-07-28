import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

// ── Guides content engine ─────────────────────────────────────────────────────
// Content is delivered by the external Growth Engine as one Markdown file per
// post, split by language, at:  content/guides/<lang>/<slug>.md
// This module is the ONLY place that reads that content. Presentation lives in
// the route components. New files (including any in sub-folders) are picked up
// automatically — no code change per post.

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
  };
}

function baseSlug(file: string): string {
  return path.basename(file).replace(/\.md$/i, "");
}

/** Languages that actually have at least one post on disk. */
export function getGuideLangs(): GuideLang[] {
  return GUIDE_LANGS.filter((l) => walkMarkdown(langDir(l)).length > 0);
}

/** All posts for a language, newest first by `date`. Meta only (no body). */
export function listGuides(lang: string): GuideMeta[] {
  if (!isGuideLang(lang)) return [];
  const metas = walkMarkdown(langDir(lang)).map((file) => {
    const raw = fs.readFileSync(file, "utf8");
    const { data } = matter(raw);
    return coerceMeta(data, baseSlug(file));
  });
  // De-dupe by slug (last wins) so a stray duplicate can't render twice.
  const bySlug = new Map<string, GuideMeta>();
  for (const m of metas) bySlug.set(m.slug, m);
  return [...bySlug.values()].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

/** One post by language + slug, with its Markdown body rendered to HTML. */
export function getGuide(lang: string, slug: string): Guide | null {
  if (!isGuideLang(lang)) return null;
  // Match by the frontmatter slug (authoritative) OR the filename stem.
  for (const file of walkMarkdown(langDir(lang))) {
    const raw = fs.readFileSync(file, "utf8");
    const { data, content } = matter(raw);
    const meta = coerceMeta(data, baseSlug(file));
    if (meta.slug === slug || baseSlug(file) === slug) {
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
