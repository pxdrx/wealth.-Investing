"use client";

import { AuthEventProvider } from "@/components/context/AuthEventContext";
import { ActiveAccountProvider } from "@/components/context/ActiveAccountContext";
import { SubscriptionProvider } from "@/components/context/SubscriptionContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppMobileNav } from "@/components/layout/AppMobileNav";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
          </div>
        ) : (
          <main className="flex-1">{children}</main>
        )}
      </SubscriptionProvider>
    </ActiveAccountProvider>
    </AuthEventProvider>
  );
}
