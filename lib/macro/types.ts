// lib/macro/types.ts

export interface EconomicEvent {
  id: string;
  event_uid: string;
  date: string;          // YYYY-MM-DD
  time: string | null;   // HH:MM
  country: string;       // ISO 2-letter
  title: string;
  impact: "high" | "medium" | "low";
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  currency: string | null;
  week_start: string;    // YYYY-MM-DD (Monday)
  created_at: string;
  updated_at: string;
}

export interface WeeklyPanorama {
  id: string;
  week_start: string;
  week_end: string;
  te_briefing_raw: string | null;
  narrative: string;
  regional_analysis: RegionalAnalysis | null;
  market_impacts: MarketImpact[] | null;
  decision_intelligence: DecisionIntelligence | null;
  sentiment: Sentiment | null;
  asset_impacts: AssetImpacts | null;
  is_frozen: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegionalAnalysis {
  americas: RegionSection;
  europe: RegionSection;
  asia_pacific: RegionSection;
}

export interface RegionSection {
  title: string;
  summary: string;
  key_events: string[];
  outlook: "bullish" | "neutral" | "bearish";
}

export interface MarketImpact {
  asset: string;
  direction: "bullish" | "bearish" | "neutral";
  conviction: number;    // 0-100
  rationale: string;
}

export interface DecisionIntelligence {
  base_scenario: Scenario;
  alt_scenario: Scenario;
  conviction_map: ConvictionEntry[];
}

export interface Scenario {
  title: string;
  probability: number;   // 0-100
  description: string;
  key_drivers: string[];
}

export interface ConvictionEntry {
  asset: string;
  direction: "long" | "short" | "neutral";
  conviction: number;    // 0-100
}

export interface Sentiment {
  bullish_pct: number;
  neutral_pct: number;
  bearish_pct: number;
}

export interface AssetImpact {
  bias: "bullish" | "bearish" | "neutral";
  confidence: "alta" | "media" | "baixa";
  reason: string;
  key_levels: string;
}

export interface AssetImpacts {
  indices: AssetImpact;
  gold: AssetImpact;
  btc: AssetImpact;
  dollar: AssetImpact;
}

export interface CentralBankRate {
  id: string;
  bank_code: string;
  bank_name: string;
  country: string;
  current_rate: number;
  last_action: "hold" | "cut" | "hike" | null;
  last_change_bps: number | null;
  last_change_date: string | null;
  next_meeting: string | null;
  updated_at: string;
}

export interface AdaptiveAlert {
  id: string;
  type: "breaking" | "update" | "upcoming";
  title: string;
  description: string | null;
  event_id: string | null;
  week_start: string;
  created_at: string;
}

export interface WeeklySnapshot {
  id: string;
  week_start: string;
  snapshot_data: {
    panorama: WeeklyPanorama;
    events: EconomicEvent[];
    rates: CentralBankRate[];
  };
  created_at: string;
}

// Faireconomy API response shape
export interface FaireconomyEvent {
  title: string;
  country: string;
  date: string;          // "MM-DD-YYYY" or ISO
  impact: string;        // "High", "Medium", "Low", "Holiday"
  forecast: string;
  previous: string;
  actual?: string;
}

// TradingEconomics scraper types
export interface TeCalendarRow {
  date: string;
  time: string | null;
  country: string;
  title: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  importance: "high" | "medium" | "low";
}

export interface TeHeadline {
  title: string;
  timestamp: string | null;
}

export interface TeEnrichedBriefing {
  calendar_actuals: TeCalendarRow[];
  headlines: TeHeadline[];
  week_ahead_editorial: string | null;
  raw_text: string;
}

export interface MacroHeadline {
  id: string;
  source: "forexlive" | "fxstreet" | "reuters" | "truth_social" | "te_headlines" | "trading_economics";
  headline: string;
  summary: string | null;
  author: string | null;
  url: string | null;
  impact: "breaking" | "high" | "medium" | "low";
  published_at: string | null;
  fetched_at: string;
  external_id: string | null;
}
