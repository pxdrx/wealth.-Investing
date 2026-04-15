// lib/macro/audit/rates-audit.ts
// Cross-reference central_bank_rates (DB) with TradingEconomics scrape + staleness flags.

import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";
import { scrapeTradingEconomicsRates } from "@/lib/macro/scrapers/te-rates";
import type { AuditRateRow, RateAuditReport } from "./types";

const STALE_DAYS = 7;

export async function auditRates(): Promise<RateAuditReport> {
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  const { data: dbRows } = await supabase
    .from("central_bank_rates")
    .select("bank_code, bank_name, country, current_rate, last_action, last_change_bps, last_change_date, updated_at")
    .order("bank_code", { ascending: true });

  const teRates = await scrapeTradingEconomicsRates().catch((err: unknown) => {
    console.warn("[rates-audit] TE scrape failed:", err);
    return null;
  });

  const teMap = new Map<string, number>();
  for (const r of teRates ?? []) {
    teMap.set(r.bank_code, r.current_rate);
  }

  const now = Date.now();

  const rows: AuditRateRow[] = (dbRows ?? []).map((r) => {
    const teRate = teMap.get(r.bank_code) ?? null;
    const mismatch_rate =
      teRate !== null && Math.abs(teRate - r.current_rate) > 0.001;
    const updatedMs = new Date(r.updated_at).getTime();
    const stale = Number.isFinite(updatedMs)
      ? now - updatedMs > STALE_DAYS * 86400000
      : true;
    const changeMs = r.last_change_date ? new Date(r.last_change_date).getTime() : null;
    const stale_change_date =
      changeMs !== null && now - changeMs > 180 * 86400000; // 6 months with no change flagged

    return {
      bank_code: r.bank_code,
      bank_name: r.bank_name,
      country: r.country,
      db: {
        current_rate: r.current_rate,
        last_action: r.last_action,
        last_change_bps: r.last_change_bps,
        last_change_date: r.last_change_date,
        updated_at: r.updated_at,
      },
      te: teRate !== null ? { current_rate: teRate } : null,
      flags: { mismatch_rate, stale, stale_change_date },
    };
  });

  return {
    rows,
    teAvailable: !!teRates && teRates.length > 0,
    generatedAt: new Date().toISOString(),
  };
}
