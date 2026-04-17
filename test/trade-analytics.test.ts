import { describe, it, expect } from "vitest";
import { computeTradeAnalytics, calcStreaks } from "@/lib/trade-analytics";
import type { JournalTradeRow } from "@/components/journal/types";

/**
 * Build a JournalTradeRow with sane defaults. Pass overrides for the
 * fields the test actually cares about.
 *
 * We use `net_pnl_usd` as the primary source (getNetPnl returns it first),
 * and pin opened_at/closed_at to successive hours so that ordering and
 * daily grouping are deterministic.
 */
let _id = 0;
function makeTrade(overrides: Partial<JournalTradeRow> = {}): JournalTradeRow {
  _id += 1;
  const hour = String(_id % 24).padStart(2, "0");
  const day = String(Math.floor(_id / 24) + 1).padStart(2, "0");
  const opened = overrides.opened_at ?? `2026-04-${day}T${hour}:00:00Z`;
  const closed = overrides.closed_at ?? `2026-04-${day}T${hour}:30:00Z`;
  return {
    id: `t${_id}`,
    symbol: "XAUUSD",
    direction: "buy",
    opened_at: opened,
    closed_at: closed,
    pnl_usd: null,
    fees_usd: null,
    net_pnl_usd: 0,
    category: null,
    ...overrides,
  };
}

describe("computeTradeAnalytics — Win Rate", () => {
  it("returns 60% for 6 wins and 4 losses", () => {
    const trades = [
      ...Array.from({ length: 6 }, () => makeTrade({ net_pnl_usd: 100 })),
      ...Array.from({ length: 4 }, () => makeTrade({ net_pnl_usd: -50 })),
    ];
    const a = computeTradeAnalytics(trades);
    expect(a.totalTrades).toBe(10);
    expect(a.winRate).toBeCloseTo(60, 5);
  });

  it("treats breakeven (pnl=0) as non-win", () => {
    const trades = [
      makeTrade({ net_pnl_usd: 50 }),
      makeTrade({ net_pnl_usd: 0 }),
    ];
    const a = computeTradeAnalytics(trades);
    expect(a.winRate).toBeCloseTo(50, 5);
  });

  it("returns 0 for empty input", () => {
    const a = computeTradeAnalytics([]);
    expect(a.winRate).toBe(0);
    expect(a.totalTrades).toBe(0);
  });
});

describe("computeTradeAnalytics — Profit Factor", () => {
  it("computes grossWin / grossLoss", () => {
    const trades = [
      makeTrade({ net_pnl_usd: 200 }),
      makeTrade({ net_pnl_usd: 100 }),
      makeTrade({ net_pnl_usd: -100 }),
      makeTrade({ net_pnl_usd: -100 }),
    ];
    const a = computeTradeAnalytics(trades);
    expect(a.profitFactor).toBeCloseTo(1.5, 5);
  });

  it("returns Infinity when there are wins and no losses", () => {
    const trades = [makeTrade({ net_pnl_usd: 100 })];
    const a = computeTradeAnalytics(trades);
    expect(a.profitFactor).toBe(Infinity);
  });

  it("returns 0 when no wins and no losses (all breakeven)", () => {
    const trades = [
      makeTrade({ net_pnl_usd: 0 }),
      makeTrade({ net_pnl_usd: 0 }),
    ];
    const a = computeTradeAnalytics(trades);
    expect(a.profitFactor).toBe(0);
  });
});

describe("computeTradeAnalytics — Expectancy (Van Tharp)", () => {
  it("equals netPnl / totalTrades", () => {
    const trades = [
      makeTrade({ net_pnl_usd: 200 }),
      makeTrade({ net_pnl_usd: 100 }),
      makeTrade({ net_pnl_usd: -100 }),
      makeTrade({ net_pnl_usd: -50 }),
    ];
    const a = computeTradeAnalytics(trades);
    expect(a.netPnl).toBe(150);
    expect(a.expectancy).toBeCloseTo(150 / 4, 5);
  });

  it("matches P(win)·avgWin − P(loss)·avgLoss", () => {
    const trades = [
      makeTrade({ net_pnl_usd: 100 }),
      makeTrade({ net_pnl_usd: 100 }),
      makeTrade({ net_pnl_usd: 100 }),
      makeTrade({ net_pnl_usd: -50 }),
      makeTrade({ net_pnl_usd: -50 }),
    ];
    const a = computeTradeAnalytics(trades);
    const pWin = a.winRate / 100;
    const manual = pWin * a.avgWin - (1 - pWin) * a.avgLoss;
    expect(a.expectancy).toBeCloseTo(manual, 5);
  });
});

