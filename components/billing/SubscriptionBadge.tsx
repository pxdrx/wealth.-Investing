"use client";

import { useSubscription } from "@/components/context/SubscriptionContext";
import { cn } from "@/lib/utils";

const PLAN_STYLES = {
  free: "bg-zinc-500/10 text-zinc-500",
  pro: "bg-blue-500/10 text-blue-500",
  elite: "bg-amber-500/10 text-amber-500",
} as const;

const PLAN_LABELS = {
  free: "Free",
  pro: "Pro",
  elite: "Elite",
} as const;

export function SubscriptionBadge({ className }: { className?: string }) {
  const { plan, isLoading } = useSubscription();

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
