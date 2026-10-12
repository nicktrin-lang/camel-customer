import type { WebsitePostPayload } from "./types";

/**
 * A stored post: the delivered payload minus the wire-only `action`, plus the time
 * the receiver first saw this `id`. `firstSeenAt` keeps a stable publish date across
 * re-deliveries.
 *
 * Copied from the RankMoss website starter kit (starter-kits/website/core).
 */
export type StoredPost = Omit<WebsitePostPayload, "action"> & {
  /** When the receiver first stored this `id` (ISO 8601). Preserved across upserts. */
  firstSeenAt: string;
};

/** How a page route looks a post up. Resolve by the live `path` (most common for
 *  routing), by `id` (the upsert key), or by `slug` within a `market`. */
export type PostSelector =
  | { path: string }
  | { id: string }
  | { slug: string; market?: string };

/**
 * The swap point. camel-customer implements this against Supabase
 * (lib/rankmoss/supabaseStore.ts); the reference kit ships a JSON-on-disk version. The
 * core receiver only ever touches these two methods.
 */
export interface PostStore {
  /**
   * Upsert by `id`: if a post with this `id` exists, replace it in place (keeping it a
   * single record - never a duplicate); otherwise create it. Honours the contract's
   * "same id replaces" rule, so retries and refreshes are safe.
   */
  upsertPost(post: WebsitePostPayload): Promise<StoredPost>;

  /** Fetch one post for rendering, or null if there is none. */
  getPost(selector: PostSelector): Promise<StoredPost | null>;
}
