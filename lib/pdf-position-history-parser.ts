// lib/pdf-position-history-parser.ts
//
// Generic position-history PDF parser. Tested with Bulenox / NinjaTrader
// exports but the detection and aggregation logic is format-agnostic — any
// broker whose "Position History" PDF exposes the canonical layout below
// should round-trip cleanly:
//
//   "Trade Date: YYYY-MM-DD ..."                    ← optional per-day header
//   "Position ID Contract Net Pos Net Price ..."    ← table header tokens
//   "<positionId> <contract> <netPos> <bought> <buyAvg> <sold> <sellAvg> <CCY> <DD/MM/YYYY|MM/DD/YYYY> HH:MM:SS <description>"
//   "Buy Price Sell Price Paired Qty Realized P/L Bought At Sold At" ← per-fill header
//   "<buyPrice> <sellPrice> <pairedQty> <realizedPnl> <date1> <time1> <date2> <time2>"
//
// Page breaks may split a position header from its fills, so we linearise the
// full document text and walk it line-by-line.
//
// Aggregation: fills sharing the same Position ID collapse to ONE TradeRow.
// `direction` is decided from the FIRST fill: if Bought At < Sold At → long.

interface TradeRow {
  external_id: string;
  external_source: "pdf_position_history";
  symbol: string;
  direction: "long" | "short";
  opened_at: string;
  closed_at: string;
  pnl_usd: number;
  fees_usd: number;
  lots: number;
  volume: number;
  entry_price: number | null;
  exit_price: number | null;
}

interface BalanceOp {
  type: string;
  amount_usd: number;
  at?: string | null;
  external_id?: string | null;
}

interface ParsedPositionHistoryPdf {
  trades: TradeRow[];
  balanceOps: BalanceOp[];
  meta: {
    accountNumber: string | null;
    currency: string | null;
    dateFormat: "MDY" | "DMY";
  };
}

interface FillRecord {
  buyPrice: number;
  sellPrice: number;
  qty: number;
  pnl: number;
  boughtAt: Date;
  soldAt: Date;
}

interface PositionAccumulator {
  positionId: string;
  contract: string;
  currency: string | null;
  fills: FillRecord[];
}

const POSITION_LINE_RE =
  /^(\d{10,15})\s+([A-Z0-9.\-_/]+)\s+\S+\s+(\d+)\s+([\d.]+)\s+(\d+)\s+([\d.]+)\s+([A-Z]{3})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})\s+/;

const FILL_LINE_RE =
  /^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(\d+)\s+(-?\d+(?:\.\d+)?)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})\s*$/;

const ACCOUNT_LINE_RE = /acc\.\s*#\s*:\s*([A-Za-z0-9\-_]+)/i;

const STRUCTURAL_TOKENS = [
  /position\s*id/i,
  /contract/i,
  /realized\s*p\/l/i,
  /bought\s*at/i,
  /sold\s*at/i,
];

/**
 * Picks MDY vs DMY by scanning every date-like token in the document.
 * - If any token has its first part > 12 → must be DMY.
 * - Else if any token has its second part > 12 → must be MDY.
 * - Else default to MDY (US convention).
 */
function detectDateFormat(text: string): "MDY" | "DMY" {
  const dateTokens = text.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g) ?? [];
  let dmyHit = false;
  let mdyHit = false;
  for (const tok of dateTokens) {
    const m = /^(\d{2})\/(\d{2})\/\d{4}$/.exec(tok);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 12) dmyHit = true;
    if (b > 12) mdyHit = true;
  }
  if (dmyHit && !mdyHit) return "DMY";
  if (mdyHit && !dmyHit) return "MDY";
  return "MDY";
}

function parseTimestamp(
  date: string,
  time: string,
  fmt: "MDY" | "DMY"
): Date {
  const dm = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date.trim());
  const tm = /^(\d{2}):(\d{2}):(\d{2})$/.exec(time.trim());
  if (!dm || !tm) {
    throw new Error(
      `pdf-position-history: invalid timestamp "${date} ${time}"`
    );
  }
  const part1 = Number(dm[1]);
  const part2 = Number(dm[2]);
  const yyyy = Number(dm[3]);
  const month = fmt === "MDY" ? part1 : part2;
  const day = fmt === "MDY" ? part2 : part1;
  const d = new Date(
    Date.UTC(yyyy, month - 1, day, Number(tm[1]), Number(tm[2]), Number(tm[3]))
  );
  if (Number.isNaN(d.getTime())) {
    throw new Error(
      `pdf-position-history: invalid date components "${date} ${time}" under ${fmt}`
    );
  }
  return d;
}

