-- ============================================================================
-- RankMoss "Custom website (direct)" connector - direct-push guides store
-- Additive and non-destructive. Run in the Supabase SQL editor. Idempotent.
--
-- Holds guides that RankMoss pushes straight to the site (POST /api/rankmoss) instead
-- of the GitHub-PR/rebuild path. Each approved post is one row, keyed on the RankMoss
-- post `id` (the upsert key - re-delivering the same id REPLACES the row, never
-- duplicates). The /<market>/guides/<slug> route reads this table as a fallback after
-- the filesystem (legacy GitHub-delivered Markdown), so a direct post renders at the
-- exact same URL the GitHub path produced.
--
-- Written and read only by server code using the service-role key
-- (lib/rankmoss/supabaseStore.ts). RLS is enabled with NO public/anon policy: the
-- service role bypasses RLS, and nothing else may touch the table.
--
-- TABLE ISOLATION: camel-customer SHARES this Supabase project with camel-portal, and
-- BOTH sites have a 'gb' market. This table is named `rankmoss_direct_guides_customer`
-- (NOT the portal's `rankmoss_direct_guides`) so the two sites' direct-push content can
-- never cross-contaminate on a (market, slug) lookup or a per-market listing.
-- ============================================================================

CREATE TABLE IF NOT EXISTS rankmoss_direct_guides_customer (
  id             text PRIMARY KEY,                 -- RankMoss post id (the upsert key)
  slug           text NOT NULL,                    -- URL slug, matches [slug] route param
  market         text NOT NULL,                    -- lowercase ISO country, matches [market] route param
  language       text NOT NULL DEFAULT '',         -- post language (en/es/fr/it/pt/de)
  country        text NOT NULL DEFAULT '',         -- ISO country (uppercase) from the payload
  title          text NOT NULL DEFAULT '',         -- SEO title (the <title> tag)
  description    text NOT NULL DEFAULT '',          -- meta description
  path           text NOT NULL,                    -- live path, e.g. /gb/guides/<slug>
  url            text NOT NULL,                    -- full canonical URL
  html           text NOT NULL DEFAULT '',         -- rendered article HTML (title is the leading <h1>)
  markdown       text NOT NULL DEFAULT '',         -- same article as Markdown
  jsonld         jsonb NOT NULL DEFAULT '{}'::jsonb,-- schema.org @graph, emitted in <head>
  author         text,                             -- byline or null
  published_at   timestamptz,                      -- publish timestamp from the payload
  updated_at     timestamptz,                      -- last-updated timestamp from the payload
  first_seen_at  timestamptz NOT NULL DEFAULT now(),-- first delivery of this id (stable public date)
  received_at    timestamptz NOT NULL DEFAULT now()-- row insert/update time (server clock)
);

-- Render lookup is by (market, slug); listing a hub is by market.
CREATE INDEX IF NOT EXISTS rankmoss_direct_guides_customer_market_slug_idx
  ON rankmoss_direct_guides_customer (market, slug);
CREATE INDEX IF NOT EXISTS rankmoss_direct_guides_customer_market_idx
  ON rankmoss_direct_guides_customer (market);
CREATE INDEX IF NOT EXISTS rankmoss_direct_guides_customer_path_idx
  ON rankmoss_direct_guides_customer (path);

-- Server-only table: enable RLS and grant NO policy. The service-role client bypasses
-- RLS; the anon/public roles get nothing, so the table is never exposed to the browser.
ALTER TABLE rankmoss_direct_guides_customer ENABLE ROW LEVEL SECURITY;
