// [C-15] Resolves the active locale for the app.* namespace.
// Reads next-intl when the provider is present, falls back to "pt" otherwise.
"use client";

import { useLocale } from "next-intl";
import { tApp, type AppLocale, type AppMessageKey } from "@/lib/i18n/app";

function coerceLocale(raw: string | undefined): AppLocale {
  if (raw === "en") return "en";
  return "pt";
}

export function useAppT(): (key: AppMessageKey) => string {
  let locale: AppLocale = "pt";
  try {
    locale = coerceLocale(useLocale());
  } catch {
    // No next-intl provider mounted on this subtree — fall back to PT.
  }
  return (key) => tApp(locale, key);
}
