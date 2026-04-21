// Canonical entitlements API (Track C).
// Consumed by app/UI (via hooks/use-entitlements), Track A (brand UI gating),
// and Track B (landing CTA gating).
//
// ── Plan vs. SubStatus ───────────────────────────────────────────────────────
// `hasAccess(plan, feature)` is a PURE function over an already-coerced Plan.
// The Plan → SubStatus coercion happens upstream in SubscriptionContext:
//
//   active     → plan honored      (subscription.plan returned as-is)
//   trialing   → plan honored      (treated identically to active)
//   past_due   → coerced to "free" (access revoked until payment recovers)
//   canceled   → coerced to "free"
//   incomplete → coerced to "free"
//
// Source: components/context/SubscriptionContext.tsx — the ternary
//   (status === "active" || status === "trialing") ? plan : "free"
//
// NOTE (assumido, confirmar com humano): past_due revokes access immediately
// in the current code. Some billing flows grant a grace period before revoking —
// if that policy changes, update the coercion in SubscriptionContext, not here.
// `hasAccess` itself intentionally does not inspect status.

import {
  getTierLimits,
  isMentor,
  isProOrAbove,
  isUltra,
  type Plan,
  type SubStatus,
  type TierLimits,
} from "./subscription-shared";

export { getTierLimits, isMentor, isProOrAbove, isUltra };
export type { Plan, SubStatus, TierLimits };

export type Feature =
  | "dashboardOverview"
  | "accountComparison"
  | "macroIntelligence"
  | "reports"
  | "psychology"
  | "headlines"
  | "exportCsv"
  | "ctrader"
  | "advancedReports"
  | "pdfExport"
  | "historyMacro"
  | "regenerateReport"
  | "liveMonitoring"
  | "customAlerts"
  | "prioritySupport"
  | "dexterTodayCard"
  | "dexterTradeDebrief";

const FEATURE_TO_LIMIT_KEY: Record<Feature, keyof TierLimits> = {
  dashboardOverview: "hasDashboardOverview",
  accountComparison: "hasAccountComparison",
  macroIntelligence: "hasMacroIntelligence",
  reports: "hasReports",
  psychology: "hasPsychology",
  headlines: "hasHeadlines",
  exportCsv: "hasExportCsv",
  ctrader: "hasCtrader",
  advancedReports: "hasAdvancedReports",
  pdfExport: "hasPdfExport",
  historyMacro: "hasHistoryMacro",
  regenerateReport: "hasRegenerateReport",
  liveMonitoring: "hasLiveMonitoring",
  customAlerts: "hasCustomAlerts",
  prioritySupport: "hasPrioritySupport",
  dexterTodayCard: "hasDexterTodayCard",
  dexterTradeDebrief: "hasDexterTradeDebrief",
};

export function hasAccess(plan: Plan, feature: Feature): boolean {
  const limits = getTierLimits(plan);
  const key = FEATURE_TO_LIMIT_KEY[feature];
  return Boolean(limits[key]);
}