async function extractPdfText(buffer: ArrayBuffer | Buffer): Promise<string> {
  // Dynamic import keeps pdf-parse out of the Next.js client bundle and
  // sidesteps the v2 module's known build-time test-fixture quirks.
  const mod = await import("pdf-parse");
  type PDFParseCtor = new (opts: { data: Buffer }) => {
    getText: () => Promise<{ text: string }>;
  };
  const Ctor: PDFParseCtor | undefined =
    (mod as { PDFParse?: PDFParseCtor }).PDFParse ??
    (mod as unknown as { default?: { PDFParse?: PDFParseCtor } }).default
      ?.PDFParse;
  if (!Ctor) {
    throw new Error("pdf-position-history: pdf-parse PDFParse export missing");
  }
  const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const parser = new Ctor({ data });
  const result = await parser.getText();
  return result.text;
}

function looksLikePositionHistory(text: string): boolean {
  let hits = 0;
  for (const re of STRUCTURAL_TOKENS) {
    if (re.test(text)) hits += 1;
  }
  if (hits >= 4) return true;
  const tradeDateHits = (text.match(/Trade\s+Date\s*:/gi) ?? []).length;
  const hasFillHeader =
    /Buy[\s\S]{0,40}Price[\s\S]{0,40}Sell[\s\S]{0,40}Price[\s\S]{0,80}Paired[\s\S]{0,40}Qty[\s\S]{0,80}Realized\s*P\/L/i.test(
      text
    );
  return tradeDateHits >= 1 && hasFillHeader;
}

export async function parsePositionHistoryPdf(
  buffer: ArrayBuffer | Buffer
): Promise<ParsedPositionHistoryPdf> {
  const text = await extractPdfText(buffer);

  if (!looksLikePositionHistory(text)) {
    throw new Error("PDF não reconhecido como histórico de posições");
  }

  const fmt = detectDateFormat(text);
  const lines = text.split(/\r?\n/);

  let accountNumber: string | null = null;
  let detectedCurrency: string | null = null;
  const positions = new Map<string, PositionAccumulator>();
  let current: PositionAccumulator | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (!accountNumber) {
      const accMatch = ACCOUNT_LINE_RE.exec(line);
      if (accMatch) accountNumber = accMatch[1];
    }

    const posMatch = POSITION_LINE_RE.exec(line);
    if (posMatch) {
      const positionId = posMatch[1];
      const contract = posMatch[2];
      const currency = posMatch[7];
      if (!detectedCurrency) detectedCurrency = currency;
      let acc = positions.get(positionId);
      if (!acc) {
        acc = { positionId, contract, currency, fills: [] };
        positions.set(positionId, acc);
      }
      current = acc;
      continue;
    }

    const fillMatch = FILL_LINE_RE.exec(line);
    if (fillMatch && current) {
      const [
        ,
        buyPriceStr,
        sellPriceStr,
        qtyStr,
        pnlStr,
        boughtDate,
        boughtTime,
        soldDate,
        soldTime,
      ] = fillMatch;
      current.fills.push({
        buyPrice: Number.parseFloat(buyPriceStr),
        sellPrice: Number.parseFloat(sellPriceStr),
        qty: Number.parseInt(qtyStr, 10),
        pnl: Number.parseFloat(pnlStr),
        boughtAt: parseTimestamp(boughtDate, boughtTime, fmt),
        soldAt: parseTimestamp(soldDate, soldTime, fmt),
      });
    }
    // Lines that match neither (table headers, "Buy"/"Price" labels stacked
    // by the PDF text extractor, "TOTAL: records", page footers) are ignored.
  }

  const trades: TradeRow[] = [];
  const round2 = (n: number) => Math.round(n * 100) / 100;

  for (const acc of Array.from(positions.values())) {
    if (acc.fills.length === 0) continue;

    const totalQty = acc.fills.reduce((s, f) => s + f.qty, 0);
    const pnl = acc.fills.reduce((s, f) => s + f.pnl, 0);
    const weightedBuy =
      acc.fills.reduce((s, f) => s + f.buyPrice * f.qty, 0) / totalQty;
    const weightedSell =
      acc.fills.reduce((s, f) => s + f.sellPrice * f.qty, 0) / totalQty;

    let opened = acc.fills[0].boughtAt;
    let closed = acc.fills[0].boughtAt;
    for (const f of acc.fills) {
      if (f.boughtAt < opened) opened = f.boughtAt;
      if (f.soldAt < opened) opened = f.soldAt;
      if (f.boughtAt > closed) closed = f.boughtAt;
      if (f.soldAt > closed) closed = f.soldAt;
    }

    const first = acc.fills[0];
    const direction: "long" | "short" =
      first.boughtAt < first.soldAt ? "long" : "short";

    trades.push({
      external_id: acc.positionId,
      external_source: "pdf_position_history",
      symbol: acc.contract,
      direction,
      opened_at: opened.toISOString(),
      closed_at: closed.toISOString(),
      pnl_usd: round2(pnl),
      fees_usd: 0,
      lots: totalQty,
      volume: totalQty,
      entry_price: round2(weightedBuy),
      exit_price: round2(weightedSell),
    });
  }

  trades.sort((a, b) => a.opened_at.localeCompare(b.opened_at));

  return {
    trades,
    balanceOps: [],
    meta: { accountNumber, currency: detectedCurrency, dateFormat: fmt },
  };
}
