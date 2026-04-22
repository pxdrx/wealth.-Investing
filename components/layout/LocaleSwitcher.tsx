"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { locales, defaultLocale, type Locale } from "@/i18n";

interface LocaleSwitcherProps {
  className?: string;
  compact?: boolean;
}

const LOCALE_LABELS: Record<Locale, string> = {
  pt: "PT",
  en: "EN",
};

/**
 * Detects the current locale from the pathname. Works even when next-intl
 * routing is in "as-needed" mode (default locale has no prefix) but a stale
 * /pt URL was produced — we still treat any known locale prefix as current.
 */
function resolveCurrentLocale(pathname: string | null): Locale {
  if (!pathname) return defaultLocale;
  for (const loc of locales) {
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
      return loc;
    }
  }
  return defaultLocale;
}

/**
 * Strip any known locale prefix (pt or en) from the pathname — even the
 * default locale. Without this, a URL like /pt/app/dashboard would produce
 * /en/pt/app/dashboard when toggling to EN.
 */
function stripLocalePrefix(pathname: string): string {
  for (const loc of locales) {
    if (pathname === `/${loc}`) return "/";
    if (pathname.startsWith(`/${loc}/`)) {
      return pathname.slice(loc.length + 1); // keeps leading "/"
    }
  }
  return pathname;
}

export function LocaleSwitcher({ className, compact = false }: LocaleSwitcherProps) {
  const pathname = usePathname() ?? "/";
  const [isPending, startTransition] = useTransition();
  const current = resolveCurrentLocale(pathname);

  const handleSwitch = (next: Locale) => {
    if (next === current) return;
    const canonical = stripLocalePrefix(pathname);
    const normalized = canonical.startsWith("/") ? canonical : `/${canonical}`;
    const target =
      next === defaultLocale
        ? normalized || "/"
        : normalized === "/"
        ? `/${next}`
        : `/${next}${normalized}`;

    // Preserve query string + hash so deep-linked anchors/search don't vanish
    // on toggle. Search params live on window.location, not on pathname.
    const search = typeof window !== "undefined" ? window.location.search : "";
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const href = `${target}${search}${hash}`;

    startTransition(() => {
      // Persist choice in cookie so server layouts (including /app/**, which
      // the i18n middleware does not cover) can pick up the right locale on
      // the next navigation.
      if (typeof document !== "undefined") {
        document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;samesite=lax`;
      }
      // Full navigation sidesteps next-intl router memory that can re-prepend
      // the locale prefix.
      if (typeof window !== "undefined") {
        window.location.assign(href);
      }
    });
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/30 p-0.5",
        compact ? "text-[10px]" : "text-xs",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {locales.map((loc) => {
        const isActive = loc === current;
        return (
          <button
            key={loc}
            type="button"
            aria-pressed={isActive}
            disabled={isPending}
            onClick={() => handleSwitch(loc)}
            className={cn(
              "rounded-full px-2.5 py-1 font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              isPending && "opacity-60",
            )}
            style={
              isActive
                ? { backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }
                : undefined
            }
          >
            {LOCALE_LABELS[loc]}
          </button>
        );
      })}
    </div>
  );
}
