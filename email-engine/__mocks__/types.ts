// Mirror of email/types.ts (Track A shared contract).
// MOCK ONLY — once Track A merges email/types.ts at repo root,
// swap imports across email-engine/** from './__mocks__/types' to '@/email/types'.

export type Locale = "pt-BR" | "en-US";
export type Plan = "free" | "pro" | "ultra";
export type MarketBias = "risk-on" | "risk-off" | "neutral";
export type Direction = "long" | "short";
export type Impact = "low" | "med" | "high";

export interface BriefingEvent {
  time: string;
  ticker: string;
  label: string;
  impact: Impact;
}

export interface TradeEntry {
  asset: string;
  direction: Direction;
  pnl: number;
  pnlPct: number;
  note?: string;
}

export interface Principle {
  quote: string;
  attribution?: string;
}

export interface DailyBriefingProps {
  date: string;
  locale: Locale;
  plan: Plan;
  marketBias: MarketBias;
  overnight: string;
  today: BriefingEvent[];
  tomorrow: string;
  principle: Principle;
  unsubscribeUrl: string;
  appUrl: string;
}

export interface WeeklyRecapProps {
  date: string;
  locale: Locale;
  firstName: string;
  trades: TradeEntry[];
  pnlPct: number;
  winRate: number;
  lesson: string;
  unsubscribeUrl: string;
  appUrl: string;
}

export interface WelcomeProps {
  firstName: string;
  locale: Locale;
  trialEndsAt: string;
  unsubscribeUrl: string;
  appUrl: string;
}

export interface UpgradeProps {
  firstName: string;
  locale: Locale;
  currentPlan: Plan;
  targetPlan: Plan;
  couponCode?: string;
  couponPctOff?: number;
  validUntil?: string;
  unsubscribeUrl: string;
  pricingUrl: string;
}

export type TemplateId =
  | "daily-briefing"
  | "weekly-recap"
  | "welcome.day0"
  | "welcome.day1"
  | "welcome.day2"
  | "welcome.day3"
  | "welcome.day5"
  | "welcome.day6"
  | "welcome.day7"
  | "upgrade.day0"
  | "upgrade.day7"
  | "upgrade.day14"
  | "churn.day0"
  | "churn.day14"
  | "opt-in-confirm";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export type TemplatePropsMap = {
  "daily-briefing": DailyBriefingProps;
  "weekly-recap": WeeklyRecapProps;
  "welcome.day0": WelcomeProps;
  "welcome.day1": WelcomeProps;
  "welcome.day2": WelcomeProps;
  "welcome.day3": WelcomeProps;
  "welcome.day5": WelcomeProps;
  "welcome.day6": WelcomeProps;
  "welcome.day7": WelcomeProps & { couponCode?: string; couponPctOff?: number };
  "upgrade.day0": UpgradeProps;
  "upgrade.day7": UpgradeProps;
  "upgrade.day14": UpgradeProps;
  "churn.day0": { firstName: string; locale: Locale; unsubscribeUrl: string; appUrl: string };
  "churn.day14": { firstName: string; locale: Locale; unsubscribeUrl: string; appUrl: string; couponCode?: string; couponPctOff?: number };
  "opt-in-confirm": { firstName: string; locale: Locale; confirmUrl: string };
};
