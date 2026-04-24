"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X, LayoutDashboard, Settings, LogOut, ChevronDown } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeToggle } from "./ThemeToggle";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { NAV_LINKS } from "@/lib/landing-data";
import { supabase } from "@/lib/supabase/client";
import { getMyProfile } from "@/lib/profile";
import { SubscriptionBadge } from "@/components/billing/SubscriptionBadge";
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

function logout() {
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0] ?? "";
  const key = `sb-${projectRef}-auth-token`;
  try {
    localStorage.removeItem(key);
    sessionStorage.clear();
  } catch {}
  window.location.href = "/login";
}

export function Navbar() {
  const t = useTranslations("nav");
  const tLinks = useTranslations("nav.links");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navModal, setNavModal] = useState<NavModal>(null);
  const [authState, setAuthState] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
        } catch {}
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

  // Close dropdown on outside click (mousedown to avoid race with toggle click)
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const isLoggedIn = authState === true;
  const isLoading = authState === null;

  // Always show landing nav links regardless of auth state
  const links = NAV_LINKS;

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

        {/* Desktop links — always landing links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const modal = link.modal;
            const label = tLinks(link.labelKey);
            if (modal) {
              return (
                <button
                  key={link.labelKey}
                  onClick={() => setNavModal(modal)}
                  className="px-3.5 py-2 text-sm text-l-text-secondary hover:text-l-text transition-colors rounded-lg"
                >
                  {label}
                </button>
              );
            }
            return (
              <a
                key={link.labelKey}
                href={link.href}
                className="px-3.5 py-2 text-sm text-l-text-secondary hover:text-l-text transition-colors rounded-lg"
              >
                {label}
              </a>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <LocaleSwitcher className="hidden md:inline-flex" />
          <ThemeToggle />

          {isLoading && <div className="hidden md:block w-[180px]" />}

          {/* Logged out */}
          {!isLoading && !isLoggedIn && (
            <>
              <a
                href="/login"
                className="hidden md:inline-flex px-4 py-2 text-sm text-l-text-secondary hover:text-l-text transition-colors"
              >
                {t("signIn")}
              </a>
              <a
                href="/login"
                className="hidden md:inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-full transition-all hover:scale-[1.02] shadow-[0_2px_8px_rgba(26,26,26,0.08)]"
                style={{
                  backgroundColor: "hsl(var(--landing-accent))",
                  color: "hsl(var(--landing-bg-elevated))",
                }}
              >
                {t("signUp")}
              </a>
            </>
          )}

          {/* Logged in: User pill with dropdown + Dashboard CTA */}
          {!isLoading && isLoggedIn && (
            <>
              <div className="hidden md:block relative z-[60]" ref={menuRef}>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full border pl-1.5 pr-3 py-1 transition-colors hover:bg-[hsl(var(--landing-accent)/0.06)]"
                  style={{ borderColor: "hsl(var(--landing-border))" }}
                >
                  <UserAvatar name={displayName ?? "U"} />
                  <span className="text-sm font-medium text-l-text truncate max-w-[120px]">
                    {displayName ?? t("account")}
                  </span>
                  <SubscriptionBadge />
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-l-text-secondary transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-44 rounded-[14px] border shadow-lg py-1.5 z-50"
                    style={{
                      backgroundColor: "hsl(var(--landing-elevated))",
                      borderColor: "hsl(var(--landing-border))",
                    }}
                  >
                    <a
                      href="/app/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-l-text hover:bg-[hsl(var(--landing-accent)/0.08)] transition-colors rounded-[8px] mx-1"
                      style={{ width: "calc(100% - 8px)" }}
                    >
                      <Settings className="h-3.5 w-3.5 text-l-text-secondary" />
                      {t("settings")}
                    </a>
                    <div
                      className="my-1 h-px mx-2"
                      style={{ backgroundColor: "hsl(var(--landing-border))" }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors rounded-[8px] mx-1"
                      style={{ width: "calc(100% - 8px)" }}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      {t("logout")}
                    </button>
                  </div>
                )}
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
                {t("dashboard")}
              </a>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg"
            aria-label={t("menu")}
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
          maxHeight: mobileOpen ? "500px" : "0px",
          opacity: mobileOpen ? 1 : 0,
          backgroundColor: "hsl(var(--landing-bg))",
          borderColor: mobileOpen
            ? "hsl(var(--landing-border))"
            : "transparent",
        }}
      >
        <div className="flex flex-col gap-1 p-4">
          {links.map((link) => {
            const modal = link.modal;
            const label = tLinks(link.labelKey);
            if (modal) {
              return (
                <button
                  key={link.labelKey}
                  onClick={() => {
                    setMobileOpen(false);
                    setNavModal(modal);
                  }}
                  className="px-3 py-2.5 text-sm text-l-text-secondary hover:text-l-text rounded-lg text-left"
                >
                  {label}
                </button>
              );
            }
            return (
              <a
                key={link.labelKey}
                href={link.href}
                className="px-3 py-2.5 text-sm text-l-text-secondary hover:text-l-text rounded-lg"
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </a>
            );
          })}
          <hr
            className="my-2"
            style={{ borderColor: "hsl(var(--landing-border))" }}
          />

          <div className="px-3 pb-2">
            <LocaleSwitcher />
          </div>

          {!isLoading && !isLoggedIn && (
            <>
              <a
                href="/login"
                className="px-3 py-2.5 text-sm text-l-text-secondary"
              >
                {t("signIn")}
              </a>
              <a
                href="/login"
                className="mt-1 flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium"
                style={{
                  backgroundColor: "hsl(var(--landing-accent))",
                  color: "hsl(var(--landing-bg))",
                }}
              >
                {t("signUp")}
              </a>
            </>
          )}

          {!isLoading && isLoggedIn && (
            <>
              <div className="flex items-center gap-2 px-3 py-2">
                <UserAvatar name={displayName ?? "U"} />
                <span className="text-sm font-medium text-l-text">
                  {displayName ?? t("account")}
                </span>
                <SubscriptionBadge />
              </div>
              <a
                href="/app/settings"
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-l-text-secondary hover:text-l-text rounded-lg"
                onClick={() => setMobileOpen(false)}
              >
                <Settings className="h-4 w-4" />
                {t("settings")}
              </a>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10 rounded-lg text-left"
              >
                <LogOut className="h-4 w-4" />
                {t("logout")}
              </button>
              <a
                href="/app"
                className="mt-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
                style={{
                  backgroundColor: "hsl(var(--landing-accent))",
                  color: "hsl(var(--landing-bg))",
                }}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                {t("goDashboard")}
              </a>
            </>
          )}
        </div>
      </div>
      <NavModals open={navModal} onOpenChange={setNavModal} />
    </nav>
  );
}
