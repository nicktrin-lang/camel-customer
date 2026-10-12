import { parseDelivery, PayloadError } from "./parse";
import type { PostStore } from "./store";
import { verifySignature } from "./verify";

/**
 * The single orchestrator a transport (Next.js route, Express handler, edge function,
 * ...) calls. It verifies the signature over the RAW body, validates the payload,
 * branches on `action`, and returns a status + JSON body to send back verbatim.
 *
 * Status mapping matches growth-engine docs/WEBSITE_CONNECTOR.md, so RankMoss
 * classifies failures correctly:
 *   - 200  -> ping acknowledged, or post upserted (body `{ url }`)
 *   - 401  -> bad or missing signature   (permanent: RankMoss surfaces, does not retry)
 *   - 400  -> malformed payload          (permanent)
 *   - 503  -> store threw                (transient: RankMoss retries automatically)
 *
 * Copied verbatim from the RankMoss website starter kit (starter-kits/website/core).
 */

export type HandleResult = {
  status: number;
  /** Send this back as the JSON response body. */
  json: Record<string, unknown>;
};

export type HandleDeliveryArgs = {
  /** The exact bytes received, before any parsing. Sign/verify over THIS. */
  rawBody: string;
  /** The `X-RankMoss-Signature` header value. */
  signature: string | null | undefined;
  /** The project signing secret (from RankMoss Connections). */
  secret: string;
  /** Where posts are stored. */
  store: PostStore;
};

export async function handleDelivery(args: HandleDeliveryArgs): Promise<HandleResult> {
  const { rawBody, signature, secret, store } = args;

  // 1. Verify the signature over the raw body FIRST - reject before trusting anything.
  if (!verifySignature(rawBody, signature, secret)) {
    return { status: 401, json: { error: "invalid signature" } };
  }

  // 2. Parse and validate. A malformed body is a permanent rejection.
  let delivery;
  try {
    delivery = parseDelivery(rawBody);
  } catch (e) {
    if (e instanceof PayloadError) return { status: 400, json: { error: e.message } };
    throw e;
  }

  // 3. A ping is a no-op acknowledgement - verified, but nothing is published.
  if (delivery.action === "ping") {
    return { status: 200, json: { ok: true } };
  }

  // 4. A real post: upsert by id. A store failure is transient, so RankMoss retries.
  try {
    const stored = await store.upsertPost(delivery);
    return { status: 200, json: { url: stored.url } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "store write failed";
    return { status: 503, json: { error: message } };
  }
}
