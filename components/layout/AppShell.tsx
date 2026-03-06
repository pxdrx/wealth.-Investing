"use client";

import { ActiveAccountProvider } from "@/components/context/ActiveAccountContext";
import { AppHeader } from "@/components/layout/AppHeader";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeader = pathname === "/" ||
    pathname === "/login" ||
    pathname?.startsWith("/login") ||
    pathname === "/auth/callback" ||
    pathname?.startsWith("/onboarding");

  return (
    <ActiveAccountProvider>
      {!hideHeader && <AppHeader />}
      <main>{children}</main>
    </ActiveAccountProvider>
  );
}
