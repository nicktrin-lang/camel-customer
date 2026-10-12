/**
 * Wire types for the RankMoss "Custom website (direct)" connector.
 *
 * These MIRROR the platform's `WebsitePostPayload` / `WebsitePingPayload`
 * (growth-engine lib/delivery/webhook.ts) and the published contract in
 * growth-engine docs/WEBSITE_CONNECTOR.md. Keep them identical: the receiver and the
 * platform must never drift. If the contract changes, change it there first, then here.
 *
 * Copied verbatim from the RankMoss website starter kit (starter-kits/website/core).
 */

/**
 * One approved post, pushed to the receiver as JSON. A topic in several languages
 * arrives as one POST per language version, each a complete post with its own `id`,
 * `language`, `market`, `path` and `url`.
 *
 * - `action` is always "upsert": re-sending the same `id` REPLACES that post in
 *   place, so retries and re-deliveries never duplicate it.
 * - `html` keeps the title as the leading <h1> (render it directly), and `markdown`
 *   is the same article if you would rather render that.
 * - `jsonld` is the schema.org @graph object. Emit it in the page <head> inside
 *   <script type="application/ld+json">.
 * - `author` is the project byline, or null when none is set.
 */
export type WebsitePostPayload = {
  action: "upsert";
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
  publishedAt: string;
  updatedAt: string;
  author: string | null;
};

/**
 * A non-destructive connectivity check, sent by the "Send test ping" button before
 * any real post is delivered. The receiver verifies the signature exactly as for a
 * real delivery and replies 2xx, but publishes NOTHING for a ping.
 */
export type WebsitePingPayload = {
  action: "ping";
  sentAt: string;
};

/** Either shape the receiver may be handed on the wire. */
export type WebsiteDelivery = WebsitePostPayload | WebsitePingPayload;
