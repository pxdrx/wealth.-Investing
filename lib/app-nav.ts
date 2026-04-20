import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  BrainCircuit,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Scan,
  Settings,
  Shield,
  Wallet,
} from "lucide-react";

export interface AppNavItem {
  id: string;
  href: string;
  label: string;
  // Compact label for the mobile bottom tab bar. Falls back to `label`.
  shortLabel?: string;
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

  const items: AppNavItem[] = [
    { id: "dashboard", href: "/app", label: "Dashboard", icon: LayoutDashboard, mobileBar: true },
    { id: "journal", href: "/app/journal", label: "Trade Journal", shortLabel: "Journal", icon: BookOpen, mobileBar: true },
    { id: "mentor", href: "/app/mentor", label: mentorLabel, shortLabel: ctx.isMentor ? "Painel" : "Mentor", icon: GraduationCap, mobileBar: true },
    { id: "prop", href: "/app/prop", label: "Contas", icon: Wallet },
    { id: "macro", href: "/app/macro", label: "Inteligência Macro", shortLabel: "Macro", icon: LineChart, mobileBar: true, highlight: true },
    { id: "analyst", href: "/app/analyst", label: "Analista Dexter", shortLabel: "Analista", icon: Scan, mobileBar: true, highlight: true },
    { id: "ai-coach", href: "/app/ai-coach", label: "AI Coach", icon: BrainCircuit, mobileBar: true, highlight: true },
  ];

  if (ctx.isAdmin) {
    items.push({ id: "admin", href: "/app/admin", label: "Admin", icon: Shield, mobileBar: true });
  }

  return items;
}

// Footer rail items (Settings, Planos, Feedback). Rendered separately from
// the scrollable nav so they pin to the bottom. Sair/logout is handled as
// a <button> since it's not a route. Also surfaced in the mobile drawer.
export interface AppFooterItem {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
}

export const footerNavItems: AppFooterItem[] = [
  { id: "settings", href: "/app/settings", label: "Configurações", icon: Settings },
  { id: "pricing", href: "/app/pricing", label: "Planos", icon: CreditCard },
  { id: "feedback", href: "#feedback", label: "Feedback", icon: MessageSquare },
];
