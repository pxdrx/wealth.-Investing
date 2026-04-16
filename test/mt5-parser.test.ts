import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseMt5Xlsx, type Mt5TradeRow } from "@/lib/mt5-parser";
import { calcRiskUsd, detectCategory } from "@/lib/trading/instrument-specs";

// ── Helpers ────────────────────────────────────────────────────────────────
// Build a minimal MT5-style XLSX in memory so we exercise the full parser,
// including the duplicate "Preço" column (occurrence 0 = open, 1 = close).

interface FakeTrade {
  position: string;
  openTime: string;
  symbol: string;
  tipo: "buy" | "sell";
  volume: number;
  open: number;
  sl: number;
  tp: number;
  closeTime: string;
  close: number;
  commission: number;
  swap: number;
  profit: number;
}

function buildMt5Buffer(trades: FakeTrade[]): ArrayBuffer {
  const aoa: Array<Array<string | number>> = [];
  aoa.push(["Posições"]);
  aoa.push([
    "Position",
    "Horário",
    "Ativo",
    "Tipo",
    "Volume",
    "Preço",
    "S / L",
    "T / P",
    "Horário",
    "Preço",
    "Comissão",
    "Swap",
    "Lucro",
  ]);
  for (const t of trades) {
    aoa.push([
      t.position,
      t.openTime,
      t.symbol,
      t.tipo,
      t.volume,
      t.open,
      t.sl,
      t.tp,
      t.closeTime,
      t.close,
      t.commission,
      t.swap,
      t.profit,
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

function parseFirst(trades: FakeTrade[]): Mt5TradeRow | undefined {
  const buf = buildMt5Buffer(trades);
  return parseMt5Xlsx(buf).trades[0];
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("detectCategory", () => {
  it("categorizes FX, metals, indices, crypto and commodities", () => {
    expect(detectCategory("EURUSD")).toBe("forex");
    expect(detectCategory("USDJPY")).toBe("forex");
    expect(detectCategory("XAUUSD")).toBe("metals");
    expect(detectCategory("NAS100")).toBe("indices");
    expect(detectCategory("BTCUSD")).toBe("crypto");
    expect(detectCategory("USOIL")).toBe("commodities");
  });

  it("normalizes the symbol before matching", () => {
    expect(detectCategory("  xauusd  ")).toBe("metals");
    expect(detectCategory("btcusdt")).toBe("crypto");
  });

  it("falls back to forex for unknown tickers", () => {
    expect(detectCategory("FOOBAR")).toBe("forex");
  });
});

describe("calcRiskUsd", () => {
  it("returns null on non-positive or non-finite inputs", () => {
    expect(calcRiskUsd({ symbol: "EURUSD", entry: 0, sl: 1, volume: 0.1 })).toBeNull();
    expect(calcRiskUsd({ symbol: "EURUSD", entry: 1, sl: 0, volume: 0.1 })).toBeNull();
    expect(calcRiskUsd({ symbol: "EURUSD", entry: 1, sl: 1, volume: 0 })).toBeNull();
    expect(calcRiskUsd({ symbol: "", entry: 1, sl: 0.5, volume: 1 })).toBeNull();
    expect(
      calcRiskUsd({ symbol: "EURUSD", entry: Number.NaN, sl: 1, volume: 0.1 })
    ).toBeNull();
  });

  it("EURUSD 50 pips × 0.1 lot = $50", () => {
    const r = calcRiskUsd({ symbol: "EURUSD", entry: 1.1, sl: 1.095, volume: 0.1 });
    expect(r).toBeCloseTo(50, 5);
  });

  it("XAUUSD 10 points × 0.1 lot = $100", () => {
    const r = calcRiskUsd({ symbol: "XAUUSD", entry: 2000, sl: 1990, volume: 0.1 });
    expect(r).toBeCloseTo(100, 5);
  });

  it("NAS100 uses 1 point per lot per dollar", () => {
    const r = calcRiskUsd({ symbol: "NAS100", entry: 18000, sl: 17950, volume: 1 });
    expect(r).toBeCloseTo(50, 5);
  });

  it("BTCUSD uses volume × delta", () => {
    const r = calcRiskUsd({ symbol: "BTCUSD", entry: 60000, sl: 59500, volume: 0.01 });
    expect(r).toBeCloseTo(5, 5);
  });

  it("USOIL uses 1000 × volume × delta", () => {
    const r = calcRiskUsd({ symbol: "USOIL", entry: 80, sl: 79, volume: 0.1 });
    expect(r).toBeCloseTo(100, 5);
  });

  it("USDJPY normalizes pip value by entry price", () => {
    const r = calcRiskUsd({ symbol: "USDJPY", entry: 150, sl: 149.5, volume: 0.1 });
    // |0.5| × 100_000 × 0.1 / 150 ≈ 33.33
    expect(r).toBeCloseTo((0.5 * 100_000 * 0.1) / 150, 5);
  });
});

describe("parseMt5Xlsx risk/reward fields", () => {
  const base: FakeTrade = {
    position: "101",
    openTime: "2026.04.15 10:00:00",
    symbol: "EURUSD",
    tipo: "buy",
    volume: 0.1,
    open: 1.1,
    sl: 1.095,
    tp: 1.12,
    closeTime: "2026.04.15 11:00:00",
    close: 1.105,
    commission: 0,
    swap: 0,
    profit: 50,
  };

  it("computes risk_usd and rr_realized ≈ 1.0 for a EURUSD 1:1 winner", () => {
    const t = parseFirst([{ ...base }]);
    expect(t).toBeDefined();
    expect(t!.entry_price).toBeCloseTo(1.1, 5);
    expect(t!.exit_price).toBeCloseTo(1.105, 5);
    expect(t!.stop_loss).toBeCloseTo(1.095, 5);
    expect(t!.take_profit).toBeCloseTo(1.12, 5);
    expect(t!.volume).toBeCloseTo(0.1, 5);
    expect(t!.risk_usd).toBeCloseTo(50, 5);
    expect(t!.rr_realized).toBeCloseTo(1.0, 5);
  });

  it("computes rr_realized ≈ -1.0 for a 1:1 loser", () => {
    const t = parseFirst([{ ...base, profit: -50 }]);
    expect(t).toBeDefined();
    expect(t!.risk_usd).toBeCloseTo(50, 5);
    expect(t!.rr_realized).toBeCloseTo(-1.0, 5);
  });

  it("returns null risk_usd and rr_realized when SL is missing", () => {
    const t = parseFirst([{ ...base, sl: 0 }]);
    expect(t).toBeDefined();
    expect(t!.stop_loss).toBeNull();
    expect(t!.risk_usd).toBeNull();
    expect(t!.rr_realized).toBeNull();
  });

  it("computes risk_usd = 100 for XAUUSD 0.1 lot with 10-point SL", () => {
    const t = parseFirst([
      {
        ...base,
        symbol: "XAUUSD",
        open: 2000,
        sl: 1990,
        tp: 2030,
        close: 2010,
        profit: 100,
      },
    ]);
    expect(t).toBeDefined();
    expect(t!.risk_usd).toBeCloseTo(100, 5);
    expect(t!.rr_realized).toBeCloseTo(1.0, 5);
  });

  it("subtracts fees (commission + swap) when computing rr_realized", () => {
    // 1:1 winner but $5 commission → net = 45, rr = 45/50 = 0.9
    const t = parseFirst([{ ...base, commission: -5, swap: 0, profit: 50 }]);
    expect(t).toBeDefined();
    expect(t!.risk_usd).toBeCloseTo(50, 5);
    expect(t!.rr_realized).toBeCloseTo(0.9, 5);
  });
});
