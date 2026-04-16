import * as XLSX from "xlsx";
import { createHash } from "node:crypto";
import { mt5WallTimeToUtc } from "@/lib/trading/timezone";
import { calcRiskUsd } from "@/lib/trading/instrument-specs";

export interface Mt5TradeRow {
  external_id: string;
  symbol: string;
  direction: "buy" | "sell";
  opened_at: string;
  closed_at: string;
  pnl_usd: number;
  fees_usd: number;
  entry_price: number | null;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  volume: number | null;
  risk_usd: number | null;
  rr_realized: number | null;
}

export type BalanceOperationType = "INITIAL_DEPOSIT" | "WITHDRAWAL";

export interface Mt5BalanceRow {
  type: BalanceOperationType;
  amount_usd: number;
  external_id?: string;
  at?: string;
}

export interface Mt5ParseResult {
  trades: Mt5TradeRow[];
  balanceOps: Mt5BalanceRow[];
}

/** Normalize header: trim, lowercase, remove accents, collapse spaces. */
function normalizeHeader(h: string): string {
  const s = (h ?? "").toString().trim().toLowerCase();
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse a number from various formats including European locale (1.234,56).
 * FIX TECH-002: The old code stripped all commas first, then tried to replace
 * comma with dot — a no-op. Now correctly detects EU vs US format.
 */
function parseNumber(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const trimmed = v.replace(/\s/g, "").trim();
    if (!trimmed) return 0;
    // Detect European format: comma is the last separator (e.g. "1.234,56")
    if (trimmed.includes(",")) {
      const lastComma = trimmed.lastIndexOf(",");
      const lastDot = trimmed.lastIndexOf(".");
      if (lastComma > lastDot) {
        // European: 1.234,56 → remove dots (thousands), replace comma with dot (decimal)
        const n = parseFloat(trimmed.replace(/\./g, "").replace(",", "."));
        return Number.isNaN(n) ? 0 : n;
      }
      // US with comma as thousands separator: 1,234.56 → just remove commas
      const n = parseFloat(trimmed.replace(/,/g, ""));
      return Number.isNaN(n) ? 0 : n;
    }
    const n = parseFloat(trimmed);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

// MT5 servers run in Europe/Athens (EET/EEST). Timestamps in the report are
// broker wall-time; mt5WallTimeToUtc handles DST via Intl.
function parseDate(v: unknown): string {
  if (v instanceof Date) {
    return mt5WallTimeToUtc(v);
  }
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) {
      const local = new Date(d.y, d.m - 1, d.d, d.H ?? 0, d.M ?? 0, d.S ?? 0);
      return mt5WallTimeToUtc(local);
    }
  }
  if (typeof v === "string") {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "";
    return mt5WallTimeToUtc(d);
  }
  return "";
}

function getCell(sheet: XLSX.WorkSheet, row: number, col: number): unknown {
  const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
  return cell?.v ?? cell?.w ?? "";
}

/** Find first row where every required header (normalized) is present in that row. */
function findSectionHeaderRow(
  sheet: XLSX.WorkSheet,
  range: XLSX.Range,
  requiredHeaders: string[],
  startRow: number
): number {
  for (let r = startRow; r <= range.e.r; r++) {
    const normalizedInRow: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const val = getCell(sheet, r, c);
      const h = normalizeHeader(String(val ?? ""));
      if (h) normalizedInRow.push(h);
    }
    const matches = requiredHeaders.every((req) =>
      normalizedInRow.some((h) => h === req || h.includes(req) || req.includes(h))
    );
    if (matches) return r;
  }
  return -1;
}

/** Map logical name -> column index; for duplicates (e.g. Horário), use position (0 = first). */
function buildHeaderMap(
  sheet: XLSX.WorkSheet,
  headerRow: number,
  range: XLSX.Range
): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (let c = range.s.c; c <= range.e.c; c++) {
    const raw = getCell(sheet, headerRow, c);
    const key = normalizeHeader(String(raw ?? ""));
    if (!key) continue;
    const canonical = key.replace(/\s*\/\s*/g, ""); // "s / l" -> "sl", "t / p" -> "tp"
    const base = canonical === key ? key : canonical;
    const keysToAdd = [key, base];
    if (key.includes("horario") || key.includes("time")) keysToAdd.push("horario");
    if (key.includes("position") || key.includes("posicao")) keysToAdd.push("position");
    if (key.includes("ativo") || key.includes("symbol")) keysToAdd.push("ativo");
    if (key.includes("tipo") || key.includes("type")) keysToAdd.push("tipo");
    if (key.includes("lucro") || key.includes("profit")) keysToAdd.push("lucro");
    if (key.includes("comissao") || key.includes("commission")) keysToAdd.push("comissao");
    if (key.includes("swap")) keysToAdd.push("swap");
    if (key.includes("comentario") || key.includes("comment")) keysToAdd.push("comentario");
    if (key.includes("saldo") || key.includes("balance")) keysToAdd.push("saldo");
    if (key.includes("oferta")) keysToAdd.push("oferta");
    // Price column appears twice in MT5 Posições: occurrence 0 = open, 1 = close.
    // Header is "Preço" (PT) or "Price" (EN).
    if (key === "preco" || key === "price") keysToAdd.push("preco");
    // Stop-loss header: "S / L" (original) → "sl" after slash-normalization.
    if (key === "sl" || base === "sl") keysToAdd.push("sl");
    // Take-profit header: "T / P" → "tp".
    if (key === "tp" || base === "tp") keysToAdd.push("tp");
    if (key === "volume" || key === "size") keysToAdd.push("volume");
    for (const k of Array.from(new Set(keysToAdd))) {
      const list = map.get(k) ?? [];
      list.push(c);
      map.set(k, list);
    }
  }
  return map;
}

