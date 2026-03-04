"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { getMyProfile, toFriendlyMessage } from "@/lib/profile";
import { BrandMark } from "@/components/brand/BrandMark";

const navLinks = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/wallet", label: "Wallet" },
  { href: "/app/alerts", label: "Alerts" },
  { href: "/app/news", label: "News" },
  { href: "/app/journal", label: "Journal" },
  { href: "/app/settings", label: "Settings" },
];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }
        setHasSession(!!session);
        if (!session) {
          setDisplayName(null);
          setProfileError(null);
          return;
        }
        try {
          const profile = await getMyProfile();
          setDisplayName(profile?.display_name?.trim() ?? null);
          setProfileError(null);
        } catch (err) {
          if (process.env.NODE_ENV === "development") {
            console.error("[AppHeader] getMyProfile error", err);
          }
          setProfileError(toFriendlyMessage(err));
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("[AppHeader] session error", err);
        }
        setHasSession(false);
        setDisplayName(null);
        setProfileError(toFriendlyMessage(err));
      }
    }
    load();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-baseline">
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
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

        <div className="flex items-center gap-2">
          {hasSession && (
            <>
              <button
                type="button"
                onClick={() => router.push("/app/settings")}
                className="hidden md:inline-flex items-center gap-2 rounded-[22px] border border-border/80 bg-muted/30 px-3 py-1.5 text-base font-medium text-foreground transition-colors duration-150 hover:bg-muted/60 hover:border-border max-w-[180px]"
                title={displayName ?? "Conta"}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
                  aria-hidden
                >
                  {(displayName ?? "Conta").charAt(0).toUpperCase() || "?"}
                </span>
                <span className="truncate">{displayName ?? "Conta"}</span>
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hidden md:inline-flex transition-colors duration-200 ease-out hover:text-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Sair
              </Button>
            </>
          )}
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

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
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 justify-start text-muted-foreground"
                onClick={() => {
                  handleLogout();
                  setMobileOpen(false);
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
