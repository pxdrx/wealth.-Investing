import * as cheerio from "cheerio";
import { inferCategory } from "@/lib/trading/category";

export interface Mt5HtmlTrade {
  external_id: string;
  symbol: string;
  direction: "buy" | "sell";
  opened_at: string;
  closed_at: string;
  pnl_usd: number;
  fees_usd: number;
  category: string;
}

export interface Mt5HtmlBalanceOp {
  type: "INITIAL_DEPOSIT" | "WITHDRAWAL";
  amount_usd: number;
  at: string | null;
  external_id: string | null;
}

export interface Mt5HtmlParseResult {
  trades: Mt5HtmlTrade[];
  balanceOps: Mt5HtmlBalanceOp[];
}

/** Decode buffer as UTF-16-LE (MT5 report encoding). */
function decodeUtf16Le(buffer: ArrayBuffer): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer).toString("utf16le");
  }
  return new TextDecoder("utf-16le", { fatal: false }).decode(buffer);
}

/** MT5 report times are UTC+2 (broker server). Convert to UTC then store (equiv. America/Sao_Paulo -3). Offset: -5h */
const MT5_TO_UTC_MS = -5 * 60 * 60 * 1000;

/** MT5 date format "2026.02.09 17:45:29" (UTC+2) → ISO in UTC */
function mt5DateToIso(s: string): string {
  const raw = (s ?? "").toString().replace(/\u00A0/g, " ").trim();
  if (!raw) return "";
  const m = raw.match(/^(\d{4})[./](\d{2})[./](\d{2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const [, y, mo, d, h, min, sec] = m;
    const date = new Date(
      parseInt(y!, 10),
      parseInt(mo!, 10) - 1,
      parseInt(d!, 10),
      parseInt(h!, 10),
      parseInt(min!, 10),
      parseInt(sec ?? "0", 10)
    );
    if (isNaN(date.getTime())) return "";
    const adjusted = new Date(date.getTime() + MT5_TO_UTC_MS);
    return adjusted.toISOString();
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  const adjusted = new Date(d.getTime() + MT5_TO_UTC_MS);
  return adjusted.toISOString();
}

function parseNum(s: string): number {
  const v = (s ?? "").toString().replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
}

function isNumeric(s: string): boolean {
  const t = (s ?? "").toString().trim();
  if (!t) return false;
  return /^-?\d+([.,]\d+)?$/.test(t.replace(/\s/g, ""));
}

/** Get cell texts for a row (td, th), trimmed */
function getRowCells($: cheerio.CheerioAPI, row: cheerio.Cheerio<any>): string[] {
  const cells: string[] = [];
  row.find("td, th").each((_, el) => {
    cells.push(($(el).text() ?? "").trim().replace(/\u00A0/g, " "));
  });
  return cells;
}

const NEXT_SECTION_KEYS = ["transações", "transacoes", "transactions", "deals", "balance", "total", "subtotal"];

/** True if this row starts the next section (e.g. Transações, Deals, Balance) or is a totals/subtotals row */
function isNextSectionOrTotalRow($: cheerio.CheerioAPI, row: cheerio.Cheerio<any>, cells: string[]): boolean {
  let hasSectionTh = false;
  row.find("th").each((_, th) => {
    const t = ($(th).text() ?? "").trim().toLowerCase();
    if (NEXT_SECTION_KEYS.some((k) => t === k || t.includes(k))) hasSectionTh = true;
  });
  if (hasSectionTh) return true;
  const rowText = cells.join(" ").toLowerCase();
  if (NEXT_SECTION_KEYS.some((k) => rowText === k || rowText.startsWith(k + " ") || cells[0]?.toLowerCase() === k)) {
    return true;
  }
  return false;
}

export function parseMt5Html(buffer: ArrayBuffer): Mt5HtmlParseResult {
  const html = decodeUtf16Le(buffer);
  const $ = cheerio.load(html);
  const trades: Mt5HtmlTrade[] = [];
  const balanceOps: Mt5HtmlBalanceOp[] = [];

  const allRows: cheerio.Cheerio<any>[] = [];
  $("tr").each((_, el) => {
    allRows.push($(el));
  });

  let positionsStartRow = -1;
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    row.find("th").each((_, th) => {
      const text = $(th).text().trim().toLowerCase();
      if (text === "posições" || text === "posicoes" || text === "positions") {
        positionsStartRow = i;
      }
    });
    if (positionsStartRow >= 0) break;
  }

  if (positionsStartRow >= 0) {
    const headerRow = allRows[positionsStartRow];
    const headerCells = getRowCells($, headerRow);
    const dataStart = positionsStartRow + 1;

    for (let r = dataStart; r < allRows.length; r++) {
      const cells = getRowCells($, allRows[r]);
      if (isNextSectionOrTotalRow($, allRows[r], cells)) break;
      if (cells.length < 14) continue;
      const positionCell = cells[1];
      if (!isNumeric(positionCell)) continue;
      const tipo = (cells[3] ?? "").toLowerCase();
      if (tipo !== "buy" && tipo !== "sell") continue;

      const openedAt = mt5DateToIso(cells[0] ?? "");
      const closedAt = mt5DateToIso(cells[9] ?? "");
      if (!openedAt || !closedAt) continue;

      const closedYear = closedAt ? new Date(closedAt).getFullYear() : 0;
      if (closedYear < 2000) continue;

      const pnl_usd = parseNum(cells[13] ?? "0");
      if (Math.abs(pnl_usd) > 10_000_000) continue;

      const comissao = parseNum(cells[11] ?? "0");
      const swap = parseNum(cells[12] ?? "0");
      const symbol = (cells[2] ?? "").trim();
      if (!symbol) continue;

      trades.push({
        external_id: positionCell.trim(),
        symbol,
        direction: tipo === "sell" ? "sell" : "buy",
        opened_at: openedAt,
        closed_at: closedAt,
        pnl_usd,
        fees_usd: comissao + swap,
        category: inferCategory(symbol) || "other",
      });
    }
  }

  let transacoesStartRow = -1;
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    row.find("th, td").each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      if (text === "transações" || text === "transacoes" || text === "transactions") {
        transacoesStartRow = i;
      }
    });
    if (transacoesStartRow >= 0) break;
  }

  if (transacoesStartRow >= 0) {
    for (let r = transacoesStartRow + 1; r < allRows.length; r++) {
      const cells = getRowCells($, allRows[r]);
      if (cells.length < 5) continue;
      const tipo = (cells[3] ?? cells[2] ?? "").toLowerCase();
      if (tipo !== "balance") continue;
      const comment = (cells[11] ?? cells[10] ?? "").toLowerCase();
      const amount = parseNum(cells[4] ?? cells[5] ?? "0") || parseNum(cells[6] ?? "0");
      const atRaw = cells[0] ?? "";
      const at = atRaw ? mt5DateToIso(atRaw) || null : null;
      const externalId = (cells[1] ?? "").trim() || null;

      if (comment.includes("initial_deposit") || (comment.includes("deposit") && !comment.includes("withdrawal"))) {
        balanceOps.push({ type: "INITIAL_DEPOSIT", amount_usd: Math.abs(amount), at, external_id: externalId });
      } else if (comment.includes("withdrawal") || comment.includes("withdraw")) {
        balanceOps.push({ type: "WITHDRAWAL", amount_usd: Math.abs(amount), at, external_id: externalId });
      }
    }
  }

  if (trades.length === 0) {
    throw new Error("MT5 HTML parse failed: no trades found in Positions section");
  }

  return { trades, balanceOps };
}
