"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useEntitlements } from "@/hooks/use-entitlements";
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
function resolvePlan(plan: string | null | undefined): "pro" | "ultra" {
  return plan === "ultra" ? "ultra" : "pro";
}

export function ProOnboardingGuard() {
  const { plan, isLoading } = useEntitlements();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [onboardingPlan, setOnboardingPlan] = useState<"pro" | "ultra">("pro");

  useEffect(() => {
    if (isLoading) return;
    if (plan !== "pro" && plan !== "ultra") return;
    if (!pathname?.startsWith("/app")) return;
    if (pathname === "/app/subscription/success") return;
    const resolved = resolvePlan(plan);
    if (hasSeenProOnboarding(resolved)) return;

    setOnboardingPlan(resolved);
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, [plan, isLoading, pathname]);

  if (!show) return null;

  return (
    <ProOnboardingModal
      open={show}
      plan={onboardingPlan}
      onClose={() => {
        markProOnboardingSeen(onboardingPlan);
        setShow(false);
      }}
    />
  );
}
