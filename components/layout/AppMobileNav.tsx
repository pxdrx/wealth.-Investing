"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  LineChart,
  Scan,
  BrainCircuit,
  GraduationCap,
  Shield,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const baseNavItems: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/journal", label: "Journal", icon: BookOpen },
  { href: "/app/macro", label: "Macro", icon: LineChart },
  { href: "/app/analyst", label: "Analista", icon: Scan },
  { href: "/app/ai-coach", label: "AI Coach", icon: BrainCircuit },
];

const mentorNavItem: NavItem = { href: "/app/mentor", label: "Mentor", icon: GraduationCap };
const adminNavItem: NavItem = { href: "/app/admin", label: "Admin", icon: Shield };

const easeApple = [0.16, 1, 0.3, 1] as const;

export function AppMobileNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const safety = setTimeout(() => { /* noop */ }, 8000);
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
        // silently ignore
      }
    }
    checkAdmin();
    return () => { cancelled = true; clearTimeout(safety); };
  }, []);

  const navItems = [
    ...baseNavItems,
    mentorNavItem,
    ...(isAdmin ? [adminNavItem] : []),
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden isolate border-t"
      style={{
        backgroundColor: "hsl(var(--card) / 0.85)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderColor: "hsl(var(--border))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/app"
              ? pathname === "/app"
              : pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour-id={`mobile-${item.href.replace("/app/", "").replace("/app", "dashboard")}`}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-3 py-1 rounded-xl transition-colors duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-tab-indicator"
                  className="absolute inset-0 rounded-xl"
                  style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.8 }}
                />
              )}
              <Icon
                className={cn(
                  "h-[22px] w-[22px] relative z-10 transition-transform duration-200",
                  isActive && "scale-110"
                )}
              />
              <span
                className={cn(
                  "text-[10px] leading-tight relative z-10 font-medium truncate max-w-[56px] text-center",
                  isActive && "font-semibold"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
