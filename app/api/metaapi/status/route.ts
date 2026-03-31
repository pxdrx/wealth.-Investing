import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { getAccountInfo, getOpenPositions, getAccountStatus } from "@/lib/metaapi/client";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(req: NextRequest) {
  // 1. Auth
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

  // 2. Get accountId from query
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json({ ok: false, error: "accountId obrigatório" }, { status: 400 });
  }

  // 3. Get connection
  const { data: conn } = await supabase
    .from("metaapi_connections")
    .select("id, metaapi_account_id, connection_status, last_sync_at, last_error, broker_login, broker_server, created_at")
    .eq("account_id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!conn) {
    return NextResponse.json({
      ok: true,
      data: { connected: false },
    });
  }

  // Auto-cleanup: if stuck in "connecting" for > 3 minutes, reset to allow retry
  if (conn.connection_status === "connecting") {
    const createdAt = new Date(conn.created_at).getTime();
    const stuckMinutes = (Date.now() - createdAt) / 60_000;
    if (stuckMinutes > 3) {
      await supabase.from("metaapi_connections").delete().eq("id", conn.id);
      await supabase.from("live_alert_configs").delete().eq("account_id", accountId).eq("user_id", user.id);
      return NextResponse.json({ ok: true, data: { connected: false } });
    }
  }

  // 4. Fetch LIVE data from MetaAPI and write snapshot (if connected)
  let snapshot: {
    equity: number;
    balance: number;
    margin: number;
    free_margin: number;
    open_positions_count: number;
    unrealized_pnl: number;
    daily_pnl: number;
    daily_dd_pct: number;
    overall_dd_pct: number;
    recorded_at: string;
  } | null = null;

  if (conn.connection_status === "connected" && process.env.METAAPI_TOKEN) {
    try {
      // Get region from account status
      const accountStatus = await getAccountStatus(conn.metaapi_account_id);
      const region = accountStatus.region || "vint-hill";

      // Fetch live account info + positions in parallel
      const [accountInfo, positions] = await Promise.all([
        getAccountInfo(conn.metaapi_account_id, region),
        getOpenPositions(conn.metaapi_account_id, region).catch(() => []),
      ]);

      // Use MetaAPI's REAL values directly — no manual calculations
      const equity = accountInfo.equity ?? 0;
      const balance = accountInfo.balance ?? 0;
      const margin = accountInfo.margin ?? 0;
      const freeMargin = accountInfo.freeMargin ?? 0;
      const unrealizedPnl = equity - balance;
      const openCount = Array.isArray(positions) ? positions.length : 0;

      // Get prop account starting balance for DD %
      const { data: propAccount } = await supabase
        .from("prop_accounts")
        .select("starting_balance_usd")
        .eq("account_id", accountId)
        .maybeSingle();

      const startingBalance = propAccount?.starting_balance_usd || 0;

      // Daily P&L: difference between current equity and start-of-day balance
      // Use the first snapshot of today as reference, or balance if no snapshot
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: todayFirstSnapshot } = await supabase
        .from("live_equity_snapshots")
        .select("balance")
        .eq("connection_id", conn.id)
        .gte("recorded_at", todayStart.toISOString())
        .order("recorded_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const startOfDayBalance = todayFirstSnapshot?.balance ?? balance;
      const dailyPnl = equity - Number(startOfDayBalance);

      // DD calculations based on starting balance (prop firm rules)
      // Daily DD = how much equity dropped today from start-of-day
      const dailyDdPct = startingBalance > 0 && dailyPnl < 0
        ? Math.round(Math.abs(dailyPnl) / startingBalance * 10000) / 100
        : 0;

      // Overall DD = how much equity is below starting balance
      const overallDdPct = startingBalance > 0 && equity < startingBalance
        ? Math.round((startingBalance - equity) / startingBalance * 10000) / 100
        : 0;

      const now = new Date().toISOString();

      snapshot = {
        equity,
        balance,
        margin,
        free_margin: freeMargin,
        open_positions_count: openCount,
        unrealized_pnl: unrealizedPnl,
        daily_pnl: dailyPnl,
        daily_dd_pct: Math.round(dailyDdPct * 100) / 100,
        overall_dd_pct: Math.round(overallDdPct * 100) / 100,
        recorded_at: now,
      };

      // Write snapshot to DB (non-blocking, don't fail on write error)
      supabase.from("live_equity_snapshots").insert({
        connection_id: conn.id,
        user_id: user.id,
        account_id: accountId,
        equity,
        balance,
        margin,
        free_margin: freeMargin,
        open_positions_count: openCount,
        unrealized_pnl: unrealizedPnl,
        daily_pnl: dailyPnl,
        daily_dd_pct: Math.round(dailyDdPct * 100) / 100,
        overall_dd_pct: Math.round(overallDdPct * 100) / 100,
      }).then(({ error: snapErr }) => {
        if (snapErr) console.warn("[status] snapshot write error:", snapErr.message);
      });
    } catch (err) {
      console.warn("[status] MetaAPI fetch error:", (err as Error).message);
      // Fall back to last saved snapshot
      const { data: lastSnapshot } = await supabase
        .from("live_equity_snapshots")
        .select("equity, balance, margin, free_margin, open_positions_count, unrealized_pnl, daily_pnl, daily_dd_pct, overall_dd_pct, recorded_at")
        .eq("connection_id", conn.id)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      snapshot = lastSnapshot ?? null;
    }
  } else {
    // Not connected or no token — read last saved snapshot
    const { data: lastSnapshot } = await supabase
      .from("live_equity_snapshots")
      .select("equity, balance, margin, free_margin, open_positions_count, unrealized_pnl, daily_pnl, daily_dd_pct, overall_dd_pct, recorded_at")
      .eq("connection_id", conn.id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    snapshot = lastSnapshot ?? null;
  }

  // 5. Get alert configs
  const { data: alertConfigs } = await supabase
    .from("live_alert_configs")
    .select("id, alert_type, warning_threshold_pct, critical_threshold_pct, is_active")
    .eq("account_id", accountId)
    .eq("user_id", user.id);

  // 6. Get undismissed alerts
  const { data: activeAlerts } = await supabase
    .from("live_alerts_log")
    .select("id, alert_type, severity, actual_pct, message, created_at")
    .eq("account_id", accountId)
    .eq("user_id", user.id)
    .eq("dismissed", false)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    ok: true,
    data: {
      connected: true,
      connectionStatus: conn.connection_status,
      lastSync: conn.last_sync_at,
      lastError: conn.last_error,
      brokerLogin: conn.broker_login,
      brokerServer: conn.broker_server,
      connectedSince: conn.created_at,
      metaApiAccountId: conn.metaapi_account_id,
      snapshot: snapshot ?? null,
      alertConfigs: alertConfigs ?? [],
      activeAlerts: activeAlerts ?? [],
    },
  });
}