/** Get column index by logical name; occurrence 0 = first column with that name (e.g. first Horário). */
function getCol(map: Map<string, number[]>, key: string, occurrence = 0): number {
  const list = map.get(key);
  if (!list || list.length <= occurrence) return -1;
  return list[occurrence];
}

/** True if row is empty or first cell looks like a section title. */
function isSectionBreak(
  sheet: XLSX.WorkSheet,
  row: number,
  range: XLSX.Range
): boolean {
  const first = String(getCell(sheet, row, range.s.c) ?? "").trim();
  if (!first) return true;
  const n = normalizeHeader(first);
  const sectionTitles = ["posicoes", "posições", "ordens", "transacoes", "transações", "resultados", "resumo"];
  if (sectionTitles.some((t) => n.includes(t) || t.includes(n))) return true;
  return false;
}

const POSICOES_REQUIRED = ["position", "ativo", "tipo", "comissao", "swap", "lucro"];
const TRANSACOES_REQUIRED = ["tipo", "lucro", "saldo", "comentario"];

/** Parse one data row as trade; return null if invalid. */
function parseTradeRow(
  sheet: XLSX.WorkSheet,
  row: number,
  range: XLSX.Range,
  headerMap: Map<string, number[]>
): Mt5TradeRow | null {
  const get = (c: number) => (c >= 0 ? getCell(sheet, row, c) : undefined);
  const positionCol = getCol(headerMap, "position");
  const ativoCol = getCol(headerMap, "ativo");
  const tipoCol = getCol(headerMap, "tipo");
  const lucroCol = getCol(headerMap, "lucro");
  const comissaoCol = getCol(headerMap, "comissao");
  const swapCol = getCol(headerMap, "swap");
  const horario0 = getCol(headerMap, "horario", 0);
  const horario1 = getCol(headerMap, "horario", 1);

  if (positionCol < 0 || ativoCol < 0 || tipoCol < 0 || lucroCol < 0) return null;

  const position = String(get(positionCol) ?? "").trim();
  const ativo = String(get(ativoCol) ?? "").trim();
  const tipoRaw = String(get(tipoCol) ?? "").trim().toLowerCase();
  const lucro = parseNumber(get(lucroCol));

  if (!position && !ativo) return null;
  if (tipoRaw !== "buy" && tipoRaw !== "sell") return null;
  if (!ativo) return null;

  const openedAt = horario0 >= 0 ? parseDate(get(horario0)) : "";
  const closedAt = horario1 >= 0 ? parseDate(get(horario1)) : horario0 >= 0 ? parseDate(get(horario0)) : "";
  if (!openedAt || !closedAt) return null;

  const comissao = comissaoCol >= 0 ? parseNumber(get(comissaoCol)) : 0;
  const swap = swapCol >= 0 ? parseNumber(get(swapCol)) : 0;

  // Risk/Reward columns — MT5 report has "Preço" twice (open/close) and
  // dedicated S/L, T/P, Volume columns. Any missing value → null so the
  // downstream analytics can exclude it from averages.
  const entryCol = getCol(headerMap, "preco", 0);
  const exitCol = getCol(headerMap, "preco", 1);
  const slCol = getCol(headerMap, "sl");
  const tpCol = getCol(headerMap, "tp");
  const volumeCol = getCol(headerMap, "volume");

  const entry_price = entryCol >= 0 ? parseNumber(get(entryCol)) : 0;
  const exit_price = exitCol >= 0 ? parseNumber(get(exitCol)) : 0;
  const stop_loss = slCol >= 0 ? parseNumber(get(slCol)) : 0;
  const take_profit = tpCol >= 0 ? parseNumber(get(tpCol)) : 0;
  const volume = volumeCol >= 0 ? parseNumber(get(volumeCol)) : 0;

  const entryPriceOut = entry_price > 0 ? entry_price : null;
  const exitPriceOut = exit_price > 0 ? exit_price : null;
  const stopLossOut = stop_loss > 0 ? stop_loss : null;
  const takeProfitOut = take_profit > 0 ? take_profit : null;
  const volumeOut = volume > 0 ? volume : null;

  const risk_usd =
    stopLossOut != null && entryPriceOut != null && volumeOut != null
      ? calcRiskUsd({
          symbol: ativo,
          entry: entryPriceOut,
          sl: stopLossOut,
          volume: volumeOut,
        })
      : null;

  // Match the rest of the codebase: getNetPnl = pnl_usd + fees_usd.
  // MT5 commissions/swap arrive as negative values, so adding gives net.
  const net_pnl = lucro + (comissao + swap);
  const rr_realized =
    risk_usd != null && risk_usd > 0 ? net_pnl / risk_usd : null;

  // When the broker didn't number the position, fall back to a deterministic
  // hash so re-uploading the same report doesn't insert duplicates.
  const externalId = position
    ? position
    : `hash-${createHash("sha1")
        .update(`${ativo}|${tipoRaw}|${openedAt}|${closedAt}|${lucro}|${comissao}|${swap}|${row}`)
        .digest("hex")
        .slice(0, 16)}`;

  return {
    external_id: externalId,
    symbol: ativo,
    direction: tipoRaw === "sell" ? "sell" : "buy",
    opened_at: openedAt,
    closed_at: closedAt,
    pnl_usd: lucro,
    fees_usd: comissao + swap,
    entry_price: entryPriceOut,
    exit_price: exitPriceOut,
    stop_loss: stopLossOut,
    take_profit: takeProfitOut,
    volume: volumeOut,
    risk_usd,
    rr_realized,
  };
}

