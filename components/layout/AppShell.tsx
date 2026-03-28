"use client";

import { useState, useEffect } from "react";
import { AuthEventProvider } from "@/components/context/AuthEventContext";
import { ActiveAccountProvider } from "@/components/context/ActiveAccountContext";
import { SubscriptionProvider } from "@/components/context/SubscriptionContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppMobileNav } from "@/components/layout/AppMobileNav";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { usePathname } from "next/navigation";

const TOUR_STORAGE_KEY = "onboarding_tour_completed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Only show tour on /app routes, and only if not yet completed
    if (!pathname?.startsWith("/app")) return;
    try {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!completed) {
        // Small delay to let the layout render so targets are measurable
        const timer = setTimeout(() => setShowTour(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable, skip tour
    }
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
                {children}
              </main>
            </div>

            {/* Bottom Tab Bar for Mobile */}
            <AppMobileNav />

            {/* Onboarding Tour */}
            {showTour && <OnboardingTour onComplete={handleTourComplete} />}
          </div>
        ) : (
          <main className="flex-1">{children}</main>
        )}
      </SubscriptionProvider>
    </ActiveAccountProvider>
    </AuthEventProvider>
  );
}
