// Build the per-day shared payload for the daily briefing email.
// One call generates the bulk content (events, overnight narrative, bias,
// principle, tomorrow preview). Per-user fields (firstName, unsubscribeUrl,
// appUrl, locale, plan) are filled in at send time by the cron caller.

import { addDays, format, startOfWeek } from "date-fns";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
  WeeklyPanorama,
  DailyAdjustment,
  EconomicEvent,
} from "@/lib/macro/types";
import { classifyBias } from "../lib/bias";
import { randomPrinciple } from "../data/principles";
import type {
  BriefingEvent,
  DailyBriefingProps,
  Impact,
  MarketBias,
  Plan,
  Principle,
} from "../__mocks__/types";

export interface DailyBriefingPayload {
  date: string;
  marketBias: MarketBias;
  overnight: string;
  today: BriefingEvent[];
  tomorrow: string;
  principle: Principle;
}

const COUNTRY_TO_TICKER: Record<string, string> = {
  US: "USD",
  EU: "EUR",
  GB: "GBP",
  JP: "JPY",
  CN: "CNY",
  BR: "BRL",
  CH: "CHF",
  CA: "CAD",
  AU: "AUD",
  NZ: "NZD",
  DE: "DE",
  FR: "FR",
  IT: "IT",
};

const ACRONYM_RE = /\b([A-Z]{2,5})\b/;

function extractTicker(title: string, country: string | null): string {
  const m = title.match(ACRONYM_RE);
  if (m) return m[1];
  if (country && COUNTRY_TO_TICKER[country]) return COUNTRY_TO_TICKER[country];
  return country ?? "—";
}

function mapImpact(impact: EconomicEvent["impact"]): Impact {
  if (impact === "high") return "high";
  if (impact === "medium") return "med";
  return "low";
}

function truncate(s: string, max = 80): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

function pickHighlightedEvents(events: EconomicEvent[]): EconomicEvent[] {
  // Spec: filter medium+high. Cap at 5 to keep email scannable.
  return events
    .filter((e) => e.impact === "medium" || e.impact === "high")
    .sort((a, b) => {
      // Sort by impact (high first), then by time.
      const w = (i: EconomicEvent["impact"]) => (i === "high" ? 0 : i === "medium" ? 1 : 2);
      const di = w(a.impact) - w(b.impact);
      if (di !== 0) return di;
      return (a.time ?? "99:99").localeCompare(b.time ?? "99:99");
    })
    .slice(0, 5);
}

function buildTomorrowLine(events: EconomicEvent[]): string {
  const high = events.filter((e) => e.impact === "high");
  if (high.length > 0) {
    const e = high[0];
    return `Próximo destaque: ${truncate(e.title, 60)} (${e.country}).`;
  }
  if (events.length === 0) {
    return "Sem eventos relevantes mapeados. Mercado descansa entre sessões.";
  }
  const e = events[0];
  return `Próximo destaque: ${truncate(e.title, 60)} (${e.country}).`;
}

export async function generateDailyBriefing(date: Date): Promise<DailyBriefingPayload> {
  const sb = createServiceRoleClient();
  const dateStr = format(date, "yyyy-MM-dd");
  const tomorrow = addDays(date, 1);
  const tomorrowStr = format(tomorrow, "yyyy-MM-dd");
  const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");

  // 1. Today's events
  const { data: todayRaw, error: todayErr } = await sb
    .from("economic_events")
    .select("*")
    .eq("date", dateStr);
  if (todayErr) throw new Error(`events query failed: ${todayErr.message}`);
  const todayEvents = (todayRaw ?? []) as EconomicEvent[];
  const highlighted = pickHighlightedEvents(todayEvents);

  // 2. Tomorrow's events (for tomorrow line)
  const { data: tomorrowRaw } = await sb
    .from("economic_events")
    .select("*")
    .eq("date", tomorrowStr)
    .in("impact", ["medium", "high"])
    .order("time", { ascending: true })
    .limit(10);
  const tomorrowEvents = (tomorrowRaw ?? []) as EconomicEvent[];

  // 3. Panorama for bias
  const { data: panoramaRows } = await sb
    .from("weekly_panoramas")
    .select("*")
    .eq("week_start", weekStart)
    .limit(1);
  const panorama = (panoramaRows?.[0] ?? null) as WeeklyPanorama | null;
  const marketBias = classifyBias(panorama?.asset_impacts ?? null);

  // 4. Overnight narrative — most recent daily_adjustment for the week,
  //    fall back to weekly panorama narrative.
  const { data: adjRows } = await sb
    .from("daily_adjustments")
    .select("*")
    .eq("week_start", weekStart)
    .order("generated_at", { ascending: false })
    .limit(1);
  const adj = (adjRows?.[0] ?? null) as DailyAdjustment | null;
  const overnight =
    truncate(adj?.narrative ?? panorama?.narrative ?? defaultOvernight(marketBias), 700);

  return {
    date: dateStr,
    marketBias,
    overnight,
    today: highlighted.map((e) => ({
      time: e.time ?? "—",
      ticker: extractTicker(e.title, e.country),
      label: truncate(e.title, 80),
      impact: mapImpact(e.impact),
    })),
    tomorrow: buildTomorrowLine(tomorrowEvents),
    principle: randomPrinciple(),
  };
}

function defaultOvernight(bias: MarketBias): string {
  if (bias === "risk-on") {
    return "Sessões asiáticas e europeias com tom construtivo. Apetite por risco mantém suporte em índices e ativos de maior beta. Atenção aos eventos do dia para confirmar ou desafiar essa leitura.";
  }
  if (bias === "risk-off") {
    return "Pré-mercado defensivo. Dólar firme e juros pressionando ativos de risco. Cautela com posições alavancadas até clareza dos eventos do dia.";
  }
  return "Sem viés definido no overnight. Mercado lateralizado aguardando catalisadores. Eventos de hoje devem definir direção da sessão.";
}

// Helper: assemble per-user props from the shared payload.
export function buildDailyBriefingProps(args: {
  payload: DailyBriefingPayload;
  unsubscribeUrl: string;
  appUrl: string;
  plan: Plan;
}): DailyBriefingProps {
  return {
    date: args.payload.date,
    locale: "pt-BR",
    plan: args.plan,
    marketBias: args.payload.marketBias,
    overnight: args.payload.overnight,
    today: args.payload.today,
    tomorrow: args.payload.tomorrow,
    principle: args.payload.principle,
    unsubscribeUrl: args.unsubscribeUrl,
    appUrl: args.appUrl,
  };
}