describe("computeTradeAnalytics — Avg Loss (no breakeven dilution)", () => {
  it("breakeven trades do NOT pull avgLoss down", () => {
    // 2 real losses of −100 each; 3 breakevens. Real avgLoss should be 100.
    const trades = [
      makeTrade({ net_pnl_usd: -100 }),
      makeTrade({ net_pnl_usd: -100 }),
      makeTrade({ net_pnl_usd: 0 }),
      makeTrade({ net_pnl_usd: 0 }),
      makeTrade({ net_pnl_usd: 0 }),
    ];
    const a = computeTradeAnalytics(trades);
    expect(a.avgLoss).toBeCloseTo(100, 5);
  });
});

describe("computeTradeAnalytics — Max Drawdown", () => {
  it("reports DD% from peak to trough on a positive-then-declining curve", () => {
    // Day 1: +100, Day 2: +50 (peak=150), Day 3: −80 (equity=70, drop 80 from peak 150).
    const trades = [
      makeTrade({ net_pnl_usd: 100, opened_at: "2026-04-01T10:00:00Z", closed_at: "2026-04-01T11:00:00Z" }),
      makeTrade({ net_pnl_usd: 50, opened_at: "2026-04-02T10:00:00Z", closed_at: "2026-04-02T11:00:00Z" }),
      makeTrade({ net_pnl_usd: -80, opened_at: "2026-04-03T10:00:00Z", closed_at: "2026-04-03T11:00:00Z" }),
    ];
    const a = computeTradeAnalytics(trades);
    // Peak 150, trough 70 → drop 80 USD → ~53.33% of peak.
    expect(a.maxDrawdownUsd).toBeCloseTo(80, 5);
    expect(a.maxDrawdown).toBeCloseTo((80 / 150) * 100, 5);
  });

  it("does NOT force −100% on all-negative equity curves", () => {
    // Curve never above zero → MDD% must be 0 (no peak yet), but USD DD tracks the deepest point.
    const trades = [
      makeTrade({ net_pnl_usd: -50, opened_at: "2026-04-01T10:00:00Z", closed_at: "2026-04-01T11:00:00Z" }),
      makeTrade({ net_pnl_usd: -30, opened_at: "2026-04-02T10:00:00Z", closed_at: "2026-04-02T11:00:00Z" }),
    ];
    const a = computeTradeAnalytics(trades);
    expect(a.maxDrawdown).toBe(0);
    // Peak (0) − trough (−80) = 80
    expect(a.maxDrawdownUsd).toBeCloseTo(80, 5);
  });
});

describe("calcStreaks", () => {
  it("handles a single winning trade", () => {
    const s = calcStreaks([makeTrade({ net_pnl_usd: 10 })]);
    expect(s.longestWin).toBe(1);
    expect(s.longestLoss).toBe(0);
    expect(s.current).toBe(1);
  });

  it("handles a single losing trade", () => {
    const s = calcStreaks([makeTrade({ net_pnl_usd: -10 })]);
    expect(s.longestWin).toBe(0);
    expect(s.longestLoss).toBe(1);
    expect(s.current).toBe(-1);
  });

  it("tracks alternating wins and losses", () => {
    const trades = [
      makeTrade({ net_pnl_usd: 10, closed_at: "2026-04-01T01:00:00Z" }),
      makeTrade({ net_pnl_usd: -10, closed_at: "2026-04-01T02:00:00Z" }),
      makeTrade({ net_pnl_usd: 10, closed_at: "2026-04-01T03:00:00Z" }),
      makeTrade({ net_pnl_usd: 10, closed_at: "2026-04-01T04:00:00Z" }),
      makeTrade({ net_pnl_usd: -10, closed_at: "2026-04-01T05:00:00Z" }),
    ];
    const s = calcStreaks(trades);
    expect(s.longestWin).toBe(2);
    expect(s.longestLoss).toBe(1);
    expect(s.current).toBe(-1);
  });
});

describe("computeTradeAnalytics — Recovery Factor", () => {
  it("equals netPnl / maxDrawdownUsd", () => {
    const trades = [
      makeTrade({ net_pnl_usd: 100, opened_at: "2026-04-01T10:00:00Z", closed_at: "2026-04-01T11:00:00Z" }),
      makeTrade({ net_pnl_usd: -40, opened_at: "2026-04-02T10:00:00Z", closed_at: "2026-04-02T11:00:00Z" }),
      makeTrade({ net_pnl_usd: 60, opened_at: "2026-04-03T10:00:00Z", closed_at: "2026-04-03T11:00:00Z" }),
    ];
    const a = computeTradeAnalytics(trades);
    // netPnl = 120; equity peak 100 → 60 (after day 2) → 120; max DD USD = 40.
    expect(a.maxDrawdownUsd).toBeCloseTo(40, 5);
    expect(a.recoveryFactor).toBeCloseTo(120 / 40, 5);
  });
});
