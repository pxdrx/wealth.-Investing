"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/brand/BrandMark";
import { SubscriptionBadge } from "@/components/billing/SubscriptionBadge";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { getMyProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { getAppNav, footerNavItems } from "@/lib/app-nav";
import { useAppRoles } from "@/lib/hooks/useAppRoles";
import { logout } from "@/lib/auth/logout";
import { emit } from "@/lib/analytics/emit";

const easeApple = [0.16, 1, 0.3, 1] as const;

function UserAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "U";
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-foreground shadow-sm"
      style={{ background: "hsl(var(--muted))" }}
    >
      {initials}
    </span>
  );
}

// Mobile-only top bar. Desktop renders AppSidebar; this component's job is
// brand affordance + drawer trigger for items that don't fit in the bottom
// tab bar (Contas, Settings, Planos, Feedback, Sair).
export function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const roles = useAppRoles();

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    let loaded = false;
    async function load() {
      const { data: { session } } = await safeGetSession();
      if (!session) {
        if (!loaded) {
          setHasSession(false);
          setDisplayName(null);
        }
        return;
      }
      setHasSession(true);
      try {
        const profile = await getMyProfile();
        const name = profile?.display_name?.trim();
        if (name) {
          setDisplayName(name);
          loaded = true;
          return;
        }
        const meta = session.user.user_metadata;
        setDisplayName(
          meta?.full_name?.trim() ||
            meta?.name?.trim() ||
            session.user.email?.split("@")[0] ||
            null,
        );
        loaded = true;
      } catch {
        // silent — display name is non-critical for the header
      }
    }
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") load();
      else if (event === "SIGNED_OUT") {
        setHasSession(false);
        setDisplayName(null);
        loaded = false;
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Drawer items = everything NOT on the mobile bottom bar (e.g. Contas, Admin
  // when admin isn't already surfaced) plus the footer links.
  const drawerNav = getAppNav({
    isMentor: roles.isMentor,
    isLinkedStudent: roles.isLinkedStudent,
    isAdmin: roles.isAdmin,
  }).filter((item) => !item.mobileBar);

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full border-b border-border/40 backdrop-blur-md"
        style={{ backgroundColor: "hsl(var(--background) / 0.95)" }}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/app" className="flex items-baseline" onClick={() => emit("nav_clicked", { id: "brand", surface: "mobile-header" })}>
            <BrandMark />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.button
              type="button"
              aria-label="Fechar menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: easeApple }}
              className="fixed right-0 top-0 bottom-0 z-[70] w-[84%] max-w-[340px] border-l border-border/60 md:hidden flex flex-col isolate"
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              <div className="flex items-center justify-between px-5 h-14 border-b border-border/40">
                <span className="text-sm font-semibold text-foreground">Menu</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {hasSession && (
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
                  <UserAvatar name={displayName ?? "U"} />
                  <div className="flex flex-col min-w-0 gap-0.5">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {displayName ?? "Operador"}
                    </span>
                    <SubscriptionBadge className="self-start text-[10px] h-4 leading-none px-1.5" />
                  </div>
                </div>
              )}

              <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
                {drawerNav.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/app"
                      ? pathname === "/app"
                      : pathname === item.href || pathname?.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => emit("nav_clicked", { id: item.id, surface: "mobile-drawer" })}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}

                <div className="my-2 h-px bg-border/40" />

                {footerNavItems.map((item) => {
                  const Icon = item.icon;
                  if (item.id === "feedback") {
                    return (
                      <FeedbackDialog
                        key={item.id}
                        trigger={
                          <span
                            onClick={() => emit("nav_clicked", { id: item.id, surface: "mobile-drawer" })}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </span>
                        }
                      />
                    );
                  }
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => emit("nav_clicked", { id: item.id, surface: "mobile-drawer" })}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}

                <button
                  type="button"
                  onClick={() => { emit("logout_clicked", { surface: "mobile-drawer" }); logout(); }}
                  className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Sair
                </button>
              </nav>

              <div className="flex items-center justify-end px-5 py-3 border-t border-border/40">
                <ThemeToggle />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
