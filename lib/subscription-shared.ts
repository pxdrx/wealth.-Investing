export type Plan = "free" | "pro" | "ultra" | "mentor";
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
  hasMacroIntelligence: boolean;
  hasReports: boolean;
  hasPsychology: boolean;
  hasHeadlines: boolean;
  hasAdvancedReports: boolean;
  hasPdfExport: boolean;
  hasHistoryMacro: boolean;
  hasRegenerateReport: boolean;
  hasLiveMonitoring: boolean;
  hasDexterTodayCard: boolean;
  hasDexterTradeDebrief: boolean;
}

const TIER_LIMITS: Record<Plan, TierLimits> = {
  free: {
    maxTrades: 10,
    maxAccounts: 1,
    aiCoachMonthly: 3,
    aiCoachDaily: null,
    hasExportCsv: false,
    hasCtrader: false,
    hasDashboardOverview: false,
    hasAccountComparison: false,
    hasCustomAlerts: false,
    hasPrioritySupport: false,
    hasMacroIntelligence: false,
    hasReports: false,
    hasPsychology: false,
    hasHeadlines: false,
    hasAdvancedReports: false,
    hasPdfExport: false,
    hasHistoryMacro: false,
    hasRegenerateReport: false,
    hasLiveMonitoring: false,
    hasDexterTodayCard: true,
    hasDexterTradeDebrief: false,
  },
  pro: {
    maxTrades: null,
    maxAccounts: 5,
    aiCoachMonthly: 15,
    aiCoachDaily: null,
    hasExportCsv: true,
    hasCtrader: true,
    hasDashboardOverview: true,
    hasAccountComparison: false,
    hasCustomAlerts: false,
    hasPrioritySupport: false,
    hasMacroIntelligence: true,
    hasReports: true,
    hasPsychology: false,
    hasHeadlines: true,
    hasAdvancedReports: false,
    hasPdfExport: false,
    hasHistoryMacro: false,
    hasRegenerateReport: false,
    hasLiveMonitoring: false,
    hasDexterTodayCard: true,
    hasDexterTradeDebrief: true,
  },
  ultra: {
    maxTrades: null,
    maxAccounts: null,
    aiCoachMonthly: 450,
    aiCoachDaily: 15,
    hasExportCsv: true,
    hasCtrader: true,
    hasDashboardOverview: true,
    hasAccountComparison: true,
    hasCustomAlerts: true,
    hasPrioritySupport: true,
    hasMacroIntelligence: true,
    hasReports: true,
    hasPsychology: true,
    hasHeadlines: true,
    hasAdvancedReports: true,
    hasPdfExport: true,
    hasHistoryMacro: true,
    hasRegenerateReport: true,
    hasLiveMonitoring: true,
    hasDexterTodayCard: true,
    hasDexterTradeDebrief: true,
  },
  mentor: {
    maxTrades: null,
    maxAccounts: null,
    aiCoachMonthly: 450,
    aiCoachDaily: 15,
    hasExportCsv: true,
    hasCtrader: true,
    hasDashboardOverview: true,
    hasAccountComparison: true,
    hasCustomAlerts: true,
    hasPrioritySupport: true,
    hasMacroIntelligence: true,
    hasReports: true,
    hasPsychology: true,
    hasHeadlines: true,
    hasAdvancedReports: true,
    hasPdfExport: true,
    hasHistoryMacro: true,
    hasRegenerateReport: true,
    hasLiveMonitoring: true,
    hasDexterTodayCard: true,
    hasDexterTradeDebrief: true,
  },
};

export function getTierLimits(plan: Plan): TierLimits {
  return TIER_LIMITS[plan];
}

export function isProOrAbove(plan: Plan): boolean {
  return plan === "pro" || plan === "ultra" || plan === "mentor";
}

export function isUltra(plan: Plan): boolean {
  return plan === "ultra" || plan === "mentor";
}

export function isMentor(plan: Plan): boolean {
  return plan === "mentor";
}
