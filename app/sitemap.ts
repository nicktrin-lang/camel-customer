import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getGuideLangs, listGuides, getAllGuideParams, PRIMARY_GUIDE_LANG } from "@/lib/guides";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headerStore = await headers();
  const host = headerStore.get("host") || "";
  if (host.includes("test.camel-global.com")) return [];
  const base = "https://camel-global.com";
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

  // ONE canonical guides index (all language variants consolidate to it), plus
  // every /<lang>/guides/<slug> post.
  const guideIndexes: MetadataRoute.Sitemap =
    getGuideLangs().length > 0
      ? [{
          url: `${base}/${PRIMARY_GUIDE_LANG}/guides`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.7,
        }]
      : [];
  const guidePosts: MetadataRoute.Sitemap = getAllGuideParams().map(({ lang, slug }) => {
    const meta = listGuides(lang).find((g) => g.slug === slug);
    const lastModified = meta?.date ? new Date(meta.date) : now;
    return {
      url: `${base}/${lang}/guides/${slug}`,
      lastModified: isNaN(lastModified.getTime()) ? now : lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    };
  });

  return [...core, ...guideIndexes, ...guidePosts];
}
