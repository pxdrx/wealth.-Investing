// lib/csv-adaptive-parser.ts
//
// Coringa CSV parser: resolve colunas canônicas de qualquer export de corretora
// via pipeline de 4 camadas (alias exato → fuzzy/substring → sniffing por tipo
// → derivação). Retorna mapeamento + warnings para UI surface no preview.
//
// Reuso deliberado: as funções normalizeHeader() e parseNumber() são
// duplicadas (e estendidas) de lib/mt5-parser.ts intencionalmente para isolar
// esse módulo do risco de regressão do parser XLSX existente.

import { createHash } from "node:crypto";

// ─── tipos públicos ─────────────────────────────────────────────────────────

export type CanonicalField =
  | "external_id"
  | "symbol"
  | "pnl_usd"
  | "commission"
  | "swap"
  | "volume"
  | "direction"
  | "opened_at"
  | "closed_at"
  | "bought_ts"
  | "sold_ts"
  | "net_pos"
  | "currency"
  | "price_open"
  | "price_close";

export interface CsvAdaptiveTrade {
  external_id: string;
  symbol: string;
  direction: "buy" | "sell";
  opened_at: string;
  closed_at: string;
  pnl_usd: number;
  fees_usd: number;
  external_source: string;
  lots?: number;
}

export interface MappingEntry {
  header: string;
  column: number;
  confidence: "alias" | "fuzzy" | "sniff" | "derived";
}

export interface CsvAdaptiveResult {
  trades: CsvAdaptiveTrade[];
  balanceOps: [];
  mapping: Partial<Record<CanonicalField, MappingEntry>>;
  warnings: string[];
  broker_hint: "tradovate" | "generic";
  external_source: string;
  rows_total: number;
  rows_skipped_open_position: number;
  rows_skipped_invalid: number;
  /** Raw header row detected in the file (post-noise filter, pre-normalize). */
  headers: string[];
  /** Detected cell separator (",", ";", "\t", "|"). */
  separator: string;
  /** Detected source encoding (best-effort: "utf-8" for now). */
  encoding: string;
}

export interface ParseCsvAdaptiveOptions {
  /**
   * Additional aliases merged on top of the static ALIASES dictionary before
   * running the column-matching pipeline. Keys are canonical field names;
   * values are raw header strings (will be normalized internally).
   *
   * Typical source: rows from the `import_alias_vocabulary` DB table so the
   * parser slowly learns broker-specific header variants without code changes.
   */
  extraAliases?: Record<string, string[]>;
}

// ─── normalização ───────────────────────────────────────────────────────────

function normalizeHeader(h: string): string {
  return (h ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()[\]{}_\-\\]/g, " ")
    .replace(/[/&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse number tolerating EU (1.234,56), US (1,234.56), parentheses-negatives,
 * currency symbols. Returns null on invalid (distinct from 0) so we can tell
 * "missing" apart from "zero".
 */
function parseNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  if (typeof v !== "string") return null;
  const trimmed = v.replace(/[$€£¥\s]/g, "").trim();
  if (!trimmed || trimmed === "-" || trimmed === "--" || trimmed === "N/A") return null;
  const neg = /^\(.+\)$/.test(trimmed);
  const body = neg ? trimmed.slice(1, -1) : trimmed;
  if (!/^-?[\d.,]+$/.test(body)) return null;
  let n: number;
  if (body.includes(",") && body.includes(".")) {
    const lastComma = body.lastIndexOf(",");
    const lastDot = body.lastIndexOf(".");
    n =
      lastComma > lastDot
        ? parseFloat(body.replace(/\./g, "").replace(",", "."))
        : parseFloat(body.replace(/,/g, ""));
  } else if (body.includes(",")) {
    const parts = body.split(",");
    const looksLikeThousands =
      parts.length > 1 && parts.slice(1).every((p) => p.length === 3);
    n = looksLikeThousands
      ? parseFloat(body.replace(/,/g, ""))
      : parseFloat(body.replace(",", "."));
  } else {
    n = parseFloat(body);
  }
  if (Number.isNaN(n)) return null;
  return neg ? -n : n;
}

// ─── CSV splitting (quote-aware) ────────────────────────────────────────────

function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delim) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function detectDelimiter(lines: string[]): string {
  const candidates = [",", ";", "\t", "|"];
  const sample = lines.slice(0, Math.min(10, lines.length)).filter((l) => l.trim());
  if (sample.length === 0) return ",";
  let best = ",";
  let bestScore = -Infinity;
  for (const d of candidates) {
    const counts = sample.map((l) => splitCsvLine(l, d).length);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    if (mean < 3) continue;
    const variance =
      counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length;
    const stability = mean / (1 + variance);
    if (stability > bestScore) {
      bestScore = stability;
      best = d;
    }
  }
  return best;
}

