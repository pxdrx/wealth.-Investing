// <UltraLock active /> — brand primitive overlay for locked Ultra-tier content.
//
// Pure visual. No subscription context. Parent decides when to lock.
// When `active` is false, renders children untouched (zero overhead).
// When `active` is true, renders children blurred + a brutalist lock overlay
// with an UltraBadge and optional CTA.
//
// For tier-aware gating with subscription lookups, see
// `components/billing/PaywallGate.tsx`. That one can compose this primitive
// in future refactors.

"use client";

import * as React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { voice } from "@/lib/brand";
import { UltraBadge } from "./UltraBadge";

const BLUR_CLASS = {
  sm: "blur-[2px]",
  md: "blur-[4px]",
  lg: "blur-[8px]",
} as const;

const BACKDROP_CLASS = {
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
} as const;

export interface UltraLockCta {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface UltraLockProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** When true, renders overlay on top of children; when false, children pass through. */
  active: boolean;
  /** Gated content. */
  children: React.ReactNode;
  /** Short label inside overlay. Defaults to voice.upgrade.ultraLocked (pt). */
  label?: string;
  /** Supporting copy under the label. Defaults to voice.upgrade.ultraLockedHint (pt). */
  hint?: string;
  /** Optional CTA. Link when `href`, button when `onClick`. Omit for no button. */
  cta?: UltraLockCta;
  /** Blur intensity. Default "md". */
  blur?: keyof typeof BLUR_CLASS;
}

export function UltraLock({
  active,
  children,
  label,
  hint,
  cta,
  blur = "md",
  className,
  ...rest
}: UltraLockProps) {
  if (!active) {
    // Fast path: no overlay DOM at all.
    return <>{children}</>;
  }

  const resolvedLabel = label ?? voice.upgrade.ultraLocked.pt;
  const resolvedHint = hint ?? voice.upgrade.ultraLockedHint.pt;

  return (
    <div className={cn("relative isolate", className)} {...rest}>
      <div
        aria-hidden
        // @ts-expect-error -- `inert` is valid HTML; React 19 types include it, 18 doesn't.
        inert=""
        className={cn(
          "pointer-events-none select-none",
          BLUR_CLASS[blur],
        )}
      >
        {children}
      </div>

      <div
        role="status"
        aria-live="polite"
        aria-label={`${resolvedLabel} — ${resolvedHint}`}
        className={cn(
          "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3",
          "rounded-sm border border-dashed border-[hsl(var(--primary)/0.4)]",
          "bg-[hsl(var(--background)/0.55)]",
          BACKDROP_CLASS[blur],
          "px-6 text-center",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200",
        )}
      >
        <UltraBadge size="sm" variant="outline" />

        <Lock
          width={28}
          height={28}
          strokeWidth={1.75}
          className="text-[hsl(var(--primary))]"
          aria-hidden
        />

        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-xs uppercase tracking-wider text-[hsl(var(--foreground))]">
            {resolvedLabel}
          </span>
          {resolvedHint ? (
            <span className="max-w-[28ch] text-xs text-[hsl(var(--muted-foreground))]">
              {resolvedHint}
            </span>
          ) : null}
        </div>

        {cta ? <UltraLockCtaButton cta={cta} /> : null}
      </div>
    </div>
  );
}

function UltraLockCtaButton({ cta }: { cta: UltraLockCta }) {
  const className = cn(
    "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5",
    "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
    "font-mono text-xs font-semibold uppercase tracking-wider",
    "transition-opacity hover:opacity-90",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2",
  );

  if (cta.href) {
    return (
      <Link href={cta.href} className={className}>
        {cta.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={cta.onClick} className={className}>
      {cta.label}
    </button>
  );
}
