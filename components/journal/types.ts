export type PeriodFilter = "today" | "week" | "month" | "all";

export interface JournalTradeRow {
  id: string;
  symbol: string;
  direction: string;
  opened_at: string;
  closed_at: string;
  pnl_usd: number | null;
  fees_usd: number | null;
  net_pnl_usd: number | null;
  category: string | null;
  context?: string | null;
  notes?: string | null;
  mistakes?: string[] | null;
  // Psychology tags (Phase 3)
  emotion?: string | null;
  discipline?: string | null;
  setup_quality?: string | null;
  custom_tags?: string[] | null;
  entry_rating?: number | null;
  exit_rating?: number | null;
  management_rating?: number | null;
  // MFE/MAE (Phase 3)
  mfe_usd?: number | null;
  mae_usd?: number | null;
}

export function getNetPnl(row: JournalTradeRow): number {
  if (typeof row.net_pnl_usd === "number" && !Number.isNaN(row.net_pnl_usd)) return row.net_pnl_usd;
  return (row.pnl_usd ?? 0) + (row.fees_usd ?? 0);
}

export function filterTradesByPeriod<T extends { opened_at: string }>(trades: T[], period: PeriodFilter): T[] {
  if (period === "all") return trades;
  const now = new Date();
  let start: Date;
  let end: Date = new Date(now);
  end.setHours(23, 59, 59, 999);
  if (period === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "week") {
    start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else {
    // month
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  return trades.filter((t) => t.opened_at >= startIso && t.opened_at <= endIso);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${h}:${m}`;
}

export function formatDuration(openIso: string, closeIso: string): string {
  const a = new Date(openIso);
  const b = new Date(closeIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "—";
  const ms = b.getTime() - a.getTime();
  if (ms < 0) return "—";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
