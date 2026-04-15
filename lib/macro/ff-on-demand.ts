// lib/macro/ff-on-demand.ts
// On-demand ForexFactory refresh for the AI Coach.
// Disparado sob demanda quando o usuário pergunta de um evento que já saiu
// mas ainda está com actual=null no DB (cron de calendar-sync só roda 2x/dia).

import type { SupabaseClient } from "@supabase/supabase-js";
import { scrapeForexFactoryCalendar } from "./scrapers/ff-calendar";
import { mergeTeActuals } from "./actuals-merger";
import type { TeCalendarRow } from "./types";

export interface FFRefreshResult {
  ok: boolean;
  updated: number;
  error?: string;
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
    return { ok: true, updated: result.updated };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[ff-on-demand] refresh failed:", message);
    return { ok: false, updated: 0, error: message };
  }
}
