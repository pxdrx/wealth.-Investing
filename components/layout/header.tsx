"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { getMyProfile, toFriendlyMessage } from "@/lib/profile";
import { BrandMark } from "@/components/brand/BrandMark";
import { FirmIcon } from "@/components/brand/FirmIcon";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { phaseLabel, type AccountWithProp } from "@/lib/accounts";

const navLinks = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/wallet", label: "Wallet" },
  { href: "/app/prop", label: "Prop" },
  { href: "/app/alerts", label: "Alerts" },
  { href: "/app/news", label: "News" },
  { href: "/app/journal", label: "Journal" },
  { href: "/app/settings", label: "Settings" },
];

const ICON_SIZE = 20;

function AccountPillContent({
  account,
  showInactiveBadge,
}: {
  account: AccountWithProp | null | undefined;
  showInactiveBadge?: boolean;
}) {
  if (!account) return <span className="truncate">Conta</span>;
  const firmName = account.kind === "prop" ? account.prop?.firm_name : null;
  const phase = account.prop?.phase;

  return (
    <>
      <FirmIcon firmName={firmName} kind={account.kind} size={ICON_SIZE} className="shrink-0 text-current" />
      <span className="truncate">{account.name}</span>
      {account.kind === "prop" && phase && (
        <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0 font-medium">
          {phaseLabel(phase)}
        </Badge>
      )}
      {showInactiveBadge && !account.is_active && (
        <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 font-medium text-muted-foreground">
          Desativada
        </Badge>
      )}
    </>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(false);
  const { accounts, activeAccountId, setActiveAccountId, isLoading: accountsLoading } = useActiveAccount();

  const activeAccount = activeAccountId ? accounts.find((a) => a.id === activeAccountId) : null;
  const activeOnly = accounts.filter((a) => a.is_active);
  const inactiveOnly = accounts.filter((a) => !a.is_active);
  const visibleAccounts = showInactiveAccounts ? accounts : activeOnly;

  useEffect(() => {
    async function load() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
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
            console.error("[Header] getMyProfile error", err);
          }
          setProfileError(toFriendlyMessage(err));
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("[Header] session error", err);
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
                "rounded-input px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="hidden md:inline-flex items-center gap-2 rounded-[22px] border border-border/80 bg-muted/30 px-3 py-1.5 text-base font-medium text-foreground transition-colors duration-150 hover:bg-muted/60 hover:border-border max-w-[280px]"
                    aria-label="Trocar conta"
                  >
                    <AccountPillContent
                      account={activeAccount}
                      showInactiveBadge={!!activeAccount && !activeAccount.is_active}
                    />
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[240px]">
                  {visibleAccounts.map((acc) => (
                    <DropdownMenuItem
                      key={acc.id}
                      onClick={() => setActiveAccountId(acc.id)}
                    >
                      <div className="flex items-center gap-2 w-full min-w-0">
                        <FirmIcon firmName={acc.kind === "prop" ? acc.prop?.firm_name : null} kind={acc.kind} size={ICON_SIZE} className="shrink-0 text-current" />
                        <span className="truncate font-medium">{acc.name}</span>
                        {acc.kind === "prop" && acc.prop?.phase && (
                          <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0 ml-auto">
                            {phaseLabel(acc.prop.phase)}
                          </Badge>
                        )}
                        {!acc.is_active && (
                          <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 text-muted-foreground">
                            Desativada
                          </Badge>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {inactiveOnly.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="justify-between"
                      >
                        <span className="text-muted-foreground text-sm">Mostrar contas desativadas</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={showInactiveAccounts}
                          onClick={() => setShowInactiveAccounts((v) => !v)}
                          className={cn(
                            "relative inline-flex h-5 w-9 shrink-0 rounded-full border border-border transition-colors",
                            showInactiveAccounts ? "bg-primary" : "bg-muted"
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform",
                              showInactiveAccounts && "translate-x-4"
                            )}
                          />
                        </button>
                      </DropdownMenuItem>
                    </>
                  )}
                  {visibleAccounts.length === 0 && !accountsLoading && (
                    <DropdownMenuItem disabled>Nenhuma conta</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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
                className="text-muted-foreground hidden md:inline-flex"
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
          {hasSession && (
            <div className="flex flex-col gap-2 px-6 pt-4 pb-2">
              <div className="rounded-[22px] border border-border/80 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Conta</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <AccountPillContent
                    account={activeAccount}
                    showInactiveBadge={!!activeAccount && !activeAccount.is_active}
                  />
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  {visibleAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setActiveAccountId(acc.id);
                        setMobileOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-input px-2 py-1.5 text-left text-sm",
                        acc.id === activeAccountId
                          ? "bg-accent font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted/60"
                      )}
                    >
                      <FirmIcon firmName={acc.kind === "prop" ? acc.prop?.firm_name : null} kind={acc.kind} size={ICON_SIZE} className="shrink-0 text-current" />
                      <span className="truncate">{acc.name}</span>
                      {acc.kind === "prop" && acc.prop?.phase && (
                        <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                          {phaseLabel(acc.prop.phase)}
                        </Badge>
                      )}
                      {!acc.is_active && (
                        <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 text-muted-foreground">
                          Desativada
                        </Badge>
                      )}
                    </button>
                  ))}
                  {inactiveOnly.length > 0 && (
                    <div className="flex items-center justify-between pt-1 mt-1 border-t border-border/60">
                      <span className="text-muted-foreground text-xs">Mostrar desativadas</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={showInactiveAccounts}
                        onClick={() => setShowInactiveAccounts((v) => !v)}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 rounded-full border border-border transition-colors",
                          showInactiveAccounts ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform",
                            showInactiveAccounts && "translate-x-4"
                          )}
                        />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  router.push("/app/settings");
                  setMobileOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-[22px] border border-border/80 bg-muted/30 px-3 py-2 text-base font-medium text-foreground transition-colors duration-150 hover:bg-muted/60 hover:border-border"
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
