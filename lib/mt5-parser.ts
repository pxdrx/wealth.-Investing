import * as XLSX from "xlsx";

export interface Mt5TradeRow {
  external_id: string;
  symbol: string;
  direction: "buy" | "sell";
  opened_at: string;
  closed_at: string;
  pnl_usd: number;
  fees_usd: number;
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

function parseDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(d.y, d.m - 1, d.d, d.H ?? 0, d.M ?? 0, d.S ?? 0).toISOString();
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? "" : d.toISOString();
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
    for (const k of keysToAdd) {
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

  return {
    external_id: position || `row-${row}`,
    symbol: ativo,
    direction: tipoRaw === "sell" ? "sell" : "buy",
    opened_at: openedAt,
    closed_at: closedAt,
    pnl_usd: lucro,
    fees_usd: comissao + swap,
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
