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
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
