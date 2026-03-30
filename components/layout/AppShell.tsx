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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const TOUR_STORAGE_KEY = "onboarding_tour_completed";
/** Only show tour if account was created within this window (ms) */
const NEW_ACCOUNT_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Only show tour on /app routes, and only if not yet completed
    if (!pathname?.startsWith("/app")) return;
    try {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      if (completed) return; // Already completed, skip everything
    } catch {
      // localStorage unavailable, skip tour
      return;
    }

    // Check if user account is new enough to warrant showing the tour
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const createdAt = data?.user?.created_at;
      if (!createdAt) return;

      const accountAgeMs = Date.now() - new Date(createdAt).getTime();
      if (accountAgeMs <= NEW_ACCOUNT_THRESHOLD_MS) {
        // New user — show tour after a small delay for layout to render
        setTimeout(() => {
          if (!cancelled) setShowTour(true);
        }, 600);
      } else {
        // Existing user — auto-dismiss tour forever
        try {
          localStorage.setItem(TOUR_STORAGE_KEY, new Date().toISOString());
        } catch {
          // localStorage unavailable
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTourComplete() {
    setShowTour(false);
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, new Date().toISOString());
    } catch {
      // localStorage unavailable
    }
  }
  const hideHeader = pathname === "/" ||
    pathname === "/login" ||
    pathname?.startsWith("/login") ||
    pathname === "/auth/callback" ||
    pathname?.startsWith("/onboarding") ||
    pathname?.startsWith("/features") ||
    pathname === "/manifesto" ||
    pathname === "/academy" ||
    pathname === "/changelog" ||
    pathname === "/blog" ||
    pathname === "/risk-disclaimer";

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
              <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar scroll-smooth pb-20 md:pb-0">
                <ErrorBoundary>{children}</ErrorBoundary>
              </main>
            </div>

            {/* Bottom Tab Bar for Mobile */}
            <AppMobileNav />

            {/* Onboarding Tour */}
            {showTour && <OnboardingTour onComplete={handleTourComplete} />}
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
