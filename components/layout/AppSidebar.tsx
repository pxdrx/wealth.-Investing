"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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
  CreditCard,
  Scan,
  Plus,
  Wallet,
  Crown,
  MessageSquare,
  GraduationCap,
  Shield,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { getMyProfile } from "@/lib/profile";
import { BrandMark } from "@/components/brand/BrandMark";
import { SubscriptionBadge } from "@/components/billing/SubscriptionBadge";
import { useSubscription } from "@/components/context/SubscriptionContext";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";

interface SidebarConversation {
  id: string;
  title: string;
  updated_at: string;
}

const baseNavLinks = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/journal", label: "Trade Journal", icon: BookOpen },
  { href: "/app/prop", label: "Contas", icon: Wallet },
  { href: "/app/macro", label: "Inteligência Macro", icon: LineChart, highlight: true },
  { href: "/app/analyst", label: "Analista Dexter", icon: Scan, highlight: true },
  { href: "/app/ai-coach", label: "AI Coach", icon: BrainCircuit, highlight: true },
];

const adminNavLink = { href: "/app/admin", label: "Admin", icon: Shield, highlight: false };

function logout() {
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0] ?? "";
  const key = `sb-${projectRef}-auth-token`;
  try {
    localStorage.removeItem(key);
    sessionStorage.clear();
  } catch {}
  window.location.href = "/login";
}

function AppSidebarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const { plan, isProOrAbove, isMentor } = useSubscription();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLinkedStudent, setIsLinkedStudent] = useState(false);

  // Check admin status
  useEffect(() => {
    let cancelled = false;
    const safety = setTimeout(() => { /* noop — just prevents hanging */ }, 8000);
    async function checkAdmin() {
      try {
        const { data: { session } } = await safeGetSession();
        if (!session || cancelled) return;
        const res = await fetch("/api/admin/me", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (!cancelled && json.ok && json.isAdmin) setIsAdmin(true);
      } catch {
        // silently ignore — non-admin
      }
    }
    checkAdmin();
    return () => { cancelled = true; clearTimeout(safety); };
  }, []);

  // Detect active mentor relationship (student side)
  useEffect(() => {
    if (isMentor) return; // mentors don't need the student check
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await safeGetSession();
        if (!session || cancelled) return;
        const res = await fetch("/api/mentor/my-mentor", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (!cancelled && json.ok && json.mentor) setIsLinkedStudent(true);
      } catch {
        // silent — unlinked is the fallback
      }
    })();
    return () => { cancelled = true; };
  }, [isMentor]);

  const navLinks = (() => {
    const links = [...baseNavLinks];
    // Mentor entry is always visible; label varies by role
    const mentorLabel = isMentor
      ? "Painel Mentor"
      : isLinkedStudent
      ? "Mentor"
      : "Mentoria";
    const mentorNavLink = {
      href: "/app/mentor",
      label: mentorLabel,
      icon: GraduationCap,
      highlight: false,
    };
    // Insert mentor after Journal (index 1) — before Contas
    links.splice(2, 0, mentorNavLink);
    // Admin goes at the end
    if (isAdmin) links.push(adminNavLink);
    return links;
  })();
  const [coachConversations, setCoachConversations] = useState<SidebarConversation[]>([]);
  const isOnCoachPage = pathname?.startsWith("/app/ai-coach") ?? false;

  // Load AI Coach conversations when on coach page
  useEffect(() => {
    if (!isOnCoachPage) { setCoachConversations([]); return; }
    async function loadConversations() {
      const { data: { session } } = await safeGetSession();
      if (!session?.access_token) return;
      try {
        const res = await fetch("/api/ai/conversations", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (json.ok && json.data) {
          setCoachConversations(json.data.slice(0, 10));
        }
      } catch {}
    }
    loadConversations();
  }, [isOnCoachPage, pathname]);

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
    const safety = setTimeout(() => setProfileLoading(false), 8000);
    async function load() {
      const { data: { session } } = await safeGetSession();
      if (session) {
        setHasSession(true);
        try {
          const profile = await getMyProfile();
          const name = profile?.display_name?.trim();
          if (name) {
            setDisplayName(name);
          } else {
            // Fallback: use auth metadata or email prefix
            const meta = session.user.user_metadata;
            const fallback =
              meta?.full_name?.trim() ||
              meta?.name?.trim() ||
              session.user.email?.split("@")[0] ||
              null;
            setDisplayName(fallback);
          }
        } catch {
          // Profile fetch failed — use auth metadata as fallback
          if (!displayName) {
            const meta = session.user.user_metadata;
            const fallback =
              meta?.full_name?.trim() ||
              meta?.name?.trim() ||
              session.user.email?.split("@")[0] ||
              null;
            setDisplayName(fallback);
          }
        } finally {
          setProfileLoading(false);
        }
      } else if (!hasSession) {
        // Only clear on initial load — don't wipe user card on transient null
        setDisplayName(null);
        setProfileLoading(false);
      }
    }
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => { subscription.unsubscribe(); clearTimeout(safety); };
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
            <div key={link.href}>
            <Link
              href={link.href}
              title={collapsed ? link.label : undefined}
              data-tour-id={`sidebar-${link.href.replace("/app/", "").replace("/app", "dashboard")}`}
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
            {/* AI Coach conversation sub-items */}
            {link.href === "/app/ai-coach" && isOnCoachPage && !collapsed && coachConversations.length > 0 && (
              <div className="ml-8 space-y-0.5 mt-1 mb-1">
                {coachConversations.map((conv) => {
                  const isActiveConv = isOnCoachPage && searchParams.get("chat") === conv.id;
                  return (
                    <Link
                      key={conv.id}
                      href={`/app/ai-coach?chat=${conv.id}`}
                      className={cn(
                        "block text-xs truncate py-1 px-2 rounded-lg transition-colors",
                        isActiveConv
                          ? "text-foreground bg-primary/10 font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      )}
                    >
                      {conv.title}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Upgrade CTA — free users only */}
      {!isProOrAbove && !collapsed && (
        <div className="px-3 pb-2">
          <Link
            href="/app/pricing"
            className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
          >
            <Crown className="h-4 w-4" />
            Seja Pro
          </Link>
        </div>
      )}
      {!isProOrAbove && collapsed && (
        <div className="flex justify-center pb-2">
          <Link
            href="/app/pricing"
            title="Seja Pro"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
          >
            <Crown className="h-4 w-4" />
          </Link>
        </div>
      )}

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
          <FeedbackDialog
            trigger={
              <span
                title={collapsed ? "Feedback" : undefined}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200 cursor-pointer"
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="text-sm font-medium">Feedback</span>}
              </span>
            }
          />

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
                    Terminal {plan === 'mentor' ? 'Mentor' : plan === 'ultra' ? 'Ultra' : plan === 'pro' ? 'Pro' : 'Free'}
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

export function AppSidebar() {
  return (
    <Suspense>
      <AppSidebarInner />
    </Suspense>
  );
}
