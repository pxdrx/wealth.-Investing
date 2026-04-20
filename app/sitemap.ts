import type { MetadataRoute } from "next";
import { routing } from "@/i18n";

type Entry = { path: string; changeFrequency: "weekly" | "monthly"; priority: number };

// Public routes. The home ("") gets hreflang alternates because it lives under
// [locale]; other routes are PT-only for now and migrate to [locale] in B-12.
const LOCALE_ROUTES: Entry[] = [{ path: "", changeFrequency: "weekly", priority: 1 }];

const ROOT_ROUTES: Entry[] = [
  { path: "/login", changeFrequency: "monthly", priority: 0.8 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/manifesto", changeFrequency: "monthly", priority: 0.5 },
  { path: "/features/journal", changeFrequency: "monthly", priority: 0.7 },
  { path: "/features/macro", changeFrequency: "monthly", priority: 0.7 },
  { path: "/features/analytics", changeFrequency: "monthly", priority: 0.7 },
  { path: "/features/risk", changeFrequency: "monthly", priority: 0.7 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.6 },
  { path: "/changelog", changeFrequency: "weekly", priority: 0.4 },
  { path: "/academy", changeFrequency: "monthly", priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://owealthinvesting.com";
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of LOCALE_ROUTES) {
    const languages: Record<string, string> = {};
    for (const l of routing.locales) {
      languages[l] =
        l === routing.defaultLocale
          ? `${baseUrl}${route.path || "/"}`
          : `${baseUrl}/${l}${route.path}`;
    }
    languages["x-default"] = `${baseUrl}${route.path || "/"}`;

    entries.push({
      url: `${baseUrl}${route.path || "/"}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: { languages },
    });
  }

  for (const route of ROOT_ROUTES) {
    entries.push({
      url: `${baseUrl}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    });
  }

  return entries;
}
