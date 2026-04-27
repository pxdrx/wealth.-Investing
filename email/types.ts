// trading-dashboard/email/types.ts
// SHARED CONTRACT entre Track A (templates) e Track B (engine).
// Mudanças aqui exigem coordenação entre as 2 sessões.

export type Locale = 'pt-BR' | 'en-US';
export type Plan = 'free' | 'pro' | 'ultra';
export type MarketBias = 'risk-on' | 'risk-off' | 'neutral';
export type Direction = 'long' | 'short';
export type Impact = 'low' | 'med' | 'high';

export interface BriefingEvent {
  time: string;       // 'HH:mm' formato 24h, timezone BRT
  ticker: string;     // 'CPI', 'FOMC', 'BCB', etc
  label: string;      // descrição curta · max 80 chars
  impact: Impact;
}

export interface TradeEntry {
  asset: string;      // 'EURUSD', 'WIN', etc
  direction: Direction;
  pnl: number;        // valor absoluto em USD/BRL
  pnlPct: number;     // percentual sobre risco
  note?: string;      // anotação curta · max 120 chars
}

export interface Principle {
  quote: string;      // 8-14 palavras
  attribution?: string;
}

export interface DailyBriefingProps {
  date: string;                  // ISO yyyy-MM-dd
  locale: Locale;
  plan: Plan;
  marketBias: MarketBias;
  overnight: string;             // 80-120 palavras
  today: BriefingEvent[];        // 3-5 eventos
  tomorrow: string;              // 1 frase
  principle: Principle;
  unsubscribeUrl: string;
  appUrl: string;
}

export interface WeeklyRecapProps {
  date: string;                  // domingo · ISO yyyy-MM-dd
  locale: Locale;
  firstName: string;
  trades: TradeEntry[];
  pnlPct: number;
  winRate: number;
  lesson: string;                // 1-2 frases
  unsubscribeUrl: string;
  appUrl: string;
}

export interface WelcomeProps {
  firstName: string;
  locale: Locale;
  trialEndsAt: string;          // ISO datetime
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
  validUntil?: string;           // ISO datetime
  unsubscribeUrl: string;
  pricingUrl: string;
}
