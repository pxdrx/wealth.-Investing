import { createServiceRoleClient } from "@/lib/supabase/service";

export interface CommunitySymbolSentiment {
  symbol: string;
  longPct: number;
  shortPct: number;
  traderCount: number;
}

// In-memory cache: refreshed every hour
let cachedSentiment: CommunitySymbolSentiment[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getCommunityIntelligence(): Promise<CommunitySymbolSentiment[]> {
  const now = Date.now();
  if (cachedSentiment && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSentiment;
  }

  const serviceClient = createServiceRoleClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Step 1: Find profitable traders (positive net P&L in last 30 days)
  const { data: profitableRows, error: profErr } = await serviceClient
    .from("journal_trades")
    .select("user_id, net_pnl_usd")
    .gte("closed_at", thirtyDaysAgo.toISOString());

  if (profErr || !profitableRows) {
    console.warn("[community-stats] error fetching trades:", profErr?.message);
    return cachedSentiment ?? [];
  }

  // Aggregate P&L per user
  const userPnl = new Map<string, number>();
  for (const row of profitableRows as { user_id: string; net_pnl_usd: number }[]) {
    userPnl.set(row.user_id, (userPnl.get(row.user_id) || 0) + row.net_pnl_usd);
  }
  const profitableUserIds = new Set(
    Array.from(userPnl.entries())
      .filter(([, pnl]) => pnl > 0)
      .map(([uid]) => uid)
  );

  if (profitableUserIds.size < 5) {
    cachedSentiment = [];
    cacheTimestamp = now;
    return [];
  }

  // Step 2: Get last 7 days trades from profitable traders
  const { data: recentTrades, error: recErr } = await serviceClient
    .from("journal_trades")
    .select("user_id, symbol, direction")
    .gte("closed_at", sevenDaysAgo.toISOString());

  if (recErr || !recentTrades) {
    console.warn("[community-stats] error fetching recent trades:", recErr?.message);
    return cachedSentiment ?? [];
  }

  // Step 3: Aggregate sentiment per symbol (only profitable traders)
  const symbolSentiment = new Map<string, { longs: Set<string>; shorts: Set<string> }>();
  (recentTrades as { user_id: string; symbol: string; direction: string }[]).forEach((t) => {
    if (!profitableUserIds.has(t.user_id)) return;

    if (!symbolSentiment.has(t.symbol)) {
      symbolSentiment.set(t.symbol, { longs: new Set(), shorts: new Set() });
    }
    const entry = symbolSentiment.get(t.symbol)!;
    if (t.direction === "BUY") {
      entry.longs.add(t.user_id);
    } else {
      entry.shorts.add(t.user_id);
    }
  });

  // Step 4: Build output, filter min 5 traders, sort by trader count
  const result: CommunitySymbolSentiment[] = Array.from(symbolSentiment.entries())
    .reduce<CommunitySymbolSentiment[]>((acc, [symbol, { longs, shorts }]) => {
      const allTraders = new Set([...Array.from(longs), ...Array.from(shorts)]);
      if (allTraders.size < 5) return acc;
      const total = allTraders.size;
      acc.push({
        symbol,
        longPct: Math.round((longs.size / total) * 100),
        shortPct: Math.round((shorts.size / total) * 100),
        traderCount: total,
      });
      return acc;
    }, []);
  result.sort((a, b) => b.traderCount - a.traderCount);

  cachedSentiment = result.slice(0, 10);
  cacheTimestamp = now;
  return cachedSentiment;
}
