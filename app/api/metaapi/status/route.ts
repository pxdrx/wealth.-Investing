import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

  // 4. Get latest snapshot
  const { data: snapshot } = await supabase
    .from("live_equity_snapshots")
    .select("equity, balance, margin, free_margin, open_positions_count, unrealized_pnl, daily_pnl, daily_dd_pct, overall_dd_pct, recorded_at")
    .eq("connection_id", conn.id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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
