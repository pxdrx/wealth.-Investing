import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseCsvAdaptive } from "@/lib/csv-adaptive-parser";
import { xlsxFirstSheetToCsvBuffer } from "@/lib/xlsx-adaptive-bridge";

// NinjaTrader PT-BR "Grid" / "Trades Performance" export sample. Header row
// mirrors the real file (semicolons, accents, typo "Sáída" on the exit-event
// column). Two closed positions: one short MGC that lost $114, one long ES
// that made $37.50. All fees zero to keep the maths trivial.
const NT_ROWS: Array<Array<string>> = [
  [
    "Núm. Neg.",
    "Ativo",
    "Conta",
    "Estratégia",
    "Pos mercado.",
    "Qtd",
    "Preço entrada",
    "Preço saída",
    "Hora entrada",
    "Hora saída",
    "Entrada",
    "Sáída",
    "Profit",
    "Acu lucro líquido",
    "Corretagem",
    "Clearing Fee",
    "Exchange Fee",
    "IP Fee",
    "NFA Fee",
    "MAE",
    "MFE",
    "ETD",
    "Barras",
  ],
  [
    "1",
    "MGC 06-26",
    "BX-M78515121851!Bulenox!Bulenox",
    "01 = 1 - 3",
    "Venda",
    "1",
    "4814,8",
    "4826,2",
    "17/04/2026 06:45:15",
    "17/04/2026 08:45:42",
    "Entry",
    "Stop1",
    "-$ 114,00",
    "-$ 114,00",
    "$ 0,00",
    "$ 0,00",
    "$ 0,00",
    "$ 0,00",
    "$ 0,00",
    "-$ 120,00",
    "$ 10,00",
    "$ 0,00",
    "40",
  ],
  [
    "2",
    "ES 06-26",
    "BX-M78515121851!Bulenox!Bulenox",
    "01 = 1 - 3",
    "Compra",
    "1",
    "5200,25",
    "5201,00",
    "17/04/2026 10:00:00",
    "17/04/2026 10:30:00",
    "Entry",
    "Target",
    "$ 37,50",
    "-$ 76,50",
    "$ 0,00",
    "$ 0,00",
    "$ 0,00",
    "$ 0,00",
    "$ 0,00",
    "-$ 5,00",
    "$ 50,00",
    "$ 0,00",
    "10",
  ],
];

function buildNinjaTraderCsv(rows: string[][]): Buffer {
  return Buffer.from(rows.map((r) => r.join(";")).join("\n"), "utf-8");
}

function buildNinjaTraderXlsx(rows: string[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Grid");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("parseCsvAdaptive — NinjaTrader PT-BR CSV", () => {
  it("identifies broker, external_source, and required fields by alias", () => {
    const csv = buildNinjaTraderCsv(NT_ROWS);
    const result = parseCsvAdaptive(csv);

    expect(result.broker_hint).toBe("ninjatrader");
    expect(result.external_source).toBe("csv_ninjatrader");

    // Each required canonical field must resolve by alias (no Haiku fallback).
    for (const field of ["symbol", "pnl_usd", "opened_at", "closed_at", "direction"] as const) {
      const entry = result.mapping[field];
      expect(entry, `mapping for ${field}`).toBeDefined();
      expect(entry!.confidence).toBe("alias");
    }

    expect(result.trades).toHaveLength(2);

    const first = result.trades[0];
    expect(first.symbol).toBe("MGC 06-26");
    expect(first.direction).toBe("sell");
    expect(first.pnl_usd).toBe(-114);
    expect(first.fees_usd).toBe(0);
    expect(new Date(first.opened_at).getTime()).toBeLessThan(
      new Date(first.closed_at).getTime()
    );

    const second = result.trades[1];
    expect(second.symbol).toBe("ES 06-26");
    expect(second.direction).toBe("buy");
    expect(second.pnl_usd).toBeCloseTo(37.5, 2);
  });
});

describe("xlsxFirstSheetToCsvBuffer → parseCsvAdaptive — XLSX bridge", () => {
  it("converts a NinjaTrader XLSX and parses the same two trades", () => {
    const xlsx = buildNinjaTraderXlsx(NT_ROWS);
    const { csv, sheetName } = xlsxFirstSheetToCsvBuffer(xlsx);
    expect(sheetName).toBe("Grid");

    const result = parseCsvAdaptive(csv);
    expect(result.broker_hint).toBe("ninjatrader");
    expect(result.trades).toHaveLength(2);
    expect(result.trades[0].symbol).toBe("MGC 06-26");
    expect(result.trades[0].pnl_usd).toBe(-114);
    expect(result.trades[1].symbol).toBe("ES 06-26");
    expect(result.trades[1].direction).toBe("buy");
  });
});
