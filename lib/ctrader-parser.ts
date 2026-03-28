// lib/ctrader-parser.ts
// Parses cTrader CSV export into standardized trade format

interface ParsedTrade {
  symbol: string;
  direction: "buy" | "sell";
  lots: number;
  pnl_usd: number;
  net_pnl_usd: number;
  opened_at: string;
  closed_at: string;
  external_id: string;
  external_source: "ctrader";
  commission?: number;
  swap?: number;
}

interface ParsedTrades {
  trades: ParsedTrade[];
  payouts: Array<{ amount_usd: number; paid_at: string }>;
}

export function parseCtraderCsv(buffer: Buffer): ParsedTrades {
  const text = buffer.toString("utf-8");

  // Detect delimiter: check if first data line has more semicolons than commas
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { trades: [], payouts: [] };

  const firstDataLine = lines[1] || "";
  const delimiter =
    firstDataLine.split(";").length > firstDataLine.split(",").length ? ";" : ",";

  // Find header row — look for "Position" or "Symbol" column
  let headerIdx = -1;
  let headers: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim().toLowerCase());
    if (cols.some(c => c.includes("position") || c === "symbol")) {
      headerIdx = i;
      headers = cols;
      break;
    }
  }

  if (headerIdx === -1) {
    throw new Error(
      "Cabeçalho cTrader não encontrado. Verifique se o arquivo é um export válido do cTrader."
    );
  }

  // Map column indices
  const colMap = {
    positionId: headers.findIndex(
      h => h.includes("position") && h.includes("id")
    ),
    symbol: headers.findIndex(h => h === "symbol"),
    direction: headers.findIndex(
      h => h === "type" || h === "direction" || h === "side"
    ),
    volume: headers.findIndex(h => h === "volume" || h === "quantity"),
    profit: headers.findIndex(
      h => h === "profit" || h === "p/l" || h === "pnl"
    ),
    commission: headers.findIndex(h => h === "commission" || h === "comm"),
    swap: headers.findIndex(h => h === "swap"),
    openTime: headers.findIndex(h => h.includes("open") && h.includes("time")),
    closeTime: headers.findIndex(
      h => h.includes("close") && h.includes("time")
    ),
  };

  // Fallbacks for position ID
  if (colMap.positionId === -1) {
    colMap.positionId = headers.findIndex(
      h => h === "position" || h === "id" || h === "deal"
    );
  }

  if (colMap.symbol === -1) {
    throw new Error("Coluna 'Symbol' não encontrada no CSV.");
  }

  const trades: ParsedTrade[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim());
    if (cols.length < 3) continue; // skip empty/summary rows

    const symbol = cols[colMap.symbol] || "";
    if (
      !symbol ||
      symbol.toLowerCase() === "total" ||
      symbol.toLowerCase() === "summary"
    )
      continue;

    const dirRaw = (cols[colMap.direction] || "").toLowerCase();
    const direction: "buy" | "sell" =
      dirRaw.includes("sell") || dirRaw.includes("short") ? "sell" : "buy";

    // FIX TECH-006: Guard all parseFloat calls against NaN
    const volumeRaw = parseFloat(cols[colMap.volume] || "0") || 0;
    const lots =
      volumeRaw >= 100 ? volumeRaw / 100000 : volumeRaw; // cTrader uses units, convert to lots

    const profit = parseFloat(cols[colMap.profit] || "0") || 0;
    const commission =
      colMap.commission >= 0
        ? parseFloat(cols[colMap.commission] || "0") || 0
        : 0;
    const swap =
      colMap.swap >= 0 ? parseFloat(cols[colMap.swap] || "0") || 0 : 0;
    const netPnl = profit + commission + swap;

    const openedAt = cols[colMap.openTime] || "";
    const closedAt = cols[colMap.closeTime] || "";
    const externalId = cols[colMap.positionId] || `ctrader-${i}`;

    trades.push({
      symbol,
      direction,
      lots: Math.round(lots * 100) / 100,
      pnl_usd: profit,
      net_pnl_usd: netPnl,
      opened_at: openedAt,
      closed_at: closedAt,
      external_id: externalId,
      external_source: "ctrader",
      commission: commission || undefined,
      swap: swap || undefined,
    });
  }

  return { trades, payouts: [] };
}
