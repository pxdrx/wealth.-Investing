"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getAppNav } from "@/lib/app-nav";
import { useAppRoles } from "@/lib/hooks/useAppRoles";
import { emit } from "@/lib/analytics/emit";
import { useAppT } from "@/hooks/useAppLocale";

export function AppMobileNav() {
  const pathname = usePathname();
  const roles = useAppRoles();
  const t = useAppT();

  const navItems = getAppNav({
    isMentor: roles.isMentor,
    isLinkedStudent: roles.isLinkedStudent,
    isAdmin: roles.isAdmin,
  }).filter((item) => item.mobileBar);

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
          const label = item.shortLabelKey
            ? t(item.shortLabelKey)
            : item.labelKey
            ? t(item.labelKey)
            : item.shortLabel ?? item.label;

          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour-id={`mobile-${item.id === "dashboard" ? "dashboard" : item.id}`}
              onClick={() => emit("nav_clicked", { id: item.id, surface: "mobile-bar" })}
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
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