// ─── dicionário de aliases ──────────────────────────────────────────────────

const ALIASES: Record<CanonicalField, string[]> = {
  external_id: [
    "position id",
    "positionid",
    "ticket",
    "order id",
    "deal",
    "deal id",
    "trade id",
    "trade number",
    "order number",
    "ref",
    "reference",
    "ordem",
    "numero ordem",
    "id",
  ],
  symbol: [
    "contract",
    "symbol",
    "ativo",
    "instrument",
    "instrumento",
    "product",
    "par",
    "pair",
    "ticker",
    "simbolo",
  ],
  pnl_usd: [
    "p l",
    "pl",
    "p and l",
    "pnl",
    "profit",
    "profit loss",
    "net profit",
    "net p l",
    "net pl",
    "lucro",
    "lucro liquido",
    "resultado",
    "realized pnl",
    "ganancia",
    "gross profit",
  ],
  commission: ["commission", "comissao", "comision", "fee", "fees", "taxa", "taxas"],
  swap: ["swap", "rollover", "juros", "financing"],
  volume: [
    "volume",
    "paired qty",
    "qty",
    "quantity",
    "lots",
    "size",
    "cantidad",
    "contratos",
    "shares",
  ],
  direction: [
    "type",
    "side",
    "direction",
    "action",
    "tipo",
    "operacao",
    "lado",
  ],
  opened_at: [
    "open time",
    "opened",
    "opened at",
    "entry time",
    "timestamp open",
    "abertura",
    "open date",
    "horario abertura",
    "time opened",
  ],
  closed_at: [
    "close time",
    "closed",
    "closed at",
    "exit time",
    "timestamp close",
    "fechamento",
    "close date",
    "horario fechamento",
    "time closed",
  ],
  bought_ts: ["bought timestamp", "buy time", "long entry time", "horario compra"],
  sold_ts: ["sold timestamp", "sell time", "short entry time", "horario venda"],
  net_pos: [
    "net pos",
    "net position",
    "position qty",
    "open qty",
    "posicao aberta",
  ],
  currency: ["currency", "ccy", "moeda", "divisa"],
  price_open: [
    "open price",
    "avg buy",
    "avg sell",
    "avg. buy",
    "avg. sell",
    "entry price",
    "buy price",
    "sell price",
    "preco abertura",
  ],
  price_close: ["close price", "exit price", "preco fechamento"],
};

const NORMALIZED_ALIASES: Record<CanonicalField, string[]> = Object.fromEntries(
  (Object.entries(ALIASES) as Array<[CanonicalField, string[]]>).map(([k, v]) => [
    k,
    v.map(normalizeHeader),
  ])
) as Record<CanonicalField, string[]>;

/**
 * Merges caller-supplied aliases on top of the static NORMALIZED_ALIASES.
 * Only canonical fields known to the parser are honored; unknown keys are
 * ignored silently.
 */
