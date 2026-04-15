// lib/macro/audit/event-matcher.ts
// Loose matching between DB events and external calendar feeds (FF, TE, IC).

const TITLE_NOISE = /\b(m\/m|y\/y|q\/q|mom|yoy|qoq|prel|prelim|preliminary|final|flash|adv|advance|rev|revised|core|ex\.|ex |seasonally adjusted|sa)\b/gi;
const PUNCT = /[().,:;\-–—_/\\[\]{}"']/g;

export function fuzzyTitle(a: string): string {
  return a
    .toLowerCase()
    .replace(PUNCT, " ")
    .replace(TITLE_NOISE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titlesMatch(a: string, b: string): boolean {
  const na = fuzzyTitle(a);
  const nb = fuzzyTitle(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Token overlap: at least 2 tokens in common OR one contains the other.
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = na.split(" ");
  const tbSet = new Set(nb.split(" "));
  let overlap = 0;
  for (const t of ta) if (tbSet.has(t) && t.length > 2) overlap++;
  return overlap >= 2;
}

// ISO-2 country codes the app uses; mapping covers TE country names and IC currency codes.
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  "united states": "US",
  us: "US",
  usa: "US",
  "euro area": "EU",
  "euro zone": "EU",
  eurozone: "EU",
  europe: "EU",
  "european union": "EU",
  "united kingdom": "GB",
  uk: "GB",
  britain: "GB",
  japan: "JP",
  brazil: "BR",
  canada: "CA",
  australia: "AU",
  "new zealand": "NZ",
  china: "CN",
  switzerland: "CH",
  mexico: "MX",
  germany: "DE",
  france: "FR",
  italy: "IT",
  spain: "ES",
};

const CURRENCY_TO_ISO: Record<string, string> = {
  USD: "US",
  EUR: "EU",
  GBP: "GB",
  JPY: "JP",
  BRL: "BR",
  CAD: "CA",
  AUD: "AU",
  NZD: "NZ",
  CNY: "CN",
  CHF: "CH",
  MXN: "MX",
};

export function normalizeCountry(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Already ISO-2
  if (trimmed.length === 2) return trimmed.toUpperCase();
  // Currency code
  if (/^[A-Z]{3}$/.test(trimmed) && CURRENCY_TO_ISO[trimmed]) return CURRENCY_TO_ISO[trimmed];
  const lower = trimmed.toLowerCase();
  if (COUNTRY_NAME_TO_ISO[lower]) return COUNTRY_NAME_TO_ISO[lower];
  return null;
}

export interface MatchableEvent {
  date: string;
  country: string | null;
  title: string;
}

export function matchEvent(a: MatchableEvent, b: MatchableEvent): boolean {
  if (a.date !== b.date) return false;
  const ca = normalizeCountry(a.country);
  const cb = normalizeCountry(b.country);
  if (ca && cb && ca !== cb) return false;
  return titlesMatch(a.title, b.title);
}
