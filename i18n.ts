// Track B i18n config. Provides routing, locale types and the next-intl
// request config. C-session fix: previous stub exported only `locales` +
// default, which broke app/[locale]/layout.tsx and middleware.ts.
import { defineRouting } from "next-intl/routing";
import { getRequestConfig } from "next-intl/server";

export const locales = ["pt", "en"] as const;
export const defaultLocale = "pt" as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
});

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = locales.includes(requested as Locale) ? (requested as Locale) : defaultLocale;
  const messages = (await import(`./messages/${locale}.json`)).default;
  const fallbackMessages =
    locale === defaultLocale
      ? messages
      : (await import(`./messages/${defaultLocale}.json`)).default;
  return {
    locale,
    messages,
    onError(error) {
      if (error.code === "MISSING_MESSAGE") {
        console.warn(`[i18n] missing ${locale} key — falling back to ${defaultLocale}`, error.message);
        return;
      }
      throw error;
    },
    getMessageFallback({ namespace, key }) {
      const path = namespace ? `${namespace}.${key}` : key;
      const parts = path.split(".");
      let cursor: unknown = fallbackMessages;
      for (const part of parts) {
        if (cursor && typeof cursor === "object" && part in (cursor as Record<string, unknown>)) {
          cursor = (cursor as Record<string, unknown>)[part];
        } else {
          return path;
        }
      }
      return typeof cursor === "string" ? cursor : path;
    },
  };
});
