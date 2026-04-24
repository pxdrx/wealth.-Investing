"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Crown,
  Eye,
  EyeOff,
  Flame,
  Trophy,
} from "lucide-react";
import { useAppT } from "@/hooks/useAppLocale";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { useStreak } from "@/hooks/useStreak";
import { supabase } from "@/lib/supabase/client";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { getMyProfile } from "@/lib/profile";
import { BrandMark } from "@/components/brand/BrandMark";
import { SubscriptionBadge } from "@/components/billing/SubscriptionBadge";
import { useEntitlements } from "@/hooks/use-entitlements";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";
import { getAppNav, footerNavItems } from "@/lib/app-nav";
import { useAppRoles } from "@/lib/hooks/useAppRoles";
import { logout } from "@/lib/auth/logout";
import { emit } from "@/lib/analytics/emit";

interface SidebarConversation {
  id: string;
  title: string;
  updated_at: string;
}

function AppSidebarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const { plan, isProOrAbove } = useEntitlements();
  const { hidden: valuesHidden, toggle: togglePrivacy } = usePrivacy();
  const roles = useAppRoles();
  const t = useAppT();
  const { currentStreak, longestStreak } = useStreak(userId);

  const navLinks = getAppNav({
    isMentor: roles.isMentor,
    isLinkedStudent: roles.isLinkedStudent,
    isAdmin: roles.isAdmin,
  });

  const [coachConversations, setCoachConversations] = useState<SidebarConversation[]>([]);
  const isOnCoachPage = pathname?.startsWith("/app/dexter/coach") ?? false;

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
    let loaded = false;

    async function load() {
      const { data: { session } } = await safeGetSession();
      if (!session) {
        // Initial load with no session — show the bare fallback. After the
        // first successful load, never wipe the name on transient nulls
        // (happens during token refresh when the tab returns from idle).
        if (!loaded) {
          setDisplayName(null);
          setProfileLoading(false);
        }
        return;
      }
      setHasSession(true);
      setUserId(session.user.id);
      try {
        const profile = await getMyProfile();
        const name = profile?.display_name?.trim();
        if (name) {
          setDisplayName(name);
          loaded = true;
          return;
        }
        const meta = session.user.user_metadata;
        const fallback =
          meta?.full_name?.trim() ||
          meta?.name?.trim() ||
          session.user.email?.split("@")[0] ||
          null;
        if (fallback) {
          setDisplayName(fallback);
          loaded = true;
        } else if (!loaded) {
          setDisplayName(null);
        }
      } catch {
        if (!loaded) {
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
    }

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        load();
      } else if (event === "SIGNED_OUT") {
        setDisplayName(null);
        setUserId(null);
        setHasSession(false);
        loaded = false;
      }
    });

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
              title={collapsed ? (link.labelKey ? t(link.labelKey) : link.label) : undefined}
              data-tour-id={`sidebar-${link.id === "dashboard" ? "dashboard" : link.id}`}
              onClick={() => emit("nav_clicked", { id: link.id, surface: "sidebar" })}
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
                  {link.labelKey ? t(link.labelKey) : link.label}
                  {link.highlight && (
                    <Sparkles className="inline-block ml-1.5 h-3 w-3 text-indigo-400 animate-pulse" />
                  )}
                </span>
              )}
            </Link>
            {/* Dexter Coach conversation sub-items */}
            {link.href === "/app/dexter" && isOnCoachPage && !collapsed && coachConversations.length > 0 && (
              <div className="ml-8 space-y-0.5 mt-1 mb-1">
                {coachConversations.map((conv) => {
                  const isActiveConv = isOnCoachPage && searchParams.get("chat") === conv.id;
                  return (
                    <Link
                      key={conv.id}
                      href={`/app/dexter/coach?chat=${conv.id}`}
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
            onClick={() => emit("ultra_upgrade_clicked", { source: "sidebar", variant: "expanded" })}
            className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
          >
            <Crown className="h-4 w-4" />
            {t("sidebar.goPro")}
          </Link>
        </div>
      )}
      {!isProOrAbove && collapsed && (
        <div className="flex justify-center pb-2">
          <Link
            href="/app/pricing"
            title={t("sidebar.goPro")}
            onClick={() => emit("ultra_upgrade_clicked", { source: "sidebar", variant: "collapsed" })}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
          >
            <Crown className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Bottom Actions / User Section */}
      <div className="p-4 border-t border-border/40 bg-background/20 space-y-2">
        <div className="flex flex-col gap-1">
          {footerNavItems.map((item) => {
            const Icon = item.icon;
            if (item.id === "feedback") {
              return (
                <FeedbackDialog
                  key={item.id}
                  trigger={
                    <span
                      title={collapsed ? (item.labelKey ? t(item.labelKey) : item.label) : undefined}
                      onClick={() => emit("nav_clicked", { id: item.id, surface: "sidebar-footer" })}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200 cursor-pointer"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm font-medium">{item.labelKey ? t(item.labelKey) : item.label}</span>}
                    </span>
                  }
                />
              );
            }
            return (
              <Link
                key={item.id}
                href={item.href}
                title={collapsed ? (item.labelKey ? t(item.labelKey) : item.label) : undefined}
                onClick={() => emit("nav_clicked", { id: item.id, surface: "sidebar-footer" })}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.labelKey ? t(item.labelKey) : item.label}</span>}
              </Link>
            );
          })}

          <button
            onClick={togglePrivacy}
            title={collapsed ? (valuesHidden ? t("sidebar.showValues") : t("sidebar.hideValues")) : undefined}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200 w-full"
          >
            {valuesHidden ? <EyeOff className="h-4 w-4 shrink-0" /> : <Eye className="h-4 w-4 shrink-0" />}
            {!collapsed && (
              <span className="text-sm font-medium">
                {valuesHidden ? t("sidebar.showValues") : t("sidebar.hideValues")}
              </span>
            )}
          </button>

          <button
            onClick={() => { emit("logout_clicked", { surface: "sidebar" }); logout(); }}
            title={collapsed ? t("sidebar.logout") : undefined}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 w-full"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{t("sidebar.logout")}</span>}
          </button>
        </div>

        {/* Theme control — own row, above user card.
            Locale switcher moved to /app/settings > Preferências (D2-04 / [H1]). */}
        {!collapsed && (
          <div className="mt-2 flex items-center justify-end gap-2 px-1">
            <ThemeToggle />
          </div>
        )}
        {collapsed && (
          <div className="mt-2 flex justify-center">
            <ThemeToggle />
          </div>
        )}

        {/* User Card */}
        {hasSession && (() => {
          const tierLabel =
            plan === "mentor"
              ? `${t("sidebar.terminal")} ${t("sidebar.tier.mentor")}`
              : plan === "ultra"
              ? `${t("sidebar.terminal")} ${t("sidebar.tier.ultra")}`
              : plan === "pro"
              ? `${t("sidebar.terminal")} ${t("sidebar.tier.pro")}`
              : `${t("sidebar.terminal")} ${t("sidebar.tier.free")}`;
          const tooltipLabel = [displayName ?? t("sidebar.operator"), tierLabel]
            .filter(Boolean)
            .join(" · ");
          const showStreakRow = !collapsed && (currentStreak > 0 || longestStreak > 0);

          return (
            <div
              className={cn(
                "mt-3 rounded-xl border border-border/30 bg-muted/20 p-3 transition-all",
                collapsed ? "flex justify-center" : "flex flex-col gap-2",
              )}
              title={collapsed ? tooltipLabel : undefined}
            >
              {/* Row 1 — avatar + nome + tier */}
              <div className={cn("flex items-center gap-3 min-w-0", collapsed && "gap-0")}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
                  {initials}
                </div>
                {!collapsed && (
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate text-sm font-medium text-foreground">
                        {profileLoading ? t("sidebar.loading") : (displayName ?? t("sidebar.operator"))}
                      </span>
                      {!profileLoading && (
                        <SubscriptionBadge className="shrink-0 text-[9px] h-4 leading-none flex items-center px-1.5" />
                      )}
                    </div>
                    <span className="truncate text-xs text-muted-foreground">
                      {tierLabel}
                    </span>
                  </div>
                )}
              </div>

              {/* Row 2 — streak (only when expanded and data exists) */}
              {showStreakRow && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {currentStreak > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-orange-500" aria-hidden />
                      <span className="tabular-nums">
                        {currentStreak} {currentStreak === 1 ? t("sidebar.dayOne") : t("sidebar.dayMany")}
                      </span>
                    </span>
                  )}
                  {longestStreak > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                      <span className="tabular-nums">
                        {t("sidebar.record")}: {longestStreak}
                        {longestStreak === 1 ? "d" : "d"}
                      </span>
                    </span>
                  )}
                </div>
              )}

            </div>
          );
        })()}
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
