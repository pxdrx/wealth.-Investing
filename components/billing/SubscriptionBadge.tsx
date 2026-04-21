"use client";

import { useEntitlements } from "@/hooks/use-entitlements";
import { cn } from "@/lib/utils";

const PLAN_STYLES = {
  free: "bg-zinc-500/10 text-zinc-500",
  pro: "bg-blue-500/10 text-blue-500",
  ultra: "bg-purple-500/10 text-purple-500",
  mentor: "bg-amber-500/10 text-amber-600",
} as const;

const PLAN_LABELS = {
  free: "Free",
  pro: "Pro",
  ultra: "Ultra",
  mentor: "Mentor",
} as const;

export function SubscriptionBadge({ className }: { className?: string }) {
  const { plan, isLoading } = useEntitlements();

  if (isLoading) {
    return (
      <span className={cn("rounded-full px-2.5 py-0.5 h-5 w-10 bg-muted animate-pulse inline-block", className)} />
    );
  }

  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", PLAN_STYLES[plan], className)}>
      {PLAN_LABELS[plan]}
    </span>
  );
}
