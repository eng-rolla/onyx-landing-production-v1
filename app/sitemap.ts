import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site-url";
import { getAllUpdates } from "@/lib/updates";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const updates = await getAllUpdates();

  return [
    {
      url: SITE_URL,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/updates`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...updates.map((update) => ({
      url: `${SITE_URL}/updates/${update.slug}`,
      lastModified: update.date,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
