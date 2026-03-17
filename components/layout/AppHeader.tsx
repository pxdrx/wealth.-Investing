"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, LogOut, Settings, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { getMyProfile } from "@/lib/profile";
import { BrandMark } from "@/components/brand/BrandMark";
import { SubscriptionBadge } from "@/components/billing/SubscriptionBadge";

const navLinks = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/wallet", label: "Wallet" },
  { href: "/app/alerts", label: "Alerts" },
  { href: "/app/news", label: "News" },
  { href: "/app/journal", label: "Journal" },
  { href: "/app/ai-coach", label: "AI Coach" },
  { href: "/app/pricing", label: "Planos" },
];

function UserAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "U";
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-foreground shadow-sm" style={{ background: "hsl(var(--muted))" }}>
      {initials}
    </span>
  );
}

function logout() {
  // Limpa toda a sessão do Supabase manualmente
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0] ?? "";
  const key = `sb-${projectRef}-auth-token`;
  try {
    localStorage.removeItem(key);
    sessionStorage.clear();
  } catch {}
  window.location.href = "/login";
}

export function AppHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
      if (!session) { setDisplayName(null); return; }
      try {
        const profile = await getMyProfile();
        setDisplayName(profile?.display_name?.trim() ?? null);
      } catch {}
    }
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
        <Link href="/" className="flex items-baseline shrink-0 mr-6">
          <BrandMark />
        </Link>
        <div className="flex-1" />
        <div className="hidden md:flex items-center gap-1">
          <nav className="flex items-center gap-1 mr-2">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className={cn("rounded-input px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  pathname === link.href && "bg-accent/80 text-foreground")}>
                {link.label}
              </Link>
            ))}
          </nav>
          {hasSession && <div className="h-5 w-px bg-border/60 mx-1" />}
          {hasSession && (
            <div className="relative" ref={menuRef}>
              <button type="button" onClick={() => setUserMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-[22px] border border-border/80 bg-muted/30 pl-1.5 pr-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 max-w-[200px]">
                <UserAvatar name={displayName ?? "U"} />
                <span className="truncate">{displayName ?? "Conta"}</span>
                <SubscriptionBadge />
                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", userMenuOpen && "rotate-180")} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 rounded-[14px] border border-border/60 bg-card shadow-lg py-1.5 z-50">
                  <Link href="/app/settings" onClick={() => setUserMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-foreground hover:bg-accent transition-colors rounded-[8px] mx-1" style={{width: "calc(100% - 8px)"}}>
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    Configurações
                  </Link>
                  <div className="my-1 h-px bg-border/60 mx-2" />
                  <button type="button" onClick={() => { setUserMenuOpen(false); logout(); }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors rounded-[8px] mx-1" style={{width: "calc(100% - 8px)"}}>
                    <LogOut className="h-3.5 w-3.5" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          )}
          <ThemeToggle />
        </div>
        <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 ml-auto"
          onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      {mobileOpen && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1 px-6 py-4">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                className={cn("rounded-input px-4 py-3 text-sm font-medium transition-colors",
                  pathname === link.href ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
                {link.label}
              </Link>
            ))}
            <Link href="/app/settings" onClick={() => setMobileOpen(false)}
              className="mt-1 flex items-center gap-2 rounded-input px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <Settings className="h-4 w-4" />
              Configurações
            </Link>
            <button type="button" onClick={() => { setMobileOpen(false); logout(); }}
              className="mt-1 flex items-center gap-2 rounded-input px-4 py-3 text-sm font-medium text-destructive hover:bg-accent transition-colors">
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </nav>
          <div className="flex items-center justify-end px-6 pb-4">
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}
