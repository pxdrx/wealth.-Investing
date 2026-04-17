// lib/macro/ff-on-demand.ts
// On-demand ForexFactory refresh for the AI Coach.
// Disparado sob demanda quando o usuário pergunta de um evento que já saiu
// mas ainda está com actual=null no DB (cron de calendar-sync só roda 2x/dia).

import type { SupabaseClient } from "@supabase/supabase-js";
import { scrapeForexFactoryCalendar } from "./scrapers/ff-calendar";
import { fetchTECalendarActuals } from "./scrapers/te-calendar";
import { mergeTeActuals } from "./actuals-merger";
import type { TeCalendarRow } from "./types";

export interface FFRefreshResult {
  ok: boolean;
  updated: number;
  error?: string;
  /** Fonte efetiva do refresh — 'ff' primario, 'te' fallback, 'none' ambos falharam */
  source?: "ff" | "te" | "none";
}

/** Mapeia nome de pais (TE API) para ISO 2-letter usado em TeCalendarRow */
const TE_COUNTRY_TO_ISO: Record<string, string> = {
  "united states": "US",
  "euro area": "EU",
  "united kingdom": "GB",
  "japan": "JP",
  "brazil": "BR",
  "canada": "CA",
  "australia": "AU",
  "china": "CN",
  "switzerland": "CH",
  "mexico": "MX",
  "germany": "DE",
  "france": "FR",
  "italy": "IT",
  "spain": "ES",
  "new zealand": "NZ",
};

function isoCountryFromTE(country: string): string {
  return TE_COUNTRY_TO_ISO[country.toLowerCase()] ?? country.slice(0, 2).toUpperCase();
}

function isoImportance(imp: number | null): "high" | "medium" | "low" {
  if (imp === null) return "medium";
  if (imp >= 3) return "high";
  if (imp >= 2) return "medium";
  return "low";
}

/**
 * Raspa ForexFactory e atualiza os `actual` nulos do economic_events.
 * Usa a lógica de match/update já existente (mergeTeActuals) — FFCalendarEvent
 * é estruturalmente compatível com TeCalendarRow nos campos usados.
 *
 * Timeout interno de 6s — garante que a call do coach não trava se FF estiver lento.
 */
export async function refreshActualsFromFF(
  supabase: SupabaseClient
): Promise<FFRefreshResult> {
  try {
    const ffEvents = await Promise.race([
      scrapeForexFactoryCalendar(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("FF scrape timeout (6s)")), 6000)
      ),
    ]);

    // FFCalendarEvent tem: date, time, country, title, actual, forecast, previous, impact
    // TeCalendarRow tem:    date, time, country, title, actual, forecast, previous, importance
    // mergeTeActuals usa só os 6 primeiros → cast direto é seguro.
    const rows: TeCalendarRow[] = ffEvents.map((e) => ({
      date: e.date,
      time: e.time,
      country: e.country,
      title: e.title,
      actual: e.actual,
      forecast: e.forecast,
      previous: e.previous,
      importance: e.impact,
    }));

    const result = await mergeTeActuals(rows, supabase);
    if (result.updated > 0) {
      return { ok: true, updated: result.updated, source: "ff" };
    }

    // FF nao trouxe actuals novos — tentar TE calendar API como fallback.
    console.log("[ff-on-demand] FF brought no new actuals, trying TE calendar fallback...");
    const teResult = await refreshActualsFromTECalendar(supabase);
    return teResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[ff-on-demand] refresh failed:", message);
    // Ultimo recurso: tentar TE calendar direto
    try {
      const teResult = await refreshActualsFromTECalendar(supabase);
      if (teResult.updated > 0) return teResult;
    } catch {}
    return { ok: false, updated: 0, error: message, source: "none" };
  }
}

/**
 * Fallback standalone: busca calendario TradingEconomics para hoje + ontem
 * e reusa mergeTeActuals. Chamado tanto por refreshActualsFromFF (ao falhar)
 * quanto diretamente pelo coach quando a pergunta e explicita sobre um dado.
 */
export async function refreshActualsFromTECalendar(
  supabase: SupabaseClient
): Promise<FFRefreshResult> {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [todayItems, yesterdayItems] = await Promise.all([
      fetchTECalendarActuals(now),
      fetchTECalendarActuals(yesterday),
    ]);

    const allItems = [...todayItems, ...yesterdayItems];
    if (allItems.length === 0) {
      return { ok: false, updated: 0, error: "TE calendar returned no items", source: "none" };
    }

    const rows: TeCalendarRow[] = allItems.map((item) => {
      // Parse "2026-04-17T12:30:00" → date="2026-04-17", time="12:30"
      const [datePart, timePart] = item.release_time.split("T");
      const timeClean = timePart ? timePart.slice(0, 5) : null;
      return {
        date: datePart,
        time: timeClean,
        country: isoCountryFromTE(item.country),
        title: item.event,
        actual: item.actual,
        forecast: item.forecast,
        previous: item.previous,
        importance: isoImportance(item.importance),
      };
    });

    const result = await mergeTeActuals(rows, supabase);
    return { ok: true, updated: result.updated, source: "te" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[te-calendar-fallback] failed:", message);
    return { ok: false, updated: 0, error: message, source: "none" };
  }
}
