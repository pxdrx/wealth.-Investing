"use client";

import { usePathname, useRouter } from "next/navigation";
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
 * Detects the current locale from the pathname. next-intl's routing keeps
 * the default locale (pt) with no prefix, so anything that does not start
 * with "/en" is treated as pt.
 */
function resolveCurrentLocale(pathname: string | null): Locale {
  if (!pathname) return defaultLocale;
  for (const loc of locales) {
    if (loc === defaultLocale) continue;
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
      return loc;
    }
  }
  return defaultLocale;
}

/**
 * Strips any existing locale prefix from the pathname, leaving the
 * canonical path the switcher can re-prefix with a new locale.
 */
function stripLocalePrefix(pathname: string): string {
  for (const loc of locales) {
    if (loc === defaultLocale) continue;
    if (pathname === `/${loc}`) return "/";
    if (pathname.startsWith(`/${loc}/`)) return pathname.slice(loc.length + 1);
  }
  return pathname;
}

export function LocaleSwitcher({ className, compact = false }: LocaleSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [isPending, startTransition] = useTransition();
  const current = resolveCurrentLocale(pathname);

  const handleSwitch = (next: Locale) => {
    if (next === current) return;
    const canonical = stripLocalePrefix(pathname);
    const target =
      next === defaultLocale
        ? canonical || "/"
        : `/${next}${canonical === "/" ? "" : canonical}`;
    startTransition(() => {
      router.push(target);
      router.refresh();
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
