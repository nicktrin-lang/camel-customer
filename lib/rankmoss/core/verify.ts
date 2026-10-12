import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signature verification for RankMoss direct-push deliveries.
 *
 * The platform sends `X-RankMoss-Signature: sha256=<hex>` where <hex> is the
 * HMAC-SHA256 of the RAW request body bytes, keyed with the project signing secret.
 * You MUST recompute it over the exact bytes you received, before any JSON parsing or
 * re-serialising - re-encoding can change the bytes and break the match.
 *
 * Copied verbatim from the RankMoss website starter kit (starter-kits/website/core).
 */

/** The header RankMoss sends the signature in. */
export const SIGNATURE_HEADER = "X-RankMoss-Signature";

/** Recompute the expected signature for a raw body: `sha256=<hex HMAC-SHA256>`. */
export function signBody(secret: string, rawBody: string | Buffer): string {
  return `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
}

/**
 * Verify the signature header against the raw body with a constant-time comparison.
 *
 * Returns false (never throws) for a missing header, a missing secret, a length
 * mismatch, or any digest mismatch. Pass the RAW body you received - the same bytes
 * RankMoss signed - not a parsed-and-re-serialised object.
 */
export function verifySignature(
  rawBody: string | Buffer,
  header: string | null | undefined,
  secret: string,
): boolean {
  if (!header || !secret) return false;
  const expected = signBody(secret, rawBody);
  const received = Buffer.from(header);
  const want = Buffer.from(expected);
  // timingSafeEqual throws on differing lengths, so gate on length first. The length
  // of `expected` is fixed, so this leaks nothing useful.
  if (received.length !== want.length) return false;
  return timingSafeEqual(received, want);
}
