"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useEntitlements } from "@/hooks/use-entitlements";
import { useOnboardingState } from "@/lib/onboarding/use-onboarding-state";
import { TIER_RANK, type TierName } from "@/lib/onboarding/types";
import { TierOnboardingModal } from "./TierOnboardingModal";

const PAID_TIERS: Array<Exclude<TierName, "free">> = ["pro", "ultra", "mentor"];

function planToTier(plan: string | null | undefined): TierName {
  if (plan === "ultra") return "ultra";
  if (plan === "mentor") return "mentor";
  if (plan === "pro" || plan === "elite") return "pro";
  return "free";
}

/**
 * Detects upgrades and dispatches `TierOnboardingModal` in sequence for any
 * tiers that were skipped between `state.maxTierSeen` and the current plan.
 *
 * Rendered inside AppShell (within SubscriptionProvider). Skips on the
 * `/app/subscription/success` page, which runs its own onboarding flow.
 */
export function TierOnboardingGuard() {
  const { plan, isLoading: planLoading } = useEntitlements();
  const { state, isLoading: stateLoading, markTierSeen } = useOnboardingState();
  const pathname = usePathname();
  const [queue, setQueue] = useState<Array<Exclude<TierName, "free">>>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const lastProcessedRankRef = useRef(-1);

  useEffect(() => {
    if (planLoading || stateLoading || !state) return;
    if (!pathname?.startsWith("/app")) return;
    if (pathname === "/app/subscription/success") return;

    const currentTier = planToTier(plan);
    const seenTier = state.maxTierSeen;
    const currentRank = TIER_RANK[currentTier];
    const seenRank = TIER_RANK[seenTier];

    // Skip re-dispatch while modal for this tier is already open.
    if (lastProcessedRankRef.current === currentRank && open) return;

    if (currentRank <= seenRank) {
      lastProcessedRankRef.current = currentRank;
      return;
    }

    const tiersToShow = PAID_TIERS.filter(
      (t) => TIER_RANK[t] > seenRank && TIER_RANK[t] <= currentRank,
    );
    if (tiersToShow.length === 0) {
      lastProcessedRankRef.current = currentRank;
      return;
    }

    lastProcessedRankRef.current = currentRank;
    setQueue(tiersToShow);
    setActiveIdx(0);
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [plan, state, planLoading, stateLoading, pathname, open]);

  if (queue.length === 0 || !open) return null;

  const activeTier = queue[activeIdx];

  return (
    <TierOnboardingModal
      key={activeTier}
      open={open}
      tier={activeTier}
      onClose={async () => {
        await markTierSeen(activeTier);
        if (activeIdx + 1 < queue.length) {
          setActiveIdx((i) => i + 1);
          setOpen(false);
          setTimeout(() => setOpen(true), 200);
        } else {
          setOpen(false);
          setQueue([]);
        }
      }}
    />
  );
}
