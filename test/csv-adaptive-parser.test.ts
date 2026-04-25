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

describe("parseCsvAdaptive — Tradovate multi-fill positions", () => {
  // Real Position History export from a user that produced an incorrect
  // dashboard balance because the importer dedupes on `external_id` and the
  // parser was emitting the same Position ID for every fill of a multi-fill
  // position. Captured here verbatim so any regression on the dedupe fix
  // immediately fails CI.
  const TRADOVATE_CSV = `Position ID,Timestamp,Trade Date,Net Pos,Net Price,Bought,Avg. Buy,Sold,Avg. Sell,Account,Contract,Product,Product Description,_priceFormat,_priceFormatType,_tickSize,Pair ID,Buy Fill ID,Sell Fill ID,Paired Qty,Buy Price,Sell Price,P/L,Currency,Bought Timestamp,Sold Timestamp
468156750012,04/13/2026 10:23:44,2026-04-13,0,,14,6816.75,14,6830.25,LFE1007363489002,MESM6,MES,Micro E-mini S&P 500,-2,0,0.25,468156750026,468156750010,468156750024,14,6816.75,6830.25,945.00,USD,04/13/2026 09:40:47,04/13/2026 10:23:44
468156750038,04/13/2026 15:46:53,2026-04-13,0,,1,25436.00,1,25408.75,LFE1007363489002,NQM6,NQ,E-Mini NASDAQ 100,-2,0,0.25,468156750062,468156750060,468156750036,1,25436.00,25408.75,-545.00,USD,04/13/2026 15:46:53,04/13/2026 14:50:08
468156750067,04/14/2026 12:43:26,2026-04-14,0,,7,6965.50,7,6992.75,LFE1007363489002,MESM6,MES,Micro E-mini S&P 500,-2,0,0.25,468156750096,468156750076,468156750094,7,6965.50,6992.75,953.75,USD,04/14/2026 11:10:48,04/14/2026 12:43:26
468156750113,04/15/2026 10:44:00,2026-04-15,0,,1,7013.75,1,7013.75,LFE1007363489002,ESM6,ES,E-Mini S&P 500,-2,0,0.25,468156750136,468156750111,468156750134,1,7013.75,7013.75,0.00,USD,04/15/2026 10:29:10,04/15/2026 10:44:00
468156750148,04/15/2026 12:31:38,2026-04-15,0,,12,48591,12,48540,LFE1007363489002,MYMM6,MYM,Micro E-mini Dow $0.50,0,0,1.0,468156750177,468156750146,468156750175,12,48591,48540,-306.00,USD,04/15/2026 12:21:28,04/15/2026 12:31:38
468156750186,04/15/2026 15:02:52,2026-04-15,0,,10,26208.25,10,26207.50,LFE1007363489002,MNQM6,MNQ,Micro E-mini NASDAQ-100,-2,0,0.25,468156750209,468156750184,468156750207,10,26208.25,26207.50,-15.00,USD,04/15/2026 14:35:44,04/15/2026 15:02:52
468156750219,04/16/2026 15:07:33,2026-04-16,0,,5,26501.25,5,26431.75,LFE1007363489002,MNQM6,MNQ,Micro E-mini NASDAQ-100,-2,0,0.25,468156750279,468156750263,468156750277,5,26501.25,26431.75,-695.00,USD,04/16/2026 14:45:11,04/16/2026 15:07:33
468156750230,04/16/2026 14:38:52,2026-04-16,0,,36,7070.63,36,7072.13,LFE1007363489002,MESM6,MES,Micro E-mini S&P 500,-2,0,0.25,468156750245,468156750228,468156750243,18,7072.50,7064.75,-697.50,USD,04/16/2026 10:10:03,04/16/2026 10:41:46
468156750230,04/16/2026 14:38:52,2026-04-16,0,,36,7070.63,36,7072.13,LFE1007363489002,MESM6,MES,Micro E-mini S&P 500,-2,0,0.25,468156750256,468156750254,468156750248,18,7068.75,7079.50,967.50,USD,04/16/2026 14:38:52,04/16/2026 12:15:15
468156750302,04/20/2026 10:08:44,2026-04-20,0,,11,7135.75,11,7144.25,LFE1007363489002,MESM6,MES,Micro E-mini S&P 500,-2,0,0.25,468156750321,468156750299,468156750319,11,7135.75,7144.25,467.50,USD,04/20/2026 09:45:09,04/20/2026 10:08:44
468156750333,04/20/2026 14:40:52,2026-04-20,0,,1,26719.00,1,26691.75,LFE1007363489002,NQM6,NQ,E-Mini NASDAQ 100,-2,0,0.25,468156750348,468156750346,468156750331,1,26719.00,26691.75,-545.00,USD,04/20/2026 14:40:52,04/20/2026 14:35:19
468156750356,04/21/2026 10:31:22,2026-04-21,0,,11,7153.25,11,7164.25,LFE1007363489002,MESM6,MES,Micro E-mini S&P 500,-2,0,0.25,468156750399,468156750397,468156750365,11,7153.25,7164.25,605.00,USD,04/21/2026 10:31:22,04/21/2026 09:43:36
468156750411,04/21/2026 14:39:01,2026-04-21,0,,4,26657.00,4,26722.00,LFE1007363489002,MNQM6,MNQ,Micro E-mini NASDAQ-100,-2,0,0.25,468156750431,468156750409,468156750429,4,26657.00,26722.00,520.00,USD,04/21/2026 14:35:43,04/21/2026 14:39:01
468156750437,04/22/2026 16:07:41,2026-04-22,0,,9,27008.86,9,27008.75,LFE1007363489002,MNQM6,MNQ,Micro E-mini NASDAQ-100,-2,0,0.25,468156750499,468156750497,468156750474,5,27008.75,27008.75,0.00,USD,04/22/2026 16:07:41,04/22/2026 15:26:36
468156750437,04/22/2026 16:07:41,2026-04-22,0,,9,27008.86,9,27008.75,LFE1007363489002,MNQM6,MNQ,Micro E-mini NASDAQ-100,-2,0,0.25,468156750504,468156750502,468156750474,4,27009.00,27008.75,-2.00,USD,04/22/2026 16:07:41,04/22/2026 15:26:36
468156750439,04/22/2026 11:01:00,2026-04-22,0,,9,7156.75,9,7140.75,LFE1007363489002,MESM6,MES,Micro E-mini S&P 500,-2,0,0.25,468156750464,468156750462,468156750448,9,7156.75,7140.75,-720.00,USD,04/22/2026 11:01:00,04/22/2026 09:50:04
468156750512,04/23/2026 14:01:34,2026-04-23,0,,6,7159.50,6,7159.25,LFE1007363489002,MESM6,MES,Micro E-mini S&P 500,-2,0,0.25,468156750613,468156750521,468156750611,6,7159.50,7159.25,-7.50,USD,04/23/2026 10:40:14,04/23/2026 14:01:34
468156750546,04/23/2026 14:04:12,2026-04-23,0,,44,49522,44,49533,LFE1007363489002,MYMM6,MYM,Micro E-mini Dow $0.50,0,0,1.0,468156750570,468156750544,468156750568,13,49444,49550,689.00,USD,04/23/2026 11:02:21,04/23/2026 11:08:35
468156750546,04/23/2026 14:04:12,2026-04-23,0,,44,49522,44,49533,LFE1007363489002,MYMM6,MYM,Micro E-mini Dow $0.50,0,0,1.0,468156750605,468156750584,468156750603,18,49589,49548,-369.00,USD,04/23/2026 13:59:08,04/23/2026 14:01:34
468156750546,04/23/2026 14:04:12,2026-04-23,0,,44,49522,44,49533,LFE1007363489002,MYMM6,MYM,Micro E-mini Dow $0.50,0,0,1.0,468156750653,468156750623,468156750651,13,49507,49495,-78.00,USD,04/23/2026 14:03:17,04/23/2026 14:04:12
468156750656,04/24/2026 11:44:12,2026-04-24,0,,15,49338,15,49339,LFE1007363489002,MYMM6,MYM,Micro E-mini Dow $0.50,0,0,1.0,468156750761,468156750759,468156750731,15,49338,49339,7.50,USD,04/24/2026 11:44:12,04/24/2026 11:41:29
468156750658,04/24/2026 12:07:34,2026-04-24,0,,32,7167.19,32,7165.58,LFE1007363489002,MESM6,MES,Micro E-mini S&P 500,-2,0,0.25,468156750697,468156750695,468156750667,14,7164.00,7166.00,140.00,USD,04/24/2026 09:44:27,04/24/2026 09:43:26
468156750658,04/24/2026 12:07:34,2026-04-24,0,,32,7167.19,32,7165.58,LFE1007363489002,MESM6,MES,Micro E-mini S&P 500,-2,0,0.25,468156750766,468156750764,468156750704,6,7168.00,7167.25,-22.50,USD,04/24/2026 11:46:26,04/24/2026 10:19:08
468156750658,04/24/2026 12:07:34,2026-04-24,0,,32,7167.19,32,7165.58,LFE1007363489002,MESM6,MES,Micro E-mini S&P 500,-2,0,0.25,468156750806,468156750804,468156750776,12,7170.50,7164.25,-375.00,USD,04/24/2026 12:07:34,04/24/2026 11:48:46
`;

  it("emits a unique external_id per fill so the importer dedupe doesn't drop legs", () => {
    const result = parseCsvAdaptive(Buffer.from(TRADOVATE_CSV, "utf-8"));
    expect(result.broker_hint).toBe("tradovate");

    // 24 data rows in the CSV — every one must survive (no dedupe collisions).
    expect(result.trades).toHaveLength(24);

    // All external_ids unique.
    const ids = result.trades.map((t) => t.external_id);
    expect(new Set(ids).size).toBe(ids.length);

    // Sum of gross P/L across all rows = 917.75 ($945 -545 +953.75 +0 -306
    // -15 -695 -697.50 +967.50 +467.50 -545 +605 +520 +0 -2 -720 -7.50 +689
    // -369 -78 +7.50 +140 -22.50 -375). The broker statement balance is
    // smaller because it nets exchange/clearing fees, which the Position
    // History export does not include — that delta is handled via fees_usd
    // when we have a fees source, not by silently dropping fills.
    const totalPnl = result.trades.reduce((s, t) => s + t.pnl_usd, 0);
    expect(totalPnl).toBeCloseTo(917.75, 2);

    // Spot-check one of the multi-fill positions: 468156750230 has two fills,
    // PnL -697.50 and +967.50 → both must show up with distinct external_ids
    // suffixed by their Pair IDs.
    const pos230 = result.trades.filter((t) =>
      t.external_id.startsWith("468156750230-")
    );
    expect(pos230).toHaveLength(2);
    const sum230 = pos230.reduce((s, t) => s + t.pnl_usd, 0);
    expect(sum230).toBeCloseTo(270, 2);
    // Suffix should come from the Pair ID column.
    expect(pos230.map((t) => t.external_id).sort()).toEqual([
      "468156750230-468156750245",
      "468156750230-468156750256",
    ]);

    // Single-fill positions keep the bare Position ID (no suffix).
    const pos012 = result.trades.find((t) => t.external_id === "468156750012");
    expect(pos012).toBeDefined();
    expect(pos012!.pnl_usd).toBe(945);
  });
});