function buildNormalizedAliases(
  extra: Record<string, string[]> | undefined
): Record<CanonicalField, string[]> {
  if (!extra) return NORMALIZED_ALIASES;
  const merged: Record<CanonicalField, string[]> = Object.fromEntries(
    (Object.entries(NORMALIZED_ALIASES) as Array<[CanonicalField, string[]]>).map(([k, v]) => [
      k,
      v.slice(),
    ])
  ) as Record<CanonicalField, string[]>;
  for (const [k, vals] of Object.entries(extra)) {
    if (!(k in merged)) continue;
    const key = k as CanonicalField;
    const seen = new Set(merged[key]);
    for (const raw of vals ?? []) {
      const norm = normalizeHeader(raw);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      merged[key].push(norm);
    }
  }
  return merged;
}

// ─── fuzzy helpers ──────────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  const dp: number[] = Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : Math.min(prev, dp[j], dp[j - 1]) + 1;
      prev = tmp;
    }
  }
  return dp[n];
}

function tokens(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

function tokenOverlap(a: string, b: string): number {
  const ta = tokens(a);
  const tb = new Set(tokens(b));
  if (ta.length === 0 || tb.size === 0) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit++;
  return hit / Math.min(ta.length, tb.size);
}

// ─── header row detection ───────────────────────────────────────────────────

function detectHeaderRow(
  rows: string[][],
  aliasMap: Record<CanonicalField, string[]> = NORMALIZED_ALIASES
): number {
  let best = 0;
  let bestScore = -1;
  const checkUpTo = Math.min(10, rows.length);
  for (let i = 0; i < checkUpTo; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;
    const nonNumeric = row.filter((c) => c && parseNumber(c) === null).length;
    const distinct = new Set(row.filter((c) => c).map((c) => c.toLowerCase())).size;
    let aliasHits = 0;
    for (const cell of row) {
      const n = normalizeHeader(cell);
      for (const aliases of Object.values(aliasMap)) {
        if (aliases.includes(n)) {
          aliasHits++;
          break;
        }
      }
    }
    const score = aliasHits * 10 + nonNumeric + distinct;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

// ─── sniffing por coluna ────────────────────────────────────────────────────

interface ColumnProfile {
  dateLike: boolean;
  dateFormat?: "mdy" | "dmy" | "ymd" | "epoch";
  numberSigned: boolean;
  numberPositive: boolean;
  variance: number;
  absMean: number;
  idLike: boolean;
  uniqueness: number;
  tickerLike: boolean;
  enumSide: boolean;
  currencyCode: boolean;
  nonEmpty: number;
}

function profileColumn(values: string[]): ColumnProfile {
  let dateCount = 0;
  let numberCount = 0;
  const numbers: number[] = [];
  const uniqueVals = new Set<string>();
  let nonEmpty = 0;
  let tickerShape = 0;
  let sideMatch = 0;
  let currencyMatch = 0;
  let idShape = 0;
  let firstGroupOver12 = false;
  let secondGroupOver12 = false;
  let ymdCount = 0;
  let epochCount = 0;

  for (const raw of values) {
    const v = raw?.trim() ?? "";
    if (!v) continue;
    nonEmpty++;
    uniqueVals.add(v);

    const mdy = v.match(
      /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})([ T]\d{1,2}:\d{2}(:\d{2})?)?$/
    );
    const ymd = v.match(
      /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})([ T]\d{1,2}:\d{2}(:\d{2})?)?$/
    );
    const epoch = /^\d{10}$|^\d{13}$/.test(v);
    if (mdy) {
      dateCount++;
      const a = parseInt(mdy[1], 10);
      const b = parseInt(mdy[2], 10);
      if (a > 12) firstGroupOver12 = true;
      if (b > 12) secondGroupOver12 = true;
    } else if (ymd) {
      dateCount++;
      ymdCount++;
    } else if (epoch) {
      dateCount++;
      epochCount++;
    }

    const n = parseNumber(v);
    if (n !== null) {
      numberCount++;
      numbers.push(n);
    }

    if (/^[A-Z0-9]{2,10}$/.test(v)) tickerShape++;
    if (/^(buy|sell|long|short|compra|venda|b|s|l)$/i.test(v)) sideMatch++;
    if (
      /^(USD|EUR|BRL|GBP|JPY|CHF|CAD|AUD|NZD|CNY|MXN|ZAR|HKD|SGD)$/i.test(v)
    )
      currencyMatch++;
    if (/^[A-Za-z0-9\-_]{6,}$/.test(v) && !/^-?\d+(?:\.\d+)?$/.test(v)) idShape++;
  }

  const mean = numbers.length
    ? numbers.reduce((a, b) => a + b, 0) / numbers.length
    : 0;
  const variance = numbers.length
    ? numbers.reduce((a, b) => a + (b - mean) ** 2, 0) / numbers.length
    : 0;
  const absMean = numbers.length
    ? numbers.reduce((a, b) => a + Math.abs(b), 0) / numbers.length
    : 0;
  const hasPos = numbers.some((n) => n > 0);
  const hasNeg = numbers.some((n) => n < 0);

  const dateRatio = nonEmpty ? dateCount / nonEmpty : 0;
  const dateLike = dateRatio >= 0.8;
  let dateFormat: ColumnProfile["dateFormat"];
  if (dateLike) {
    if (epochCount / Math.max(1, dateCount) > 0.5) dateFormat = "epoch";
    else if (ymdCount / Math.max(1, dateCount) > 0.5) dateFormat = "ymd";
    else if (firstGroupOver12) dateFormat = "dmy";
    else if (secondGroupOver12) dateFormat = "mdy";
    else dateFormat = "mdy";
  }

  return {
    dateLike,
    dateFormat,
    numberSigned: hasPos && hasNeg,
    numberPositive:
      hasPos && !hasNeg && numberCount >= Math.max(3, nonEmpty * 0.8),
    variance,
    absMean,
    idLike:
      idShape / Math.max(1, nonEmpty) >= 0.8 &&
      uniqueVals.size / nonEmpty >= 0.95 &&
      nonEmpty >= 3,
    uniqueness: uniqueVals.size / Math.max(1, nonEmpty),
    tickerLike:
      tickerShape / Math.max(1, nonEmpty) >= 0.8 &&
      uniqueVals.size < 50 &&
      nonEmpty >= 3,
    enumSide:
      sideMatch / Math.max(1, nonEmpty) >= 0.8 && uniqueVals.size <= 5,
    currencyCode: currencyMatch / Math.max(1, nonEmpty) >= 0.8,
    nonEmpty,
  };
}

