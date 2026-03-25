"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  LineChart,
  BookOpen,
  BrainCircuit,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CreditCard
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { getMyProfile } from "@/lib/profile";
import { BrandMark } from "@/components/brand/BrandMark";
import { SubscriptionBadge } from "@/components/billing/SubscriptionBadge";
import { useSubscription } from "@/components/context/SubscriptionContext";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/macro", label: "Inteligência Macro", icon: LineChart },
  { href: "/app/journal", label: "Trade Journal", icon: BookOpen },
  { href: "/app/ai-coach", label: "AI Coach", icon: BrainCircuit, highlight: true },
];

function logout() {
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0] ?? "";
  const key = `sb-${projectRef}-auth-token`;
  try {
    localStorage.removeItem(key);
    sessionStorage.clear();
  } catch {}
  window.location.href = "/login";
}

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const { plan } = useSubscription();

  // Auto-collapse on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setCollapsed(true);
      else setCollapsed(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
      if (!session) { setDisplayName(null); setProfileLoading(false); return; }
      try {
        const profile = await getMyProfile();
        setDisplayName(profile?.display_name?.trim() ?? null);
      } catch {} finally {
        setProfileLoading(false);
      }
    }
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => subscription.unsubscribe();
  }, []);

  const initials = displayName ? displayName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "U";

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border/40 bg-background transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] z-40 hidden md:flex",
        collapsed ? "w-[80px]" : "w-[260px]"
      )}
    >
      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-border/80 bg-background shadow-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors z-50"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Header / Brand */}
      <div className={cn("flex items-center shrink-0 h-20 px-6 transition-opacity", collapsed && "px-0 justify-center")}>
        {collapsed ? (
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            <span className="font-headline font-bold text-sm">w.</span>
          </div>
        ) : (
          <BrandMark />
        )}
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar flex flex-col gap-1.5">
        {navLinks.map((link) => {
          const isActive = link.href === "/app" 
            ? pathname === "/app"
            : pathname === link.href || pathname?.startsWith(link.href + "/");
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                link.highlight && !isActive && "text-indigo-400 hover:text-indigo-300"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[60%] w-1 bg-primary rounded-r-md" />
              )}
              <Icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-110", isActive && "text-primary")} />
              
              {!collapsed && (
                <span className="text-sm tracking-wide truncate">
                  {link.label}
                  {link.highlight && (
                    <Sparkles className="inline-block ml-1.5 h-3 w-3 text-indigo-400 animate-pulse" />
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Actions / User Section */}
      <div className="p-4 border-t border-border/40 bg-background/20 space-y-2">
        <div className="flex flex-col gap-1">
          <Link
            href="/app/settings"
            title={collapsed ? "Configurações" : undefined}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200"
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Configurações</span>}
          </Link>
          <Link
            href="/app/pricing"
            title={collapsed ? "Planos" : undefined}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200"
          >
            <CreditCard className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Planos</span>}
          </Link>

          <button
            onClick={logout}
            title={collapsed ? "Sair" : undefined}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 w-full"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Sair</span>}
          </button>
        </div>

        {/* User Card */}
        {hasSession && (
          <div className={cn(
            "mt-4 flex items-center gap-3 rounded-xl border border-border/30 bg-muted/20 p-2 overflow-hidden transition-all",
            collapsed ? "justify-center" : ""
          )}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex flex-1 items-center min-w-0 gap-2">
                <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-foreground">
                      {profileLoading ? "Carregando..." : (displayName ?? "Operador")}
                    </span>
                    {!profileLoading && (
                      <SubscriptionBadge className="text-[9px] h-4 leading-none flex items-center px-1.5" />
                    )}
                  </div>
                  <span className="truncate text-[10px] text-muted-foreground uppercase tracking-widest">
                    Terminal {plan === 'ultra' ? 'Ultra' : plan === 'pro' ? 'Pro' : 'Free'}
                  </span>
                </div>
                <div className="shrink-0">
                  <ThemeToggle />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
