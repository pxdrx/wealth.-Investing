// <UltraBadge /> — brand primitive marking an Ultra-tier surface.
//
// Pure visual. No subscription context. Consumers (Tracks B/C) decide WHEN
// to render this; it just paints the mark. For tier-aware gating, compose
// with `components/billing/PaywallGate.tsx`.
//
// See BRAND.md §"Ultra primitives" for anatomy + do/don't.

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { voice } from "@/lib/brand";

const ultraBadgeVariants = cva(
  // base — brutalist: monospace, uppercase, sharp corners, wide tracking
  "inline-flex items-center gap-1 rounded-sm font-mono font-semibold uppercase tracking-wider leading-none select-none align-middle",
  {
    variants: {
      variant: {
        solid:
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
        outline:
          "border border-[hsl(var(--primary))] text-[hsl(var(--primary))] bg-transparent",
        ghost:
          "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]",
      },
      size: {
        sm: "text-[10px] px-1.5 py-0.5",
        md: "text-xs px-2 py-0.5",
        lg: "text-sm px-2.5 py-1",
      },
    },
    defaultVariants: {
      variant: "solid",
      size: "md",
    },
  },
);

const ICON_PX: Record<NonNullable<UltraBadgeProps["size"]>, number> = {
  sm: 10,
  md: 12,
  lg: 14,
};

export interface UltraBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children">,
    VariantProps<typeof ultraBadgeVariants> {
  /** Override the displayed label. Defaults to voice.upgrade.ultraBadge (pt). */
  label?: string;
  /** Leading icon. Defaults to Sparkles. Pass `null` to hide. */
  icon?: LucideIcon | null;
}

export function UltraBadge({
  variant,
  size,
  label,
  icon,
  className,
  ...rest
}: UltraBadgeProps) {
  const resolvedSize = size ?? "md";
  const Icon: LucideIcon | null =
    icon === null ? null : (icon ?? Sparkles);
  const text = label ?? voice.upgrade.ultraBadge.pt;

  return (
    <span
      className={cn(
        ultraBadgeVariants({ variant, size: resolvedSize }),
        className,
      )}
      {...rest}
    >
      {Icon ? (
        <Icon
          width={ICON_PX[resolvedSize]}
          height={ICON_PX[resolvedSize]}
          strokeWidth={2.25}
          aria-hidden
        />
      ) : null}
      {text}
    </span>
  );
}

export { ultraBadgeVariants };
