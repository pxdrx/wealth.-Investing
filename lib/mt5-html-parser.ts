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

/** MT5 report times are UTC+2 (broker server). Convert to UTC then store. Offset: -5h */
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

/** Normalize header: trim, lowercase, remove accents, collapse spaces. */
function normalizeHeader(h: string): string {
  return (h ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Get cell texts for a row (td, th), trimmed */
function getRowCells($: cheerio.CheerioAPI, row: cheerio.Cheerio<any>): string[] {
  const cells: string[] = [];
  row.find("td, th").each((_, el) => {
    cells.push(($(el).text() ?? "").trim().replace(/\u00A0/g, " "));
  });
  return cells;
}

/** Build a name→index map from header cells, with multilingual aliases */
function buildHtmlHeaderMap(cells: string[]): Map<string, number> {
  const map = new Map<string, number>();

  for (let i = 0; i < cells.length; i++) {
    const norm = normalizeHeader(cells[i]);
    if (!norm) continue;

    // Store the normalized header
    if (!map.has(norm)) map.set(norm, i);

    // Multilingual aliases (PT + EN)
    if (norm.includes("horario") || norm.includes("time") || norm.includes("hora") || norm.includes("date")) {
      // For time columns, we want first=open, second=close
      if (!map.has("time")) map.set("time", i);
      else if (!map.has("time2")) map.set("time2", i);
    }
    if (norm.includes("position") || norm.includes("posicao") || norm.includes("ticket") || norm === "id") {
      if (!map.has("position")) map.set("position", i);
    }
    if (norm.includes("ativo") || norm.includes("symbol") || norm.includes("simbolo") || norm.includes("instrumento") || norm.includes("instrument")) {
      if (!map.has("symbol")) map.set("symbol", i);
    }
    if (norm.includes("tipo") || norm.includes("type") || norm.includes("direcao") || norm.includes("direction") || norm.includes("action")) {
      if (!map.has("type")) map.set("type", i);
    }
    if (norm.includes("lucro") || norm.includes("profit") || norm.includes("resultado") || norm.includes("result") || norm.includes("ganho")) {
      if (!map.has("profit")) map.set("profit", i);
    }
    if (norm.includes("comissao") || norm.includes("commission") || norm.includes("fee")) {
      if (!map.has("commission")) map.set("commission", i);
    }
    if (norm.includes("swap")) {
      if (!map.has("swap")) map.set("swap", i);
    }
    if (norm.includes("comentario") || norm.includes("comment") || norm.includes("nota") || norm.includes("note") || norm.includes("description")) {
      if (!map.has("comment")) map.set("comment", i);
    }
    if (norm.includes("saldo") || norm.includes("balance")) {
      if (!map.has("balance")) map.set("balance", i);
    }
    if (norm.includes("oferta") || norm.includes("deal") || norm.includes("order")) {
      if (!map.has("deal")) map.set("deal", i);
    }
    if (norm.includes("preco") || norm.includes("price")) {
      if (!map.has("price")) map.set("price", i);
      else if (!map.has("price2")) map.set("price2", i);
    }
    if (norm.includes("volume") || norm.includes("lots") || norm.includes("lotes")) {
      if (!map.has("volume")) map.set("volume", i);
    }
    if (norm.includes("sl") || norm === "s / l" || norm === "s/l") {
      if (!map.has("sl")) map.set("sl", i);
    }
    if (norm.includes("tp") || norm === "t / p" || norm === "t/p") {
      if (!map.has("tp")) map.set("tp", i);
    }
  }

  return map;
}

/** Get cell value by alias, or fallback to index */
function getByAlias(cells: string[], map: Map<string, number>, alias: string, fallbackIdx?: number): string {
  const idx = map.get(alias);
  if (idx !== undefined && idx < cells.length) return cells[idx];
  if (fallbackIdx !== undefined && fallbackIdx < cells.length) return cells[fallbackIdx];
  return "";
}

const NEXT_SECTION_KEYS = ["transações", "transacoes", "transactions", "deals", "balance", "total", "subtotal"];

/** True if this row starts the next section or is a totals/subtotals row */
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

  // ── POSITIONS SECTION ──
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
    // Build header map from the Positions header row
    const headerCells = getRowCells($, allRows[positionsStartRow]);
    const headerMap = buildHtmlHeaderMap(headerCells);
    const dataStart = positionsStartRow + 1;

    for (let r = dataStart; r < allRows.length; r++) {
      const cells = getRowCells($, allRows[r]);
      if (isNextSectionOrTotalRow($, allRows[r], cells)) break;
      if (cells.length < 5) continue;

      // Get position ID — try header map first, fallback to column 1
      const positionCell = getByAlias(cells, headerMap, "position", 1);
      if (!isNumeric(positionCell)) continue;

      // Get type/direction — try header map first, fallback to column 3
      const tipo = getByAlias(cells, headerMap, "type", 3).toLowerCase();
      if (tipo !== "buy" && tipo !== "sell") continue;

      // Get dates — try header map first, fallback to known columns
      const openedAtRaw = getByAlias(cells, headerMap, "time", 0);
      const closedAtRaw = getByAlias(cells, headerMap, "time2", 9);
      const openedAt = mt5DateToIso(openedAtRaw);
      const closedAt = mt5DateToIso(closedAtRaw);
      if (!openedAt || !closedAt) continue;

      const closedYear = new Date(closedAt).getFullYear();
      if (closedYear < 2000) continue;

      // Get P&L — try header map first, fallback to column 13
      const pnl_usd = parseNum(getByAlias(cells, headerMap, "profit", 13));
      if (Math.abs(pnl_usd) > 10_000_000) continue;

      // Get fees
      const comissao = parseNum(getByAlias(cells, headerMap, "commission", 11));
      const swap = parseNum(getByAlias(cells, headerMap, "swap", 12));

      // Get symbol — try header map first, fallback to column 2
      const symbol = getByAlias(cells, headerMap, "symbol", 2).trim();
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

  // ── TRANSACTIONS SECTION ──
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
    // Build header map for transactions section
    const txHeaderCells = getRowCells($, allRows[transacoesStartRow]);
    const txHeaderMap = buildHtmlHeaderMap(txHeaderCells);

    for (let r = transacoesStartRow + 1; r < allRows.length; r++) {
      const cells = getRowCells($, allRows[r]);
      if (cells.length < 5) continue;

      const tipo = getByAlias(cells, txHeaderMap, "type", 3).toLowerCase() ||
                   getByAlias(cells, txHeaderMap, "type", 2).toLowerCase();
      if (tipo !== "balance") continue;

      const comment = getByAlias(cells, txHeaderMap, "comment", 11).toLowerCase() ||
                      getByAlias(cells, txHeaderMap, "comment", 10).toLowerCase();
      const amountStr = getByAlias(cells, txHeaderMap, "profit", 4) ||
                        getByAlias(cells, txHeaderMap, "profit", 5) ||
                        getByAlias(cells, txHeaderMap, "profit", 6);
      const amount = parseNum(amountStr);
      const atRaw = getByAlias(cells, txHeaderMap, "time", 0);
      const at = atRaw ? mt5DateToIso(atRaw) || null : null;
      const externalId = getByAlias(cells, txHeaderMap, "deal", 1).trim() || null;

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
