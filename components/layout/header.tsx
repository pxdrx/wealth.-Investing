"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { hasAuthCookie, clearAuth } from "@/lib/auth";

const navLinks = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/wallet", label: "Wallet" },
  { href: "/app/prop", label: "Prop" },
  { href: "/app/alerts", label: "Alerts" },
  { href: "/app/news", label: "News" },
  { href: "/app/journal", label: "Journal" },
  { href: "/app/settings", label: "Settings" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setIsAuth(hasAuthCookie());
  }, [pathname]);

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight-apple text-foreground"
        >
          Trading Dashboard
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-input px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                pathname === link.href && "bg-accent/80 text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAuth && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hidden md:inline-flex"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sair
            </Button>
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
          {isAuth && (
            <div className="px-6 pt-4 pb-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => {
                  handleLogout();
                  setMobileOpen(false);
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          )}
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
          </nav>
        </div>
      )}
    </header>
  );
}