// ─── resolução de campos (4 camadas) ────────────────────────────────────────

interface Candidate {
  column: number;
  score: number;
  confidence: MappingEntry["confidence"];
  header: string;
}

function resolveField(
  field: CanonicalField,
  headers: string[],
  profiles: ColumnProfile[],
  used: Set<number>,
  aliasMap: Record<CanonicalField, string[]> = NORMALIZED_ALIASES
): Candidate | null {
  const candidates: Candidate[] = [];
  const aliases = aliasMap[field];
  const normalizedHeaders = headers.map((h) => normalizeHeader(h));

  // Camada 1 — alias exato
  for (let c = 0; c < headers.length; c++) {
    if (used.has(c)) continue;
    if (aliases.includes(normalizedHeaders[c])) {
      candidates.push({
        column: c,
        score: 10,
        confidence: "alias",
        header: headers[c],
      });
    }
  }

  // Camada 2 — fuzzy por tokens (sem substring bruto; evita "type" casar em "priceformattype")
  if (candidates.length === 0) {
    for (let c = 0; c < headers.length; c++) {
      if (used.has(c)) continue;
      const nh = normalizedHeaders[c];
      if (!nh) continue;
      const headerTokens = new Set(tokens(nh));
      let best = 0;
      for (const a of aliases) {
        const aliasTokens = tokens(a);
        if (aliasTokens.length === 0) continue;
        // Todos os tokens do alias devem estar presentes no header → match forte
        const allTokensPresent = aliasTokens.every((t) => headerTokens.has(t));
        if (allTokensPresent) best = Math.max(best, 5);
        // overlap parcial
        else {
          const overlap = tokenOverlap(nh, a);
          if (overlap >= 0.5) best = Math.max(best, 4);
          else if (nh.length <= 8 && a.length <= 8 && levenshtein(nh, a) <= 2)
            best = Math.max(best, 3);
        }
      }
      if (best > 0)
        candidates.push({
          column: c,
          score: best,
          confidence: "fuzzy",
          header: headers[c],
        });
    }
  }

  // Camada 3 — sniffing (somente para campos onde o tipo de valor é distintivo)
  if (candidates.length === 0) {
    for (let c = 0; c < headers.length; c++) {
      if (used.has(c)) continue;
      const p = profiles[c];
      let score = 0;
      switch (field) {
        case "pnl_usd":
          if (p.numberSigned && p.absMean > 0.01 && p.absMean < 100000 && p.variance > 0)
            score = 3;
          break;
        case "external_id":
          if (p.idLike) score = 3;
          break;
        case "symbol":
          if (p.tickerLike) score = 3;
          break;
        case "direction":
          if (p.enumSide) score = 3;
          break;
        case "currency":
          if (p.currencyCode) score = 3;
          break;
        case "opened_at":
        case "closed_at":
        case "bought_ts":
        case "sold_ts":
          if (p.dateLike) score = 2;
          break;
        // commission/swap/volume/price_* NÃO caem em sniff (qualquer coluna
        // numérica positiva casaria — gera falso positivo).
      }
      if (score > 0)
        candidates.push({
          column: c,
          score,
          confidence: "sniff",
          header: headers[c],
        });
    }
  }

  if (candidates.length === 0) return null;

  // tiebreaker: pnl_usd prefere maior variância; ids preferem maior uniqueness;
  // demais campos preferem a posição do alias mais canônica (menor índice).
  const aliasRank = (header: string): number => {
    const norm = normalizeHeader(header);
    const idx = aliases.indexOf(norm);
    return idx === -1 ? 999 : idx;
  };
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (field === "pnl_usd") {
      return (profiles[b.column]?.variance ?? 0) - (profiles[a.column]?.variance ?? 0);
    }
    if (field === "external_id") {
      return (profiles[b.column]?.uniqueness ?? 0) - (profiles[a.column]?.uniqueness ?? 0);
    }
    const ra = aliasRank(a.header);
    const rb = aliasRank(b.header);
    if (ra !== rb) return ra - rb;
    return a.column - b.column;
  });
  return candidates[0];
}

