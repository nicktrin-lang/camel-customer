import type { MetadataRoute } from "next";
import { getGuideLangs, listGuides, getAllGuideParams, guidePostAlternates, guideIndexAlternates } from "@/lib/guides";

// Static: read guide content at BUILD time and bake the URLs in. A dynamic
// metadata route can't reach content/guides on Vercel (outputFileTracingIncludes
// doesn't apply to it), so it must be generated at build where the markdown is
// present.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  // No sitemap off the production deploy (e.g. the staging domain). Replaces the
  // old request-host check, which forced the route dynamic.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return [];

  const base = "https://www.camel-global.com";
  const now  = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/book`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/cookies`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  // One guides index PER language (each self-canonical), plus every
  // /<lang>/guides/<slug> post - all cross-linked with hreflang alternates.
  const idxAlternates = guideIndexAlternates();
  const guideIndexes: MetadataRoute.Sitemap = getGuideLangs().map((lang) => ({
    url: `${base}/${lang}/guides`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
    alternates: { languages: idxAlternates },
  }));
  const guidePosts: MetadataRoute.Sitemap = getAllGuideParams().map(({ lang, slug }) => {
    const meta = listGuides(lang).find((g) => g.slug === slug);
    const lastModified = meta?.date ? new Date(meta.date) : now;
    return {
      url: `${base}/${lang}/guides/${slug}`,
      lastModified: isNaN(lastModified.getTime()) ? now : lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: { languages: guidePostAlternates(slug) },
    };
  });

  return [...core, ...guideIndexes, ...guidePosts];
}
