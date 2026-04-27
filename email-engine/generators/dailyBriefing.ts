// Build the per-day shared payload for the daily briefing email.
// One call generates the bulk content (events, overnight narrative, bias,
// principle, tomorrow preview, headlines, edition number, asset impacts).
// Per-user fields (firstName, unsubscribeUrl, plan, locale, yesterday
// session, streak) are filled in at send time by the cron caller.

import { addDays, differenceInBusinessDays, format, startOfWeek } from "date-fns";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
  WeeklyPanorama,
  DailyAdjustment,
  EconomicEvent,
} from "@/lib/macro/types";
import { classifyBias } from "../lib/bias";
import { randomPrinciple } from "../data/principles";
import type {
  AssetImpact,
  BriefingHeadline,
  DailyBriefingTemplateProps,
  StreakInfo,
  YesterdaySession,
} from "@/email/templates/DailyBriefing";
import type {
  BriefingEvent,
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
  editionNumber: number;
  headlines: BriefingHeadline[];
  assetImpacts: AssetImpact[];
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
};

const ACRONYM_RE = /\b([A-Z]{2,5})\b/;

// Edition #001 = 2026-04-01 (business day). Increments per business day.
const EDITION_EPOCH = new Date("2026-04-01T00:00:00-03:00");

function extractTicker(title: string, country: string | null): string {
  if (country && COUNTRY_TO_TICKER[country]) return COUNTRY_TO_TICKER[country];
  const m = title.match(ACRONYM_RE);
  if (m) return m[1];
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
  return events
    .filter((e) => e.impact === "medium" || e.impact === "high")
    .sort((a, b) => {
      // Sort by time first (chronological), then by impact (high tiebreak).
      const ta = a.time ?? "99:99";
      const tb = b.time ?? "99:99";
      const dt = ta.localeCompare(tb);
      if (dt !== 0) return dt;
      const w = (i: EconomicEvent["impact"]) => (i === "high" ? 0 : i === "medium" ? 1 : 2);
      return w(a.impact) - w(b.impact);
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

function computeEditionNumber(date: Date): number {
  // Business days between epoch and date (inclusive of date).
  const days = differenceInBusinessDays(date, EDITION_EPOCH);
  return Math.max(1, days + 1);
}

interface MacroHeadlineRow {
  title: string;
  source: string;
  published_at: string | null;
}

function hoursAgo(iso: string | null, now: Date): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (isNaN(t)) return 0;
  const diff = now.getTime() - t;
  return Math.max(0, Math.round(diff / 3_600_000));
}

const SOURCE_LABEL: Record<string, string> = {
  reuters: "Reuters",
  forexlive: "ForexLive",
  trading_economics: "TradingEconomics",
  te_breaking: "TE Breaking",
  te_headlines: "TradingEconomics",
  truth_social: "Truth Social",
  financial_juice: "Financial Juice",
};

function labelSource(s: string): string {
  return SOURCE_LABEL[s] ?? s.replace(/_/g, " ");
}

function biasArrow(bias: "bullish" | "bearish" | "neutral" | undefined): "up" | "down" | "flat" {
  if (bias === "bullish") return "up";
  if (bias === "bearish") return "down";
  return "flat";
}

function inverseArrow(arrow: "up" | "down" | "flat"): "up" | "down" | "flat" {
  if (arrow === "up") return "down";
  if (arrow === "down") return "up";
  return "flat";
}

function buildAssetImpacts(panorama: WeeklyPanorama | null): AssetImpact[] {
  const impacts = panorama?.asset_impacts;
  if (!impacts) return [];
  const dxy = biasArrow(impacts.dollar?.bias);
  return [
    { ticker: "DXY", arrow: dxy },
    { ticker: "EURUSD", arrow: inverseArrow(dxy) },
    { ticker: "IBOV", arrow: biasArrow(impacts.indices?.bias) },
    { ticker: "GOLD", arrow: biasArrow(impacts.gold?.bias) },
    { ticker: "BTC", arrow: biasArrow(impacts.btc?.bias) },
  ];
}

export async function generateDailyBriefing(date: Date): Promise<DailyBriefingPayload> {
  const sb = createServiceRoleClient();
  const dateStr = format(date, "yyyy-MM-dd");
  const tomorrow = addDays(date, 1);
  const tomorrowStr = format(tomorrow, "yyyy-MM-dd");
  const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const oneDayAgo = new Date(date.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [todayQ, tomorrowQ, panoramaQ, adjQ, headlinesQ] = await Promise.all([
    sb.from("economic_events").select("*").eq("date", dateStr),
    sb
      .from("economic_events")
      .select("*")
      .eq("date", tomorrowStr)
      .in("impact", ["medium", "high"])
      .order("time", { ascending: true })
      .limit(10),
    sb.from("weekly_panoramas").select("*").eq("week_start", weekStart).limit(1),
    sb
      .from("daily_adjustments")
      .select("*")
      .eq("week_start", weekStart)
      .order("generated_at", { ascending: false })
      .limit(1),
    sb
      .from("macro_headlines")
      .select("title, source, published_at")
      .gte("published_at", oneDayAgo)
      .order("published_at", { ascending: false })
      .limit(5),
  ]);

  if (todayQ.error) throw new Error(`events query failed: ${todayQ.error.message}`);
  const todayEvents = (todayQ.data ?? []) as EconomicEvent[];
  const highlighted = pickHighlightedEvents(todayEvents);

  const tomorrowEvents = (tomorrowQ.data ?? []) as EconomicEvent[];
  const panorama = (panoramaQ.data?.[0] ?? null) as WeeklyPanorama | null;
  const marketBias = classifyBias(panorama?.asset_impacts ?? null);
  const adj = (adjQ.data?.[0] ?? null) as DailyAdjustment | null;
  const overnight = truncate(
    adj?.narrative ?? panorama?.narrative ?? defaultOvernight(marketBias),
    700,
  );

  const headlineRows = (headlinesQ.data ?? []) as MacroHeadlineRow[];
  const headlines: BriefingHeadline[] = headlineRows.map((h) => ({
    title: truncate(h.title, 140),
    source: labelSource(h.source),
    hoursAgo: hoursAgo(h.published_at, date),
  }));

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
    editionNumber: computeEditionNumber(date),
    headlines,
    assetImpacts: buildAssetImpacts(panorama),
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

// Helper: assemble per-user props from the shared payload + per-user data.
export interface PerUserBriefingArgs {
  payload: DailyBriefingPayload;
  plan: Plan;
  unsubscribeUrl: string;
  appUrl: string;
  firstName?: string;
  yesterdaySession?: YesterdaySession;
  streak?: StreakInfo;
}

export function buildDailyBriefingProps(
  args: PerUserBriefingArgs,
): DailyBriefingTemplateProps {
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
    firstName: args.firstName,
    editionNumber: args.payload.editionNumber,
    yesterdaySession: args.yesterdaySession,
    streak: args.streak,
    headlines: args.payload.headlines,
    assetImpacts: args.plan === "ultra" ? args.payload.assetImpacts : undefined,
  };
}
