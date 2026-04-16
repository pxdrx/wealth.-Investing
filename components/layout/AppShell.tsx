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
import { ProOnboardingGuard } from "@/components/onboarding/ProOnboardingGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const TOUR_STORAGE_KEY = "onboarding_tour_completed";
const TOUR_PENDING_KEY = "onboarding_tour_pending";
const NEW_USER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!pathname?.startsWith("/app")) return;

    let tourCompleted = false;
    let pending = false;
    try {
      tourCompleted = !!localStorage.getItem(TOUR_STORAGE_KEY);
      pending = localStorage.getItem(TOUR_PENDING_KEY) === "1";
    } catch {
      return;
    }

    // Already completed tour — nothing to do
    if (tourCompleted) return;

    // Pending flag is set — show tour
    if (pending) {
      const t = setTimeout(() => setShowTour(true), 600);
      return () => clearTimeout(t);
    }

    // Fallback: no flags at all — check if new user (account < 24h)
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || cancelled) return;
        const createdAt = new Date(session.user.created_at).getTime();
        const isNewUser = Date.now() - createdAt < NEW_USER_WINDOW_MS;
        if (isNewUser && !cancelled) {
          localStorage.setItem(TOUR_PENDING_KEY, "1");
          setShowTour(true);
        }
      } catch {
        // Silently fail — don't block the app
      }
    })();
    return () => { cancelled = true; };
  }, [pathname]);

  function handleTourComplete() {
    setShowTour(false);
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, new Date().toISOString());
      localStorage.removeItem(TOUR_PENDING_KEY);
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
    pathname === "/pricing" ||
    pathname === "/risk-disclaimer" ||
    pathname?.startsWith("/reset-password");

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

            {/* Pro/Ultra onboarding fallback (only when tour is not active) */}
            {!showTour && <ProOnboardingGuard />}
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
