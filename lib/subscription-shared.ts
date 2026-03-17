export type Plan = "free" | "pro" | "elite";
export type SubStatus = "active" | "canceled" | "past_due" | "trialing" | "incomplete";

export interface TierLimits {
  maxTrades: number | null;
  maxAccounts: number | null;
  aiCoachMonthly: number;
  aiCoachDaily: number | null;
  hasExportCsv: boolean;
  hasCtrader: boolean;
  hasDashboardOverview: boolean;
  hasAccountComparison: boolean;
  hasCustomAlerts: boolean;
  hasPrioritySupport: boolean;
}

const TIER_LIMITS: Record<Plan, TierLimits> = {
  free: {
    maxTrades: 30,
    maxAccounts: 2,
    aiCoachMonthly: 1,
    aiCoachDaily: null,
    hasExportCsv: false,
    hasCtrader: false,
    hasDashboardOverview: false,
    hasAccountComparison: false,
    hasCustomAlerts: false,
    hasPrioritySupport: false,
  },
  pro: {
    maxTrades: null,
    maxAccounts: 5,
    aiCoachMonthly: 10,
    aiCoachDaily: null,
    hasExportCsv: true,
    hasCtrader: true,
    hasDashboardOverview: true,
    hasAccountComparison: false,
    hasCustomAlerts: false,
    hasPrioritySupport: false,
  },
  elite: {
    maxTrades: null,
    maxAccounts: null,
    aiCoachMonthly: 150,
    aiCoachDaily: 5,
    hasExportCsv: true,
    hasCtrader: true,
    hasDashboardOverview: true,
    hasAccountComparison: true,
    hasCustomAlerts: true,
    hasPrioritySupport: true,
  },
};

export function getTierLimits(plan: Plan): TierLimits {
  return TIER_LIMITS[plan];
}

export function isProOrAbove(plan: Plan): boolean {
  return plan === "pro" || plan === "elite";
}

export function isElite(plan: Plan): boolean {
  return plan === "elite";
}
