import "server-only";
import type { Guide, GuideMeta } from "@/lib/guides";
import type { StoredPost } from "@/lib/rankmoss/core/store";
import { directGuidesStore } from "@/lib/rankmoss/supabaseStore";

// ── Direct-push guides adapter ────────────────────────────────────────────────
// Maps a RankMoss direct-pushed post (Supabase, lib/rankmoss/supabaseStore.ts) onto the
// SAME `Guide` / `GuideMeta` shapes the filesystem engine (lib/guides.ts) produces, so
// the existing route components render a direct post with no presentation changes, at
// the same /<market>/guides/<slug> URL the GitHub path produced.
//
// The filesystem path (lib/guides.ts) stays the source of truth for the legacy
// GitHub-delivered posts. These async adapters are consulted ALONGSIDE it (filesystem
// first, DB fallback for a single post; both merged for the hub list), so nothing on the
// existing posts regresses and the whole direct path can be removed by reverting the two
// route call sites plus this file.

/** The article headline: the first `# ` heading of the Markdown body, inline syntax
 *  stripped. Mirrors lib/guides.ts `firstMarkdownH1`. */
function headlineFromMarkdown(md: string): string | undefined {
  const m = md.match(/^\s*#\s+(.+?)\s*$/m);
  if (!m) return undefined;
  const text = m[1]
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
  return text || undefined;
}

/** Serialise the JSON-LD object to the string the route emits inside a
 *  <script type="application/ld+json">. Neutralises "</" so a value cannot close the
 *  script element early. Returns undefined for an empty object (route renders nothing). */
function jsonldString(jsonld: Record<string, unknown>): string | undefined {
  if (!jsonld || Object.keys(jsonld).length === 0) return undefined;
  return JSON.stringify(jsonld).replace(/<\//g, "<\\/");
}

function toMeta(p: StoredPost): GuideMeta {
  const headline = headlineFromMarkdown(p.markdown);
  const meta: GuideMeta = {
    title: p.title,
    description: p.description,
    slug: p.slug,
    language: p.language,
    country: p.country,
    type: "guide",
    // Stable public publish date: when the receiver first saw this id, preserved across
    // re-deliveries. The filesystem engine uses the frontmatter `date` here.
    date: p.firstSeenAt || p.publishedAt || "",
    canonical: p.url,
    ...(jsonldString(p.jsonld) ? { jsonld: jsonldString(p.jsonld) } : {}),
    ...(headline ? { headline } : {}),
  };
  return meta;
}

function toGuide(p: StoredPost): Guide {
  return { ...toMeta(p), html: p.html, bodyMarkdown: p.markdown };
}

/** True once the direct-push store is usable. Before the founder sets the env vars and
 *  runs RANKMOSS_DIRECT_GUIDES_SCHEMA.sql, the render path must behave exactly as today
 *  (filesystem only), including at build time where there is no Supabase env. */
function directStoreConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** One direct-pushed post by market + slug, in the `Guide` shape, or null.
 *  Never throws: a missing env, a missing table, or a transient DB error degrades to
 *  null so the public post page simply falls through to its 404, never a 500. */
export async function getDirectGuide(market: string, slug: string): Promise<Guide | null> {
  if (!directStoreConfigured()) return null;
  try {
    const post = await directGuidesStore.getPost({ slug, market });
    return post ? toGuide(post) : null;
  } catch (e) {
    console.error("[rankmoss] getDirectGuide failed", e);
    return null;
  }
}

/** All direct-pushed posts for a market as `GuideMeta`, newest first.
 *  Never throws (see getDirectGuide): returns [] on any store problem so the hub still
 *  renders its filesystem posts. */
export async function listDirectGuides(market: string): Promise<GuideMeta[]> {
  if (!directStoreConfigured()) return [];
  try {
    const posts = await directGuidesStore.listByMarket(market);
    return posts
      .map(toMeta)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  } catch (e) {
    console.error("[rankmoss] listDirectGuides failed", e);
    return [];
  }
}
