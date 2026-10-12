import { revalidatePath } from "next/cache";
import { handleDelivery } from "@/lib/rankmoss/core/receiver";
import { SIGNATURE_HEADER } from "@/lib/rankmoss/core/verify";
import { directGuidesStore } from "@/lib/rankmoss/supabaseStore";

/**
 * RankMoss "Custom website (direct)" receiver.
 *
 * RankMoss POSTs each approved guide here as signed JSON (no GitHub PR, no rebuild).
 * This endpoint verifies the HMAC-SHA256 signature over the RAW body, upserts the post
 * into Supabase (lib/rankmoss/supabaseStore.ts) keyed on its id, and replies 200 { url }.
 * A test ping verifies and replies 200 without publishing. The /<market>/guides/<slug>
 * route then renders it (filesystem first, this store as the fallback) at the same URL
 * the GitHub path produced.
 *
 * Receiver URL (set this as the endpoint in RankMoss Connections):
 *   https://www.camel-global.com/api/rankmoss
 *
 * Env: RANKMOSS_SIGNING_SECRET (the secret RankMoss shows once on connect). The store
 * also uses the existing NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * node:crypto needs the Node.js runtime; the body must not be cached or rewritten.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  // Read the RAW body text. The signature is verified over these exact bytes, so do NOT
  // parse-and-re-serialise before verifying.
  const rawBody = await req.text();
  const signature = req.headers.get(SIGNATURE_HEADER);
  const secret = process.env.RANKMOSS_SIGNING_SECRET ?? "";

  const result = await handleDelivery({ rawBody, signature, secret, store: directGuidesStore });

  // On a successful upsert, drop the cached render for the post path and its market hub
  // so a freshly delivered (or re-delivered) post is live on the next request. The body
  // is already verified at this point; we only read it to find the paths to revalidate.
  if (result.status === 200 && "url" in result.json) {
    try {
      const body = JSON.parse(rawBody) as { action?: string; path?: string; market?: string };
      if (body.action === "upsert" && body.path) {
        revalidatePath(body.path);
        if (body.market) revalidatePath(`/${body.market}/guides`);
      }
    } catch {
      // Revalidation is best-effort; the delivery already succeeded.
    }
  }

  return Response.json(result.json, { status: result.status });
}
