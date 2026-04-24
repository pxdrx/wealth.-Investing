"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { locales, defaultLocale, type Locale } from "@/i18n";
import { isLandingRoute } from "@/lib/i18n/landing-routes";
import { updateMyPreferredLocale } from "@/lib/profile";

interface LocaleSwitcherProps {
  className?: string;
  compact?: boolean;
}

const LOCALE_LABELS: Record<Locale, string> = { pt: "PT", en: "EN" };

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

function resolveCurrentLocale(pathname: string | null, cookie: string | undefined): Locale {
  if (pathname) {
    for (const loc of locales) {
      if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) return loc;
    }
  }
  if (cookie && (locales as readonly string[]).includes(cookie)) return cookie as Locale;
  return defaultLocale;
}

function stripLocalePrefix(pathname: string): string {
  for (const loc of locales) {
    if (pathname === `/${loc}`) return "/";
    if (pathname.startsWith(`/${loc}/`)) return pathname.slice(loc.length + 1);
  }
  return pathname;
}

export function LocaleSwitcher({ className, compact = false }: LocaleSwitcherProps) {
  const pathname = usePathname() ?? "/";
  const [isPending, startTransition] = useTransition();
  const current = resolveCurrentLocale(pathname, readCookie("NEXT_LOCALE"));

  const handleSwitch = (next: Locale) => {
    if (next === current) return;

    if (typeof document !== "undefined") {
      document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;samesite=lax`;
    }

    // Persist to profile in the background. Fire-and-forget: navigation must
    // never block on network. updateMyPreferredLocale already swallows errors
    // (including the column-missing case during migration rollouts).
    void updateMyPreferredLocale(next);

    startTransition(() => {
      if (isLandingRoute(pathname)) {
        // URL-prefix mode: flip /en ↔ /.
        const canonical = stripLocalePrefix(pathname);
        const normalized = canonical.startsWith("/") ? canonical : `/${canonical}`;
        const target =
          next === defaultLocale
            ? normalized || "/"
            : normalized === "/"
            ? "/en"
            : `/en${normalized}`;
        const search = typeof window !== "undefined" ? window.location.search : "";
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        if (typeof window !== "undefined") {
          window.location.assign(`${target}${search}${hash}`);
        }
      } else {
        // Cookie-only mode (/app/**, auth flows, etc.): reload same URL.
        // Server layout reads cookie and picks messages.
        if (typeof window !== "undefined") {
          window.location.reload();
        }
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
