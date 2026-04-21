import type { MetadataRoute } from "next";
import { routing } from "@/i18n";
import { MOCK_POSTS } from "@/lib/blog-mock";

type Entry = { path: string; changeFrequency: "weekly" | "monthly"; priority: number };

// Routes that live under [locale] and therefore emit hreflang alternates.
// Home is "" (rendered at "/" in PT and "/en" in EN).
const LOCALE_ROUTES: Entry[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/manifesto", changeFrequency: "monthly", priority: 0.6 },
  { path: "/features", changeFrequency: "monthly", priority: 0.7 },
  { path: "/features/journal", changeFrequency: "monthly", priority: 0.7 },
  { path: "/features/dexter", changeFrequency: "monthly", priority: 0.7 },
  { path: "/features/macro", changeFrequency: "monthly", priority: 0.7 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.6 },
];

// Routes that exist outside [locale] (PT-only, no hreflang).
const ROOT_ROUTES: Entry[] = [
  { path: "/login", changeFrequency: "monthly", priority: 0.8 },
];

function localizedUrl(baseUrl: string, locale: string, path: string): string {
  if (locale === routing.defaultLocale) return `${baseUrl}${path || "/"}`;
  return `${baseUrl}/${locale}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://owealthinvesting.com";
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  const buildAlternates = (path: string) => {
    const languages: Record<string, string> = {};
    for (const l of routing.locales) languages[l] = localizedUrl(baseUrl, l, path);
    languages["x-default"] = localizedUrl(baseUrl, routing.defaultLocale, path);
    return languages;
  };

  // Static locale routes — one entry per locale, each with alternates.
  for (const route of LOCALE_ROUTES) {
    for (const locale of routing.locales) {
      entries.push({
        url: localizedUrl(baseUrl, locale, route.path),
        lastModified: now,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: { languages: buildAlternates(route.path) },
      });
    }
  }

  // Blog posts — each locale has its own set of slugs (mock data for now).
  for (const locale of routing.locales) {
    const posts = MOCK_POSTS[locale as keyof typeof MOCK_POSTS] ?? [];
    for (const post of posts) {
      entries.push({
        url: localizedUrl(baseUrl, locale, `/blog/${post.slug}`),
        lastModified: new Date(post.publishedAt),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
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
