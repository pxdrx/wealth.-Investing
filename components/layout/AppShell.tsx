"use client";

import { useState, useEffect } from "react";
import { AuthEventProvider } from "@/components/context/AuthEventContext";
import { ActiveAccountProvider } from "@/components/context/ActiveAccountContext";
import { SubscriptionProvider } from "@/components/context/SubscriptionContext";
import { LiveMonitoringProvider } from "@/components/context/LiveMonitoringContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppMobileNav } from "@/components/layout/AppMobileNav";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { TierOnboardingGuard } from "@/components/onboarding/TierOnboardingGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { usePathname } from "next/navigation";
import { useOnboardingState } from "@/lib/onboarding/use-onboarding-state";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    state: onboardingState,
    isLoading: onboardingLoading,
    markTourCompleted,
  } = useOnboardingState();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (onboardingLoading || !onboardingState) return;
    if (!pathname?.startsWith("/app")) return;
    if (onboardingState.tourCompletedAt) return;

    const t = setTimeout(() => setShowTour(true), 800);
    return () => clearTimeout(t);
  }, [pathname, onboardingState, onboardingLoading]);

  async function handleTourComplete() {
    setShowTour(false);
    await markTourCompleted();
  }

  // next-intl localePrefix="as-needed" makes usePathname() return `/pt` or
  // `/en` for the default-locale landing route. Strip the prefix before
  // matching so all public routes hide the app shell regardless of locale.
  const normalizedPath = (pathname ?? "").replace(/^\/(pt|en)(?=\/|$)/, "") || "/";
  const hideHeader = normalizedPath === "/" ||
    normalizedPath === "/login" ||
    normalizedPath.startsWith("/login") ||
    normalizedPath === "/auth/callback" ||
    normalizedPath.startsWith("/onboarding") ||
    normalizedPath.startsWith("/features") ||
    normalizedPath === "/manifesto" ||
    normalizedPath === "/academy" ||
    normalizedPath === "/changelog" ||
    normalizedPath === "/blog" ||
    normalizedPath === "/pricing" ||
    normalizedPath === "/risk-disclaimer" ||
    normalizedPath.startsWith("/reset-password");

  return (
    <AuthEventProvider>
    <ActiveAccountProvider>
      <SubscriptionProvider>
      <LiveMonitoringProvider>
        {!hideHeader ? (
          <div className="flex h-screen w-full overflow-hidden bg-background">
            {/* Sidebar for Desktop */}
            <AppSidebar />

            <div className="flex-1 flex flex-col relative overflow-hidden isolate">
              {/* Header for Mobile only */}
              <div className="md:hidden shrink-0 z-50">
                <AppHeader />
              </div>

              {/* Scrollable Content Area */}
              <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar scroll-smooth pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
                <ErrorBoundary>{children}</ErrorBoundary>
              </main>
            </div>

            {/* Bottom Tab Bar for Mobile */}
            <AppMobileNav />

            {/* Onboarding Tour */}
            {showTour && <OnboardingTour onComplete={handleTourComplete} />}

            {/* Tier onboarding (delta modals when plan upgrades) */}
            {!showTour && <TierOnboardingGuard />}
          </div>
        ) : (
          <main className="flex-1"><ErrorBoundary>{children}</ErrorBoundary></main>
        )}
      </LiveMonitoringProvider>
      </SubscriptionProvider>
    </ActiveAccountProvider>
    </AuthEventProvider>
  );
}
