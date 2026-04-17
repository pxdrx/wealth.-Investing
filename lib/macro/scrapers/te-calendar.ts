// lib/macro/scrapers/te-calendar.ts
// TradingEconomics calendar (guest API) — fallback on-demand quando FF devolve
// null para um evento cujo release_time ja passou.
// NAO e cron. E utilitario chamado pelo AI Coach.
// Retorna [] em caso de falha (nunca throws).

import { fetchWithTimeout } from "./utils";

interface TECalendarItem {
  CalendarId?: string | number;
  Date?: string;        // ISO "2026-04-17T12:30:00"
  Country?: string;
  Category?: string;
  Event?: string;
  Reference?: string;
  Source?: string;
  SourceURL?: string;
  Actual?: string | null;
  Previous?: string | null;
  Forecast?: string | null;
  TEForecast?: string | null;
  URL?: string;
  DateSpan?: string;
  Importance?: number;
  LastUpdate?: string;
  Revised?: string | null;
  Currency?: string;
  Unit?: string;
  Ticker?: string;
  Symbol?: string;
}

export interface TECalendarActual {
  event: string;
  country: string;
  actual: string | null;
  release_time: string; // ISO 8601
  forecast: string | null;
  previous: string | null;
  importance: number | null;
}

/**
 * Converte Date -> "YYYY-MM-DD" em UTC (formato aceito pela TE API).
 */
function toYMD(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Busca actuals do calendario TradingEconomics para uma data especifica.
 * Usa endpoint guest publico (sem chave). Se TE_API_KEY estiver setado, usa.
 *
 * Timeout 6s. Retorna [] em qualquer falha — chamador decide fallback.
 */
export async function fetchTECalendarActuals(
  date: Date
): Promise<TECalendarActual[]> {
  try {
    const ymd = toYMD(date);
    const apiKey = process.env.TE_API_KEY || "guest:guest";

    // Endpoint oficial TE: /calendar/country/all/{d1}/{d2}?c=<creds>&f=json
    const url = `https://api.tradingeconomics.com/calendar/country/all/${ymd}/${ymd}?c=${encodeURIComponent(apiKey)}&f=json`;

    console.log(`[te-calendar] Fetching actuals for ${ymd}...`);

    const res = await fetchWithTimeout(url, 6000, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; wealth.Investing/1.0)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`[te-calendar] TE API returned ${res.status}`);
      return [];
    }

    const items = (await res.json()) as TECalendarItem[];
    if (!Array.isArray(items) || items.length === 0) {
      console.warn("[te-calendar] TE API returned no items");
      return [];
    }

    const results: TECalendarActual[] = [];
    for (const item of items) {
      const event = item.Event?.trim();
      const country = item.Country?.trim();
      const releaseTime = item.Date?.trim();
      if (!event || !country || !releaseTime) continue;

      results.push({
        event,
        country,
        actual: item.Actual && String(item.Actual).trim() !== "" ? String(item.Actual) : null,
        release_time: releaseTime,
        forecast: item.Forecast && String(item.Forecast).trim() !== "" ? String(item.Forecast) : null,
        previous: item.Previous && String(item.Previous).trim() !== "" ? String(item.Previous) : null,
        importance: typeof item.Importance === "number" ? item.Importance : null,
      });
    }

    console.log(`[te-calendar] Got ${results.length} calendar entries (${results.filter((r) => r.actual).length} with actual)`);
    return results;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[te-calendar] Fetch failed:", message);
    return [];
  }
}
