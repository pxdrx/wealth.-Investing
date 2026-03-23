// lib/macro/apify/types.ts
// TypeScript interfaces for Apify actor outputs

/** Output from pintostudio/economic-calendar-data-investing-com */
export interface InvestingComCalendarEvent {
  id?: string;
  date?: string;           // "YYYY-MM-DD"
  time?: string;           // "HH:MM"
  zone?: string;           // timezone
  event?: string;          // event name / title
  currency?: string;       // e.g. "USD"
  importance?: string;     // "high", "medium", "low"
  actual?: string | null;
  forecast?: string | null;
  previous?: string | null;
  data_type?: string;
  retrieved_at?: string;
}

/** Parsed rate from TE country-list/interest-rate page */
export interface ParsedRate {
  country: string;          // e.g. "Brazil"
  currentRate: number;      // e.g. 14.75
  bankCode: string | null;  // mapped from country name
}

/** Actor IDs we use */
export const APIFY_ACTORS = {
  INVESTING_CALENDAR: "pintostudio/economic-calendar-data-investing-com",
  CHEERIO_SCRAPER: "apify/cheerio-scraper",
  RAG_WEB_BROWSER: "apify/rag-web-browser",
} as const;

/** Map from bank_code to TE country slug */
export const BANK_CODE_TO_TE_SLUG: Record<string, string> = {
  FED: "united-states",
  ECB: "euro-area",
  BOE: "united-kingdom",
  BOJ: "japan",
  BCB: "brazil",
  BOC: "canada",
  RBA: "australia",
  PBOC: "china",
  SNB: "switzerland",
  BANXICO: "mexico",
};
