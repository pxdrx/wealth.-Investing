import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { getTradeHistory } from "@/lib/metaapi/client";
import { inferCategory } from "@/lib/trading/category";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EXTERNAL_SOURCE = "metaapi";
const INSERT_BATCH = 50;
const ID_CHECK_BATCH = 200;

/**
 * POST /api/metaapi/sync-trades
 * Fetches closed trade history from MetaAPI and inserts into journal_trades.
 * Uses the SAME schema as manual import (import-mt5) for full data parity.
 * Deduplication: 3-layer (cutoff date + bulk external_id check + DB constraint).
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createSupabaseClientForUser(token);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Token inválido" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const accountId = body.accountId as string | undefined;
  if (!accountId) {
    return NextResponse.json({ ok: false, error: "accountId obrigatório" }, { status: 400 });
  }

  // Validate connection exists and is connected
  const { data: conn } = await supabase
    .from("metaapi_connections")
    .select("id, metaapi_account_id, connection_status, last_trade_sync_at")
    .eq("account_id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!conn) {
    return NextResponse.json({ ok: false, error: "Conexão MetaAPI não encontrada" }, { status: 404 });
  }

  if (conn.connection_status !== "connected") {
    return NextResponse.json({ ok: false, error: "Conta não está conectada. Status: " + conn.connection_status }, { status: 400 });
  }

  try {
    // Determine time range: from last sync (or 90 days ago) to now
    const now = new Date();
    let startTime: string;

    if (conn.last_trade_sync_at) {
      // Start from last sync, minus 1 hour buffer for edge cases
      const lastSync = new Date(conn.last_trade_sync_at);
      lastSync.setHours(lastSync.getHours() - 1);
      startTime = lastSync.toISOString();
    } else {
      // First sync: fetch last 90 days
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      startTime = ninetyDaysAgo.toISOString();
    }

    const endTime = now.toISOString();

    // Fetch trade history from MetaAPI (timestamps already in UTC)
    const trades = await getTradeHistory(conn.metaapi_account_id, startTime, endTime);

    if (trades.length === 0) {
      // Update sync timestamp even with no trades
      await supabase
        .from("metaapi_connections")
        .update({ last_trade_sync_at: now.toISOString(), updated_at: now.toISOString() })
        .eq("id", conn.id);

      return NextResponse.json({
        ok: true,
        data: { imported: 0, duplicates: 0, failed: 0, total_found: 0 },
      });
    }

    // ── DEDUP LAYER 1: Cutoff date ──
    const { data: latestTrade } = await supabase
      .from("journal_trades")
      .select("closed_at")
      .eq("user_id", user.id)
      .eq("account_id", accountId)
      .eq("external_source", EXTERNAL_SOURCE)
      .order("closed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const cutoffDate = latestTrade?.closed_at ? new Date(latestTrade.closed_at) : null;
    const newTrades = cutoffDate
      ? trades.filter((t) => new Date(t.closedAt) >= cutoffDate)
      : trades;

    // ── DEDUP LAYER 2: Bulk external_id check ──
    const externalIds = newTrades.map((t) => t.positionId);
    const existingIdSet = new Set<string>();

    for (let i = 0; i < externalIds.length; i += ID_CHECK_BATCH) {
      const batch = externalIds.slice(i, i + ID_CHECK_BATCH);
      const { data: existingRows } = await supabase
        .from("journal_trades")
        .select("external_id")
        .eq("user_id", user.id)
        .eq("account_id", accountId)
        .eq("external_source", EXTERNAL_SOURCE)
        .in("external_id", batch);
      if (existingRows) {
        for (const row of existingRows) {
          existingIdSet.add((row as { external_id: string }).external_id);
        }
      }
    }

    // Build insert array — SAME schema as import-mt5
    const toInsert: Array<{
      user_id: string;
      account_id: string;
      symbol: string;
      category: string;
      direction: string;
      opened_at: string;
      closed_at: string;
      pnl_usd: number;
      fees_usd: number;
      external_source: string;
      external_id: string;
    }> = [];

    let duplicates = 0;

    for (const trade of newTrades) {
      if (existingIdSet.has(trade.positionId)) {
        duplicates++;
        continue;
      }

      // Strip MT5 suffixes from symbol (same as manual import uses inferCategory)
      const symbol = trade.symbol;
      const category = inferCategory(symbol);

      toInsert.push({
        user_id: user.id,
        account_id: accountId,
        symbol,
        category,
        direction: trade.direction,
        opened_at: trade.openedAt,   // Already UTC from MetaAPI
        closed_at: trade.closedAt,   // Already UTC from MetaAPI
        pnl_usd: trade.pnlUsd,
        fees_usd: trade.feesUsd,
        // net_pnl_usd is a GENERATED column (pnl_usd - fees_usd) — do NOT send
        external_source: EXTERNAL_SOURCE,
        external_id: trade.positionId,
      });
    }

    // ── DEDUP LAYER 3: Batch insert with constraint fallback ──
    let imported = 0;
    let failed = 0;

    for (let i = 0; i < toInsert.length; i += INSERT_BATCH) {
      const batch = toInsert.slice(i, i + INSERT_BATCH);
      const { error, data: insertedRows } = await supabase
        .from("journal_trades")
        .insert(batch)
        .select("id");

      if (error) {
        if (error.code === "23505") {
          // Duplicate constraint — fallback to one-by-one
          for (const row of batch) {
            const { error: singleErr } = await supabase
              .from("journal_trades")
              .insert(row);
            if (singleErr) {
              if (singleErr.code === "23505") {
                duplicates++;
              } else {
                failed++;
                console.warn("[sync-trades] insert error:", singleErr.message);
              }
            } else {
              imported++;
            }
          }
        } else {
          failed += batch.length;
          console.warn("[sync-trades] batch error:", error.message);
        }
      } else {
        imported += insertedRows?.length ?? batch.length;
      }
    }

    // Update last sync timestamp
    await supabase
      .from("metaapi_connections")
      .update({ last_trade_sync_at: now.toISOString(), updated_at: now.toISOString() })
      .eq("id", conn.id);

    // Log ingestion
    await supabase.from("ingestion_logs").insert({
      user_id: user.id,
      status: "ok",
      source: "metaapi_sync",
      items_count: imported + duplicates + failed,
      duration_ms: Date.now() - now.getTime() + (now.getTime() - now.getTime()),
      message: `Live sync: ${imported} imported, ${duplicates} duplicates, ${failed} failed`,
      meta: { account_id: accountId, imported, duplicates, failed, total_found: trades.length },
    });

    return NextResponse.json({
      ok: true,
      data: {
        imported,
        duplicates,
        failed,
        total_found: trades.length,
      },
    });
  } catch (err) {
    const msg = (err as Error).message || String(err);
    console.error("[sync-trades] error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
