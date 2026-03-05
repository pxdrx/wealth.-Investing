"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, LogOut, Settings, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { getMyProfile, toFriendlyMessage } from "@/lib/profile";
import { BrandMark } from "@/components/brand/BrandMark";

// Alerts removido - integrado ao Dashboard
const navLinks = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/wallet", label: "Wallet" },
  { href: "/app/alerts", label: "Alerts" },
  { href: "/app/news", label: "News" },
  { href: "/app/journal", label: "Journal" },
  { href: "/app/settings", label: "Settings" },
];

/** Avatar com iniciais - cor neutra */
function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-foreground shadow-sm"
      style={{ background: "hsl(var(--muted))" }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setHasSession(!!session);
        if (!session) { setDisplayName(null); return; }
        try {
          const profile = await getMyProfile();
          setDisplayName(profile?.display_name?.trim() ?? null);
        } catch (err) {
          if (process.env.NODE_ENV === "development") console.error("[AppHeader] getMyProfile error", err);
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") console.error("[AppHeader] session error", err);
        setHasSession(false);
        setDisplayName(null);
      }
    }
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => subscription.unsubscribe();
  }, []);

  // Fechar user menu ao clicar fora
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = () => setUserMenuOpen(false);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignora erro
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-6">

        {/* LEFT - Logo */}
        <Link href="/" className="flex items-baseline shrink-0 mr-6">
          <BrandMark />
        </Link>

        {/* CENTER - spacer */}
        <div className="flex-1" />

        {/* RIGHT - Nav + Conta + Tema */}
        <div className="hidden md:flex items-center gap-1">
          {/* Nav links */}
          <nav className="flex items-center gap-1 mr-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-input px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 ease-out hover:bg-accent hover:text-foreground",
                  pathname === link.href && "bg-accent/80 text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Separator */}
          {hasSession && (
            <div className="h-5 w-px bg-border/60 mx-1" aria-hidden />
          )}

          {/* User menu */}
          {hasSession && (
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => { e.stopPropagation(); setUserMenuOpen((v) => !v); }}
                className="inline-flex items-center gap-2 rounded-[22px] border border-border/80 bg-muted/30 pl-1.5 pr-3 py-1.5 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted/60 hover:border-border max-w-[200px]"
                title={displayName ?? "Conta"}
              >
                <UserAvatar name={displayName ?? "U"} />
                <span className="truncate">{displayName ?? "Conta"}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-150", userMenuOpen && "rotate-180")} />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-44 rounded-[14px] border border-border/60 bg-card shadow-lg py-1.5 z-50"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => { router.push("/app/settings"); setUserMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-foreground hover:bg-accent transition-colors rounded-[8px] mx-1 w-[calc(100%-8px)]"
                  >
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    Configurações
                  </button>
                  <div className="my-1 h-px bg-border/60 mx-2" />
                  <button
                    type="button"
                    onMouseDown={(e) => { e.stopPropagation(); handleLogout(); setUserMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors rounded-[8px] mx-1 w-[calc(100%-8px)]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          )}

          <ThemeToggle />
        </div>

        {/* MOBILE - burger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9 ml-auto"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1 px-6 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-input px-4 py-3 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
            {hasSession && (
              <>
                <button
                  type="button"
                  onClick={() => { router.push("/app/settings"); setMobileOpen(false); }}
                  className="mt-1 flex items-center gap-2 rounded-input px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Configurações
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </>
            )}
          </nav>
          <div className="flex items-center justify-end px-6 pb-4">
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}
