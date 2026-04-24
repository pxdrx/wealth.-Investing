import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Bot,
  CandlestickChart,
  CreditCard,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Settings,
  Shield,
  Wallet,
} from "lucide-react";
import type { AppMessageKey } from "@/lib/i18n/app";

export interface AppNavItem {
  id: string;
  href: string;
  /** PT fallback string — rendered if no active locale / labelKey missing. */
  label: string;
  /** i18n key in `lib/i18n/app.ts` for the full label. Consumers should
   *  prefer `labelKey` (via `useAppT`) over `label` for display. */
  labelKey?: AppMessageKey;
  // Compact label for the mobile bottom tab bar. Falls back to `label`.
  shortLabel?: string;
  /** i18n key for the compact label used in the mobile bottom tab bar. */
  shortLabelKey?: AppMessageKey;
  icon: LucideIcon;
  // Appears on the mobile bottom tab bar. Items without this flag still
  // render on the desktop rail and inside the mobile drawer.
  mobileBar?: boolean;
  highlight?: boolean;
}

export interface AppNavContext {
  isMentor: boolean;
  isLinkedStudent: boolean;
  isAdmin: boolean;
}

// Single source of truth for the app-shell nav. Array order IS the
// desktop-rail render order. Consumers:
//   - AppSidebar (desktop rail) renders every item in order
//   - AppMobileNav (bottom tab bar) filters to items with mobileBar === true
//   - AppHeader drawer (mobile) renders everything NOT on the mobile bar
//
// IDs are stable analytics keys — do not rename without updating emitted events.
export function getAppNav(ctx: AppNavContext): AppNavItem[] {
  const mentorLabel = ctx.isMentor
    ? "Painel Mentor"
    : ctx.isLinkedStudent
    ? "Mentor"
    : "Mentoria";
  const mentorLabelKey: AppMessageKey = ctx.isMentor
    ? "sidebar.nav.mentorPanel"
    : ctx.isLinkedStudent
    ? "sidebar.nav.mentorStudent"
    : "sidebar.nav.mentor";

  const items: AppNavItem[] = [
    { id: "dashboard", href: "/app", label: "Dashboard", labelKey: "sidebar.nav.dashboard", icon: LayoutDashboard, mobileBar: true },
    { id: "journal", href: "/app/journal", label: "Trade Journal", labelKey: "sidebar.nav.journal", shortLabel: "Journal", shortLabelKey: "sidebar.nav.short.journal", icon: BookOpen, mobileBar: true },
    { id: "mentor", href: "/app/mentor", label: mentorLabel, labelKey: mentorLabelKey, shortLabel: ctx.isMentor ? "Painel" : "Mentor", shortLabelKey: ctx.isMentor ? "sidebar.nav.short.mentorPanel" : "sidebar.nav.short.mentor", icon: GraduationCap, mobileBar: true },
    { id: "prop", href: "/app/prop", label: "Contas", labelKey: "sidebar.nav.prop", icon: Wallet },
    { id: "chart", href: "/app/chart", label: "Gráfico", labelKey: "sidebar.nav.chart", icon: CandlestickChart },
    { id: "backtest", href: "/app/backtest", label: "Backtest", labelKey: "sidebar.nav.backtest", icon: FlaskConical },
    { id: "macro", href: "/app/macro", label: "Inteligência Macro", labelKey: "sidebar.nav.macro", shortLabel: "Macro", shortLabelKey: "sidebar.nav.short.macro", icon: LineChart, mobileBar: true, highlight: true },
    { id: "dexter", href: "/app/dexter", label: "Dexter", labelKey: "sidebar.nav.dexter", icon: Bot, mobileBar: true, highlight: true },
  ];

  if (ctx.isAdmin) {
    items.push({ id: "admin", href: "/app/admin", label: "Admin", labelKey: "sidebar.nav.admin", icon: Shield, mobileBar: true });
  }

  return items;
}

// Footer rail items (Settings, Planos, Feedback). Rendered separately from
// the scrollable nav so they pin to the bottom. Sair/logout is handled as
// a <button> since it's not a route. Also surfaced in the mobile drawer.
export interface AppFooterItem {
  id: string;
  href: string;
  /** PT fallback string — consumers should resolve `labelKey` first. */
  label: string;
  labelKey?: AppMessageKey;
  icon: LucideIcon;
}

export const footerNavItems: AppFooterItem[] = [
  { id: "settings", href: "/app/settings", label: "Configurações", labelKey: "sidebar.nav.settings", icon: Settings },
  { id: "pricing", href: "/app/pricing", label: "Planos", labelKey: "sidebar.nav.plans", icon: CreditCard },
  { id: "feedback", href: "#feedback", label: "Feedback", labelKey: "sidebar.nav.feedback", icon: MessageSquare },
];
