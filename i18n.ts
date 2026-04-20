// TODO(track-b): wire next-intl into app/ root layout and locale detection.
// This stub reserves the import path. Track B owns integration.
import { getRequestConfig } from "next-intl/server";

export const locales = ["pt", "en"] as const;
export const defaultLocale = "pt" as const;

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}));
