import type { WebsiteDelivery, WebsitePingPayload, WebsitePostPayload } from "./types";

/**
 * Parse and validate a delivery body AFTER its signature has been verified.
 *
 * Throws PayloadError on anything malformed (bad JSON, unknown action, missing or
 * wrong-typed fields). The receiver maps that to a 400 - a permanent rejection that
 * RankMoss surfaces to the account owner rather than retrying in a loop.
 *
 * Copied verbatim from the RankMoss website starter kit (starter-kits/website/core).
 */
export class PayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayloadError";
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function requireString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  if (typeof v !== "string") throw new PayloadError(`field "${key}" must be a string`);
  return v;
}

/** `author` is a string or null - never absent-with-a-wrong-type. */
function requireNullableString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  if (v === null) return null;
  if (typeof v !== "string") throw new PayloadError(`field "${key}" must be a string or null`);
  return v;
}

/**
 * Parse a raw delivery body into a typed, validated delivery. Branch on the returned
 * `action`: "ping" is a no-op acknowledgement, "upsert" is a real post to store.
 */
export function parseDelivery(rawBody: string): WebsiteDelivery {
  let data: unknown;
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new PayloadError("body is not valid JSON");
  }
  if (!isObject(data)) throw new PayloadError("body must be a JSON object");

  const action = data.action;
  if (action === "ping") {
    const ping: WebsitePingPayload = { action: "ping", sentAt: requireString(data, "sentAt") };
    return ping;
  }
  if (action === "upsert") {
    const post: WebsitePostPayload = {
      action: "upsert",
      id: requireString(data, "id"),
      slug: requireString(data, "slug"),
      title: requireString(data, "title"),
      description: requireString(data, "description"),
      language: requireString(data, "language"),
      country: requireString(data, "country"),
      market: requireString(data, "market"),
      path: requireString(data, "path"),
      url: requireString(data, "url"),
      html: requireString(data, "html"),
      markdown: requireString(data, "markdown"),
      jsonld: (() => {
        if (!isObject(data.jsonld)) throw new PayloadError(`field "jsonld" must be an object`);
        return data.jsonld;
      })(),
      publishedAt: requireString(data, "publishedAt"),
      updatedAt: requireString(data, "updatedAt"),
      author: requireNullableString(data, "author"),
    };
    if (!post.id) throw new PayloadError(`field "id" must not be empty`);
    return post;
  }
  throw new PayloadError(`unknown action: ${JSON.stringify(action)}`);
}