// ─── parse de data flexível ─────────────────────────────────────────────────

function parseFlexDate(v: string, format: ColumnProfile["dateFormat"]): string {
  const s = v?.trim() ?? "";
  if (!s) return "";
  if (/^\d{10}$/.test(s)) return new Date(parseInt(s, 10) * 1000).toISOString();
  if (/^\d{13}$/.test(s)) return new Date(parseInt(s, 10)).toISOString();

  const ymd = s.match(
    /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (ymd) {
    const y = parseInt(ymd[1], 10);
    const mo = parseInt(ymd[2], 10) - 1;
    const d = parseInt(ymd[3], 10);
    const h = parseInt(ymd[4] ?? "0", 10);
    const mi = parseInt(ymd[5] ?? "0", 10);
    const se = parseInt(ymd[6] ?? "0", 10);
    return new Date(Date.UTC(y, mo, d, h, mi, se)).toISOString();
  }

  const m = s.match(
    /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    const y = parseInt(m[3], 10);
    const h = parseInt(m[4] ?? "0", 10);
    const mi = parseInt(m[5] ?? "0", 10);
    const se = parseInt(m[6] ?? "0", 10);
    const isDmy = format === "dmy";
    const mo = (isDmy ? b : a) - 1;
    const d = isDmy ? a : b;
    if (mo < 0 || mo > 11 || d < 1 || d > 31) return "";
    return new Date(Date.UTC(y, mo, d, h, mi, se)).toISOString();
  }

  const iso = new Date(s);
  if (!Number.isNaN(iso.getTime())) return iso.toISOString();
  return "";
}

// ─── entry point ────────────────────────────────────────────────────────────

export function parseCsvAdaptive(
  input: ArrayBuffer | Buffer,
  opts?: ParseCsvAdaptiveOptions
): CsvAdaptiveResult {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const text = buf.toString("utf-8").replace(/^\ufeff/, "");
  const encoding = "utf-8";
  const rawLines = text.split(/\r?\n/);
  const warnings: string[] = [];

  // Aliases (static + DB-backed vocabulary injected by the caller).
  const aliasMap = buildNormalizedAliases(opts?.extraAliases);

  const nonEmptyLines = rawLines.filter((l) => l.trim());
  if (nonEmptyLines.length < 2) {
    throw new Error("CSV adaptativo: arquivo vazio ou com menos de 2 linhas.");
  }

  const delim = detectDelimiter(nonEmptyLines);
  const allRows = nonEmptyLines.map((l) => splitCsvLine(l, delim));

  // header row detection
  const headerIdx = detectHeaderRow(allRows, aliasMap);
  const headers = allRows[headerIdx] ?? [];
  if (headers.length < 3) {
    throw new Error(
      "CSV adaptativo: não foi possível identificar cabeçalho com ≥3 colunas."
    );
  }

  if (headerIdx > 0) {
    warnings.push(
      `Cabeçalho detectado na linha ${headerIdx + 1} (linhas anteriores tratadas como metadata).`
    );
  }

  let dataRows = allRows.slice(headerIdx + 1);

  // filter noise
  dataRows = dataRows.filter((r) => {
    const first = (r[0] ?? "").trim().toLowerCase();
    if (/^(total|subtotal|summary|sum|grand total|resumo)/.test(first))
      return false;
    const nonEmptyCount = r.filter((c) => c.trim()).length;
    if (nonEmptyCount < Math.max(1, Math.floor(headers.length * 0.5)))
      return false;
    return true;
  });

  // profiles (sample 20 rows)
  const sample = dataRows.slice(0, 20);
  const profiles: ColumnProfile[] = [];
  for (let c = 0; c < headers.length; c++) {
    profiles.push(profileColumn(sample.map((r) => r[c] ?? "")));
  }

  // resolve fields
  const mapping: Partial<Record<CanonicalField, MappingEntry>> = {};
  const used = new Set<number>();
  const order: CanonicalField[] = [
    "external_id",
    "symbol",
    "pnl_usd",
    "direction",
    "bought_ts",
    "sold_ts",
    "opened_at",
    "closed_at",
    "commission",
    "swap",
    "volume",
    "net_pos",
    "currency",
    "price_open",
    "price_close",
  ];
  for (const field of order) {
    const picked = resolveField(field, headers, profiles, used, aliasMap);
    if (!picked || picked.score < 2) continue;
    // Quando bought_ts + sold_ts ambos vieram por alias (ex: Tradovate futures),
    // opened_at/closed_at serão derivados — só aceitar se for ALIAS direto também
    // (evita fuzzy ambíguo tipo "Timestamp" ou "Trade Date" atropelar derivação).
    if (
      (field === "opened_at" || field === "closed_at") &&
      mapping.bought_ts?.confidence === "alias" &&
      mapping.sold_ts?.confidence === "alias" &&
      picked.confidence !== "alias"
    ) {
      continue;
    }
    mapping[field] = {
      header: picked.header,
      column: picked.column,
      confidence: picked.confidence,
    };
    used.add(picked.column);
  }

  // date-slot inference when opened/closed missing but two unused date-like columns exist.
  // Pular quando bought_ts + sold_ts ambos mapeados por alias — derivação usará esses.
  const haveDualBoughtSold =
    mapping.bought_ts?.confidence === "alias" && mapping.sold_ts?.confidence === "alias";
  if (!haveDualBoughtSold && (!mapping.opened_at || !mapping.closed_at)) {
    const dateCandidates: Array<{ col: number; meanEpoch: number }> = [];
    for (let c = 0; c < profiles.length; c++) {
      if (used.has(c)) continue;
      if (!profiles[c].dateLike) continue;
      const epochs: number[] = [];
      for (const r of sample) {
        const d = parseFlexDate(r[c] ?? "", profiles[c].dateFormat);
        if (d) epochs.push(new Date(d).getTime());
      }
      if (epochs.length >= 2) {
        dateCandidates.push({
          col: c,
          meanEpoch: epochs.reduce((a, b) => a + b, 0) / epochs.length,
        });
      }
    }
    dateCandidates.sort((a, b) => a.meanEpoch - b.meanEpoch);
    if (!mapping.opened_at && dateCandidates[0]) {
      mapping.opened_at = {
        header: headers[dateCandidates[0].col],
        column: dateCandidates[0].col,
        confidence: "sniff",
      };
      used.add(dateCandidates[0].col);
    }
    if (
      !mapping.closed_at &&
      dateCandidates.length >= 2
    ) {
      const last = dateCandidates[dateCandidates.length - 1];
      mapping.closed_at = {
        header: headers[last.col],
        column: last.col,
        confidence: "sniff",
      };
      used.add(last.col);
    }
  }

  // broker hint
  const normHeaders = headers.map((h) => normalizeHeader(h));
  const brokerHint: CsvAdaptiveResult["broker_hint"] =
    normHeaders.includes("position id") &&
    normHeaders.includes("bought timestamp") &&
    normHeaders.includes("sold timestamp") &&
    normHeaders.includes("contract")
      ? "tradovate"
      : "generic";

  // required fields check
  const missing: string[] = [];
  if (!mapping.pnl_usd) missing.push("pnl_usd");
  if (!mapping.symbol) missing.push("symbol");
  const hasCloseSlot =
    mapping.closed_at || (mapping.bought_ts && mapping.sold_ts);
  const hasOpenSlot =
    mapping.opened_at || (mapping.bought_ts && mapping.sold_ts);
  if (!hasCloseSlot) missing.push("closed_at");
  if (!hasOpenSlot) missing.push("opened_at");
  if (missing.length) {
    throw new Error(
      `CSV adaptativo: não foi possível resolver campo(s) obrigatório(s): ${missing.join(
        ", "
      )}. Colunas detectadas: ${headers.filter(Boolean).join(", ")}`
    );
  }

  // warnings
  for (const [field, entry] of Object.entries(mapping) as Array<
    [CanonicalField, MappingEntry]
  >) {
    if (entry.confidence !== "alias") {
      warnings.push(
        `Campo "${field}" resolvido por ${entry.confidence}: coluna "${entry.header}"`
      );
    }
  }
  if (!mapping.direction && mapping.bought_ts && mapping.sold_ts) {
    warnings.push(
      'Direção derivada de "Bought Timestamp" vs "Sold Timestamp" (mais cedo = entrada).'
    );
  }
  warnings.push(
    "Timestamps do CSV tratados como UTC. Ajuste timezone da conta se necessário."
  );

  const external_source = brokerHint === "tradovate" ? "csv_tradovate" : "csv_generic";

  const trades: CsvAdaptiveTrade[] = [];
  let skippedOpen = 0;
  let skippedInvalid = 0;

  const symbolCol = mapping.symbol!;
  const pnlCol = mapping.pnl_usd!;
  const dirCol = mapping.direction;
  const openAtCol = mapping.opened_at;
  const closeAtCol = mapping.closed_at;
  const boughtCol = mapping.bought_ts;
  const soldCol = mapping.sold_ts;
  const idCol = mapping.external_id;
  const volCol = mapping.volume;
  const commCol = mapping.commission;
  const swapCol = mapping.swap;
  const netPosCol = mapping.net_pos;

  for (const r of dataRows) {
    const symbol = (r[symbolCol.column] ?? "").trim();
    if (!symbol || /^(total|summary|resumo)$/i.test(symbol)) continue;

    // open-position filter
    if (netPosCol) {
      const np = parseNumber(r[netPosCol.column] ?? "0") ?? 0;
      if (np !== 0) {
        skippedOpen++;
        continue;
      }
    }

    const boughtRaw = boughtCol ? (r[boughtCol.column] ?? "").trim() : "";
    const soldRaw = soldCol ? (r[soldCol.column] ?? "").trim() : "";
    const boughtProfile = boughtCol ? profiles[boughtCol.column] : undefined;
    const soldProfile = soldCol ? profiles[soldCol.column] : undefined;

    let openedAt = openAtCol
      ? parseFlexDate(r[openAtCol.column] ?? "", profiles[openAtCol.column].dateFormat)
      : "";
    let closedAt = closeAtCol
      ? parseFlexDate(r[closeAtCol.column] ?? "", profiles[closeAtCol.column].dateFormat)
      : "";

    let bDate = "";
    let sDate = "";
    if (boughtRaw) bDate = parseFlexDate(boughtRaw, boughtProfile?.dateFormat);
    if (soldRaw) sDate = parseFlexDate(soldRaw, soldProfile?.dateFormat);

    if ((!openedAt || !closedAt) && bDate && sDate) {
      const bTs = new Date(bDate).getTime();
      const sTs = new Date(sDate).getTime();
      if (!openedAt) openedAt = bTs <= sTs ? bDate : sDate;
      if (!closedAt) closedAt = bTs <= sTs ? sDate : bDate;
    }

    if (!openedAt || !closedAt) {
      skippedInvalid++;
      continue;
    }

    const pnl = parseNumber(r[pnlCol.column] ?? "");
    if (pnl === null) {
      skippedInvalid++;
      continue;
    }

    let direction: "buy" | "sell" = "buy";
    if (dirCol) {
      const raw = (r[dirCol.column] ?? "").trim().toLowerCase();
      if (/^(sell|short|venda|s)$/.test(raw)) direction = "sell";
      else if (/^(buy|long|compra|b|l)$/.test(raw)) direction = "buy";
    } else if (bDate && sDate) {
      direction = new Date(bDate).getTime() <= new Date(sDate).getTime() ? "buy" : "sell";
    }

    const commission = commCol ? parseNumber(r[commCol.column] ?? "") ?? 0 : 0;
    const swap = swapCol ? parseNumber(r[swapCol.column] ?? "") ?? 0 : 0;
    const fees_usd = commission + swap;

    let external_id = idCol ? (r[idCol.column] ?? "").trim() : "";
    if (!external_id) {
      external_id =
        "hash-" +
        createHash("sha1")
          .update(`${symbol}|${direction}|${openedAt}|${closedAt}|${pnl}`)
          .digest("hex")
          .slice(0, 16);
    }

    const volumeRaw = volCol ? parseNumber(r[volCol.column] ?? "") ?? 0 : 0;

    trades.push({
      external_id,
      symbol,
      direction,
      opened_at: openedAt,
      closed_at: closedAt,
      pnl_usd: pnl,
      fees_usd,
      external_source,
      lots: volumeRaw || undefined,
    });
  }

  return {
    trades,
    balanceOps: [],
    mapping,
    warnings,
    broker_hint: brokerHint,
    external_source,
    rows_total: dataRows.length,
    rows_skipped_open_position: skippedOpen,
    rows_skipped_invalid: skippedInvalid,
    headers,
    separator: delim,
    encoding,
  };
}
