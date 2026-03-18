"use client";

import { useEffect, useState } from "react";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeToggle } from "./ThemeToggle";
import { NAV_LINKS, NAV_LINKS_AUTH } from "@/lib/landing-data";
import { supabase } from "@/lib/supabase/client";
import { getMyProfile } from "@/lib/profile";
import { NavModals, type NavModal } from "./NavModals";

function UserAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
      style={{
        backgroundColor: "hsl(var(--landing-accent) / 0.12)",
        color: "hsl(var(--landing-accent))",
      }}
    >
      {initials}
    </span>
  );
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navModal, setNavModal] = useState<NavModal>(null);
  // null = still loading (neutral state), true/false = resolved
  const [authState, setAuthState] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const loggedIn = !!session;
      setAuthState(loggedIn);
      if (loggedIn) {
        try {
          const profile = await getMyProfile();
          setDisplayName(profile?.display_name?.trim() ?? null);
        } catch {
          // Profile fetch failed — still show logged-in state
        }
      }
    }
    checkAuth();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(!!session);
      if (!session) setDisplayName(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isLoggedIn = authState === true;
  const isLoading = authState === null;
  const links = isLoggedIn ? NAV_LINKS_AUTH : NAV_LINKS;

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: "hsl(var(--landing-bg) / 0.8)",
        borderColor: "hsl(var(--landing-border))",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="landing-container flex h-16 items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5">
          <BrandMark />
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const modal = "modal" in link ? link.modal : null;
            if (modal) {
              return (
                <button
                  key={link.label}
                  onClick={() => setNavModal(modal)}
                  className="px-3.5 py-2 text-sm text-l-text-secondary hover:text-l-text transition-colors rounded-lg"
                >
                  {link.label}
                </button>
              );
            }
            return (
              <a
                key={link.label}
                href={link.href}
                className="px-3.5 py-2 text-sm text-l-text-secondary hover:text-l-text transition-colors rounded-lg"
              >
                {link.label}
              </a>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Loading state: show nothing to prevent flash */}
          {isLoading && <div className="hidden md:block w-[180px]" />}

          {/* Logged out: Entrar + Comece gratis */}
          {!isLoading && !isLoggedIn && (
            <>
              <a
                href="/login"
                className="hidden md:inline-flex px-4 py-2 text-sm text-l-text-secondary hover:text-l-text transition-colors"
              >
                Entrar
              </a>
              <a
                href="/login"
                className="hidden md:inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: "hsl(var(--landing-accent))",
                  color: "hsl(var(--landing-bg))",
                }}
              >
                Comece grátis
              </a>
            </>
          )}

          {/* Logged in: User pill + Dashboard CTA */}
          {!isLoading && isLoggedIn && (
            <>
              <div className="hidden md:inline-flex items-center gap-2 rounded-full border pl-1.5 pr-3 py-1"
                style={{ borderColor: "hsl(var(--landing-border))" }}
              >
                <UserAvatar name={displayName ?? "U"} />
                <span className="text-sm font-medium text-l-text truncate max-w-[120px]">
                  {displayName ?? "Conta"}
                </span>
              </div>
              <a
                href="/app"
                className="hidden md:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: "hsl(var(--landing-accent))",
                  color: "hsl(var(--landing-bg))",
                }}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Ir para Dashboard
              </a>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg"
            aria-label="Menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5 text-l-text" />
            ) : (
              <Menu className="h-5 w-5 text-l-text" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className="overflow-hidden border-t md:hidden transition-all duration-200 ease-out"
        style={{
          maxHeight: mobileOpen ? "400px" : "0px",
          opacity: mobileOpen ? 1 : 0,
          backgroundColor: "hsl(var(--landing-bg))",
          borderColor: mobileOpen
            ? "hsl(var(--landing-border))"
            : "transparent",
        }}
      >
        <div className="flex flex-col gap-1 p-4">
          {links.map((link) => {
            const modal = "modal" in link ? link.modal : null;
            if (modal) {
              return (
                <button
                  key={link.label}
                  onClick={() => { setMobileOpen(false); setNavModal(modal); }}
                  className="px-3 py-2.5 text-sm text-l-text-secondary hover:text-l-text rounded-lg text-left"
                >
                  {link.label}
                </button>
              );
            }
            return (
              <a
                key={link.label}
                href={link.href}
                className="px-3 py-2.5 text-sm text-l-text-secondary hover:text-l-text rounded-lg"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            );
          })}
          <hr
            className="my-2"
            style={{ borderColor: "hsl(var(--landing-border))" }}
          />

          {!isLoading && !isLoggedIn && (
            <>
              <a
                href="/login"
                className="px-3 py-2.5 text-sm text-l-text-secondary"
              >
                Entrar
              </a>
              <a
                href="/login"
                className="mt-1 flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium"
                style={{
                  backgroundColor: "hsl(var(--landing-accent))",
                  color: "hsl(var(--landing-bg))",
                }}
              >
                Comece grátis
              </a>
            </>
          )}

          {!isLoading && isLoggedIn && (
            <>
              <div className="flex items-center gap-2 px-3 py-2">
                <UserAvatar name={displayName ?? "U"} />
                <span className="text-sm font-medium text-l-text">
                  {displayName ?? "Conta"}
                </span>
              </div>
              <a
                href="/app"
                className="mt-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
                style={{
                  backgroundColor: "hsl(var(--landing-accent))",
                  color: "hsl(var(--landing-bg))",
                }}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Ir para Dashboard
              </a>
            </>
          )}
        </div>
      </div>
      <NavModals open={navModal} onOpenChange={setNavModal} />
    </nav>
  );
}