/** Parse one Transações row as balance op when Tipo=balance; use Comentário for INITIAL_DEPOSIT/WITHDRAWAL. */
function parseBalanceRow(
  sheet: XLSX.WorkSheet,
  row: number,
  headerMap: Map<string, number[]>
): Mt5BalanceRow | null {
  const get = (c: number) => (c >= 0 ? getCell(sheet, row, c) : undefined);
  const tipoCol = getCol(headerMap, "tipo");
  const lucroCol = getCol(headerMap, "lucro");
  const comentarioCol = getCol(headerMap, "comentario");
  const horarioCol = getCol(headerMap, "horario", 0);
  const ofertaCol = getCol(headerMap, "oferta");

  if (tipoCol < 0 || lucroCol < 0) return null;

  const tipo = String(get(tipoCol) ?? "").trim().toLowerCase();
  if (tipo !== "balance") return null;

  const comentario = comentarioCol >= 0 ? String(get(comentarioCol) ?? "").toLowerCase() : "";
  const lucro = parseNumber(get(lucroCol));

  if (comentario.includes("initial_deposit") || (comentario.includes("deposit") && !comentario.includes("withdrawal"))) {
    return {
      type: "INITIAL_DEPOSIT",
      amount_usd: lucro > 0 ? lucro : Math.abs(lucro),
      external_id: ofertaCol >= 0 ? String(get(ofertaCol) ?? "").trim() || undefined : undefined,
      at: horarioCol >= 0 ? parseDate(get(horarioCol)) || undefined : undefined,
    };
  }
  if (comentario.includes("withdrawal") || comentario.includes("withdraw")) {
    return {
      type: "WITHDRAWAL",
      amount_usd: Math.abs(lucro),
      external_id: ofertaCol >= 0 ? String(get(ofertaCol) ?? "").trim() || undefined : undefined,
      at: horarioCol >= 0 ? parseDate(get(horarioCol)) || undefined : undefined,
    };
  }
  return null;
}

/**
 * Parse MT5 XLSX report: extract closed positions (trades) and balance operations.
 * Real format: single sheet (e.g. Sheet1), section "Posições" with header on row 7,
 * section "Transações" with header further down (e.g. row 54). Headers in Portuguese with accents.
 */
export function parseMt5Xlsx(buffer: ArrayBuffer): Mt5ParseResult {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const trades: Mt5TradeRow[] = [];
  const balanceOps: Mt5BalanceRow[] = [];

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { trades, balanceOps };
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { trades, balanceOps };

  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

  // 1) Find Posições section: header row must contain Position, Ativo, Tipo, Comissão, Swap, Lucro
  const posicoesHeaderRow = findSectionHeaderRow(sheet, range, POSICOES_REQUIRED, 0);
  if (posicoesHeaderRow >= 0) {
    const posicoesMap = buildHeaderMap(sheet, posicoesHeaderRow, range);
    for (let r = posicoesHeaderRow + 1; r <= range.e.r; r++) {
      if (isSectionBreak(sheet, r, range)) break;
      const trade = parseTradeRow(sheet, r, range, posicoesMap);
      if (trade) trades.push(trade);
    }
  }

  // 2) Find Transações section: header row must contain Tipo, Lucro, Saldo, Comentário
  const transacoesHeaderRow = findSectionHeaderRow(
    sheet,
    range,
    TRANSACOES_REQUIRED,
    posicoesHeaderRow >= 0 ? posicoesHeaderRow + 1 : 0
  );
  if (transacoesHeaderRow >= 0) {
    const transacoesMap = buildHeaderMap(sheet, transacoesHeaderRow, range);
    for (let r = transacoesHeaderRow + 1; r <= range.e.r; r++) {
      if (isSectionBreak(sheet, r, range)) break;
      const balance = parseBalanceRow(sheet, r, transacoesMap);
      if (balance) balanceOps.push(balance);
    }
  }

  return { trades, balanceOps };
}
