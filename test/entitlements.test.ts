import { describe, it, expect } from "vitest";
import {
  hasAccess,
  getTierLimits,
  isProOrAbove,
  isUltra,
  isMentor,
  type Feature,
  type Plan,
} from "@/lib/entitlements";

/**
 * Ground-truth feature × tier matrix (see docs/design-mvp-revenue.md
 * + PricingCards feature lists). Any change here must be accompanied
 * by a change in lib/subscription-shared.ts TIER_LIMITS.
 */
const EXPECTED: Record<Feature, Record<Plan, boolean>> = {
  dashboardOverview:  { free: false, pro: true,  ultra: true,  mentor: true  },
  accountComparison:  { free: false, pro: false, ultra: true,  mentor: true  },
  macroIntelligence:  { free: false, pro: true,  ultra: true,  mentor: true  },
  reports:            { free: false, pro: true,  ultra: true,  mentor: true  },
  psychology:         { free: false, pro: false, ultra: true,  mentor: true  },
  headlines:          { free: false, pro: true,  ultra: true,  mentor: true  },
  exportCsv:          { free: false, pro: true,  ultra: true,  mentor: true  },
  ctrader:            { free: false, pro: true,  ultra: true,  mentor: true  },
  advancedReports:    { free: false, pro: false, ultra: true,  mentor: true  },
  pdfExport:          { free: false, pro: false, ultra: true,  mentor: true  },
  historyMacro:       { free: false, pro: false, ultra: true,  mentor: true  },
  regenerateReport:   { free: false, pro: false, ultra: true,  mentor: true  },
  liveMonitoring:     { free: false, pro: false, ultra: true,  mentor: true  },
  customAlerts:       { free: false, pro: false, ultra: true,  mentor: true  },
  prioritySupport:    { free: false, pro: false, ultra: true,  mentor: true  },
  dexterTodayCard:    { free: true,  pro: true,  ultra: true,  mentor: true  },
  dexterTradeDebrief: { free: false, pro: true,  ultra: true,  mentor: true  },
};

const ALL_PLANS: Plan[] = ["free", "pro", "ultra", "mentor"];

describe("entitlements — hasAccess feature × tier matrix", () => {
  for (const [feature, row] of Object.entries(EXPECTED) as [Feature, Record<Plan, boolean>][]) {
    for (const plan of ALL_PLANS) {
      const expected = row[plan];
      it(`${feature} on ${plan} → ${expected}`, () => {
        expect(hasAccess(plan, feature)).toBe(expected);
      });
    }
  }
});

describe("entitlements — tier limits", () => {
  it("free: 10 trades, 1 account, 3 AI Coach/month", () => {
    const l = getTierLimits("free");
    expect(l.maxTrades).toBe(10);
    expect(l.maxAccounts).toBe(1);
    expect(l.aiCoachMonthly).toBe(3);
    expect(l.aiCoachDaily).toBeNull();
  });

  it("pro: unlimited trades, 5 accounts, 15 AI Coach/month", () => {
    const l = getTierLimits("pro");
    expect(l.maxTrades).toBeNull();
    expect(l.maxAccounts).toBe(5);
    expect(l.aiCoachMonthly).toBe(15);
    expect(l.aiCoachDaily).toBeNull();
  });

  it("ultra: unlimited trades/accounts, 15 AI Coach/day", () => {
    const l = getTierLimits("ultra");
    expect(l.maxTrades).toBeNull();
    expect(l.maxAccounts).toBeNull();
    expect(l.aiCoachDaily).toBe(15);
  });

  it("mentor: matches ultra limits", () => {
    const ultra = getTierLimits("ultra");
    const mentor = getTierLimits("mentor");
    expect(mentor).toEqual(ultra);
  });
});

describe("entitlements — tier guards", () => {
  it("isProOrAbove: pro, ultra, mentor → true; free → false", () => {
    expect(isProOrAbove("free")).toBe(false);
    expect(isProOrAbove("pro")).toBe(true);
    expect(isProOrAbove("ultra")).toBe(true);
    expect(isProOrAbove("mentor")).toBe(true);
  });

  it("isUltra: ultra, mentor → true; pro, free → false", () => {
    expect(isUltra("free")).toBe(false);
    expect(isUltra("pro")).toBe(false);
    expect(isUltra("ultra")).toBe(true);
    expect(isUltra("mentor")).toBe(true);
  });

  it("isMentor: mentor only", () => {
    expect(isMentor("free")).toBe(false);
    expect(isMentor("pro")).toBe(false);
    expect(isMentor("ultra")).toBe(false);
    expect(isMentor("mentor")).toBe(true);
  });
});
