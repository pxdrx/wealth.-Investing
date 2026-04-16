"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSubscription } from "@/components/context/SubscriptionContext";
import {
  ProOnboardingModal,
  hasSeenProOnboarding,
  markProOnboardingSeen,
} from "@/components/billing/ProOnboardingModal";

/**
 * Fallback guard that shows the Pro/Ultra onboarding modal if the user
 * has a paid plan but hasn't seen the onboarding yet (e.g., they missed
 * the /app/subscription/success page).
 *
 * Rendered inside AppShell, within SubscriptionProvider.
 */
export function ProOnboardingGuard() {
  const { plan, isLoading } = useSubscription();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  const resolvedPlan: "pro" | "ultra" =
    plan === "ultra" ? "ultra" : "pro";

  useEffect(() => {
    if (isLoading) return;
    if (plan !== "pro" && plan !== "ultra") return;
    if (!pathname?.startsWith("/app")) return;
    // Don't show on the success page — that has its own trigger
    if (pathname === "/app/subscription/success") return;
    if (hasSeenProOnboarding(resolvedPlan)) return;

    // Delay to avoid competing with the platform tour
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, [plan, isLoading, pathname, resolvedPlan]);

  if (!show) return null;

  return (
    <ProOnboardingModal
      open={show}
      plan={resolvedPlan}
      onClose={() => {
        markProOnboardingSeen(resolvedPlan);
        setShow(false);
      }}
    />
  );
}
