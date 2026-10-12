import "server-only";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type { PostSelector, PostStore, StoredPost } from "./core/store";
import type { WebsitePostPayload } from "./core/types";

/**
 * Supabase-backed PostStore for RankMoss "Custom website (direct)" deliveries.
 *
 * This is camel-customer's real content layer for direct-pushed guides (the starter kit
 * ships a JSON-on-disk demo store instead). It exists because the GitHub-PR path baked
 * Markdown into the build, whereas a direct push arrives at runtime - and Vercel's
 * filesystem is read-only/ephemeral, so a delivered post must land in a store that
 * survives across serverless invocations and is readable by the render path on demand.
 *
 * Writes use the service-role client (bypasses RLS). The table is server-read only; no
 * public/anon policy is granted (see RANKMOSS_DIRECT_GUIDES_SCHEMA.sql).
 *
 * TABLE ISOLATION: camel-customer SHARES the same Supabase project as camel-portal, and
 * BOTH sites have a 'gb' market. The customer site therefore uses its OWN table
 * (`rankmoss_direct_guides_customer`), separate from the portal's `rankmoss_direct_guides`,
 * so a (market, slug) lookup or a listByMarket('gb') never crosses the two sites' content.
 *
 * Posts are keyed by `id` (the upsert key). (`market`, `slug`) is the render lookup key
 * and matches the /<market>/guides/<slug> route params, so a direct post renders at the
 * exact same URL the GitHub path produced.
 */

export const DIRECT_GUIDES_TABLE = "rankmoss_direct_guides_customer";

/** DB row shape (snake_case columns) for the direct-guides table. */
type GuideRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  language: string;
  country: string;
  market: string;
  path: string;
  url: string;
  html: string;
  markdown: string;
  jsonld: Record<string, unknown>;
  author: string | null;
  published_at: string;
  updated_at: string;
  first_seen_at: string;
};

function rowToStored(row: GuideRow): StoredPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    language: row.language,
    country: row.country,
    market: row.market,
    path: row.path,
    url: row.url,
    html: row.html,
    markdown: row.markdown,
    jsonld: row.jsonld ?? {},
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    author: row.author,
    firstSeenAt: row.first_seen_at,
  };
}

export class SupabasePostStore implements PostStore {
  async upsertPost(post: WebsitePostPayload): Promise<StoredPost> {
    const db = createServiceRoleSupabaseClient();

    // Preserve the first-seen date across re-deliveries so the public publish date is
    // stable even when a post is refreshed with the same id.
    const { data: existing, error: readErr } = await db
      .from(DIRECT_GUIDES_TABLE)
      .select("first_seen_at")
      .eq("id", post.id)
      .maybeSingle();
    if (readErr) throw new Error(`direct-guides read failed: ${readErr.message}`);

    const firstSeenAt = existing?.first_seen_at ?? post.publishedAt;

    const row: GuideRow = {
      id: post.id,
      slug: post.slug,
      title: post.title,
      description: post.description,
      language: post.language,
      country: post.country,
      market: post.market,
      path: post.path,
      url: post.url,
      html: post.html,
      markdown: post.markdown,
      jsonld: post.jsonld,
      author: post.author,
      published_at: post.publishedAt,
      updated_at: post.updatedAt,
      first_seen_at: firstSeenAt,
    };

    const { data, error } = await db
      .from(DIRECT_GUIDES_TABLE)
      .upsert(row, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw new Error(`direct-guides upsert failed: ${error.message}`);
    return rowToStored(data as GuideRow);
  }

  async getPost(selector: PostSelector): Promise<StoredPost | null> {
    const db = createServiceRoleSupabaseClient();
    let query = db.from(DIRECT_GUIDES_TABLE).select("*");

    if ("id" in selector) {
      query = query.eq("id", selector.id);
    } else if ("path" in selector) {
      query = query.eq("path", selector.path);
    } else {
      query = query.eq("slug", selector.slug);
      if (selector.market !== undefined) query = query.eq("market", selector.market);
    }

    // Newest-updated wins if more than one row somehow matches a non-id selector.
    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`direct-guides lookup failed: ${error.message}`);
    return data ? rowToStored(data as GuideRow) : null;
  }

  /**
   * All direct-pushed posts for a market, newest-updated first. Used by the guides hub
   * to list direct posts alongside the legacy filesystem ones. Not part of the PostStore
   * contract (the receiver never needs it) - a camel-customer render convenience.
   */
  async listByMarket(market: string): Promise<StoredPost[]> {
    const db = createServiceRoleSupabaseClient();
    const { data, error } = await db
      .from(DIRECT_GUIDES_TABLE)
      .select("*")
      .eq("market", market)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(`direct-guides list failed: ${error.message}`);
    return (data as GuideRow[] | null)?.map(rowToStored) ?? [];
  }
}

/** Shared instance - the receiver route and the render adapters use the same store. */
export const directGuidesStore = new SupabasePostStore();
